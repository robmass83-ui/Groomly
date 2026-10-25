import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore, type DocumentData, type DocumentReference, type QueryDocumentSnapshot } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import * as logger from 'firebase-functions/logger'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { defineSecret } from 'firebase-functions/params'
import {
  acceptInviteDecision,
  changeRoleDecision,
  createInviteDecision,
  inviteExpiresAt,
  limitePosti,
  revokeDecision,
  type StaffRole,
} from '../../src/lib/salonAccess'
import { normalizeEmail, salonCollection, type AccountRole } from '../../src/lib/salonPath'
import { avviaProvaPer } from './piano/avviaProva'
import { chiudiProveScadute } from './piano/chiudiProve'
import { impostaPianoManualePer } from './piano/impostaPianoManuale'
import { deliveryId } from '../../src/lib/pushDue'
import {
  appendOpenInviteExpiry,
  deliverInvite,
  inviteMail,
  removeOneOpenInviteExpiry,
  shouldRestoreAccount,
  tokenBytes,
} from './salonInvite'
import { buildActionLink } from './actionLink'
import { BrevoRequestError, postBrevoTemplate, type BrevoParams } from './brevoMail'
import { rateDecision } from './rateLimit'
import {
  appointmentFromDoc,
  appointmentsForPush,
  collectSends,
  deliveryCandidateIds,
  deliverySlot,
  versionFromGithub,
  type PushLoad,
} from './sendPush'

const brevoApiKey = defineSecret('BREVO_API_KEY')

initializeApp()

const callable = {
  region: 'europe-west1' as const,
  secrets: [brevoApiKey],
  invoker: 'public' as const,
}

const pianoCall = {
  region: 'europe-west1' as const,
  invoker: 'public' as const,
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function authCode(error: unknown): string {
  if (!error || typeof error !== 'object' || !('code' in error)) return ''
  return String((error as { code: unknown }).code)
}

function requireEmail(value: unknown): string {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!EMAIL.test(email) || email.length > 320) {
    throw new HttpsError('invalid-argument', 'Inserisci un’email valida')
  }
  return email
}

async function reserveEmailSlot(email: string): Promise<void> {
  const db = getFirestore()
  const ref = db.collection('emailRateLimits').doc(email)
  const now = Date.now()
  let limited = false
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      const decision = rateDecision(snap.get('hits'), now)
      if (!decision.ok) {
        limited = true
        return
      }
      tx.set(ref, { hits: decision.next })
    })
  } catch (error) {
    logger.error('Limite email non disponibile', { code: authCode(error) })
    throw new HttpsError('internal', 'Invio non riuscito')
  }
  if (limited) throw new HttpsError('resource-exhausted', 'Aspetta un momento e riprova')
}

async function sendBrevo(templateId: number, toEmail: string, params: BrevoParams): Promise<void> {
  try {
    await postBrevoTemplate(brevoApiKey.value(), templateId, toEmail, params)
  } catch (error) {
    const status = error instanceof BrevoRequestError ? error.status : 0
    const detail = error instanceof BrevoRequestError ? error.detail : ''
    logger.error('Brevo ha rifiutato l’invio', { status, detail })
    throw new HttpsError('internal', 'Invio non riuscito')
  }
}

function actionLink(firebaseLink: string): string {
  try {
    return buildActionLink(firebaseLink)
  } catch {
    logger.error('Link azione non valido')
    throw new HttpsError('internal', 'Invio non riuscito')
  }
}

async function firebaseLink(create: () => Promise<string>): Promise<string> {
  try {
    return actionLink(await create())
  } catch (error) {
    if (error instanceof HttpsError) throw error
    logger.error('Generazione link non riuscita', { code: authCode(error) })
    throw new HttpsError('internal', 'Invio non riuscito')
  }
}

export const sendVerificationEmail = onCall(callable, async (request) => {
  const email = request.auth?.token.email?.trim().toLowerCase()
  if (!request.auth || !email) throw new HttpsError('unauthenticated', 'Accesso richiesto')
  let verified = false
  try {
    verified = (await getAuth().getUser(request.auth.uid)).emailVerified === true
  } catch (error) {
    logger.error('Lettura account non riuscita', { code: authCode(error) })
    throw new HttpsError('internal', 'Invio non riuscito')
  }
  if (verified) return { ok: true, alreadyVerified: true }
  await reserveEmailSlot(email)
  const link = await firebaseLink(() => getAuth().generateEmailVerificationLink(email))
  await sendBrevo(3, email, { link })
  return { ok: true }
})

export const sendPasswordResetEmail = onCall(callable, async (request) => {
  const email = requireEmail(request.data?.email)
  await reserveEmailSlot(email)
  try {
    await getAuth().getUserByEmail(email)
  } catch (error) {
    if (authCode(error) === 'auth/user-not-found') return { ok: true }
    logger.error('Lettura account non riuscita', { code: authCode(error) })
    throw new HttpsError('internal', 'Invio non riuscito')
  }
  const link = await firebaseLink(() => getAuth().generatePasswordResetLink(email))
  await sendBrevo(4, email, { link, email })
  return { ok: true }
})

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

async function githubVersion(): Promise<string | null> {
  try {
    const response = await fetch('https://api.github.com/repos/robmass83-ui/Groomly/releases/latest', {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'groomly',
      },
    })
    if (!response.ok) return null
    return versionFromGithub(await response.json())
  } catch {
    return null
  }
}

export const sendPush = onSchedule({
  schedule: 'every 5 minutes',
  region: 'europe-west1',
}, async () => {
  const db = getFirestore()
  const now = Date.now()
  const latestVersion = await githubVersion()
  const deviceRefs = new Map<string, DocumentReference[]>()

  const load: PushLoad = {
    accountIds: async () => (await db.collection('accounts').get()).docs.map((doc) => doc.id),
    account: async (uid) => {
      const data = (await db.doc(`accounts/${uid}`).get()).data()
      if (!data) return null
      return { salonId: text(data.salonId) }
    },
    prefs: async (uid) => (await db.doc(`accounts/${uid}/push/prefs`).get()).data(),
    devices: async (uid) => {
      const snap = await db.collection(`accounts/${uid}/devices`).get()
      return snap.docs.map((doc) => {
        const data = doc.data()
        const token = text(data.token)
        const key = `${doc.id}\n${token}`
        deviceRefs.set(key, [...(deviceRefs.get(key) ?? []), doc.ref])
        return {
          id: doc.id,
          token,
          appVersion: text(data.appVersion),
        }
      })
    },
    appointments: async (salonId) => {
      const [due, upcoming] = await Promise.all([
        db.collection(`salons/${salonId}/appointments`)
          .where('status', '==', 'programmato')
          .where('start', '<=', now)
          .get(),
        db.collection(`salons/${salonId}/appointments`)
          .where('kind', '==', 'personale')
          .where('start', '>=', now)
          .where('start', '<=', now + 30 * 60 * 1000)
          .get(),
      ])
      const byId = new Map<string, Record<string, unknown>>()
      for (const doc of [...due.docs, ...upcoming.docs]) byId.set(doc.id, doc.data())
      const mapped = [...byId.entries()].map(([id, data]) => appointmentFromDoc(id, data))
      let deletedIds: string[] | null
      try {
        const tombstone = await db.doc(`salons/${salonId}/meta/deleted-dogs`).get()
        const raw = tombstone.data()?.appointmentIds
        deletedIds = Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string' && id.length > 0) : []
      } catch {
        deletedIds = null
      }
      return appointmentsForPush(mapped, deletedIds)
    },
    dogName: async (salonId, dogId) => text((await db.doc(`salons/${salonId}/dogs/${dogId}`).get()).data()?.name),
    delivered: async (deviceId, appointments, nowMs, version) => {
      const ids = deliveryCandidateIds(deviceId, appointments, nowMs, version)
      const deliveredIds: string[] = []
      for (let offset = 0; offset < ids.length; offset += 100) {
        const snapshots = await db.getAll(
          ...ids.slice(offset, offset + 100)
            .map((id) => db.doc(`pushDeliveries/${id}`)),
        )
        deliveredIds.push(...snapshots
          .filter((doc) => typeof doc.data()?.at === 'number')
          .map((doc) => doc.id))
      }
      return deliveredIds
    },
    latestVersion: async () => latestVersion,
  }

  const sends = await collectSends(load, now)
  for (const send of sends) {
    const deliveryRef = db.doc(`pushDeliveries/${deliveryId(send.deviceId, send.kind, send.subject)}`)
    const claimed = await db.runTransaction(async (tx) => {
      const slot = deliverySlot((await tx.get(deliveryRef)).data(), now)
      if (slot === 'done' || slot === 'busy') return false
      tx.set(deliveryRef, { claim: now })
      return true
    })
    if (!claimed) continue
    try {
      await getMessaging().send({
        token: send.token,
        notification: {
          title: send.title,
          body: send.body,
        },
        data: send.data,
        android: {
          priority: 'high',
          notification: {
            channelId: send.kind === 'complete' ? 'da-completare' : send.kind === 'reminder' ? 'promemoria' : 'aggiornamenti',
          },
        },
      })
    } catch (error) {
      if (authCode(error).endsWith('registration-token-not-registered')) {
        const refs = deviceRefs.get(`${send.deviceId}\n${send.token}`) ?? []
        await Promise.all([
          ...refs.map((ref) => db.runTransaction(async (tx) => {
            const device = await tx.get(ref)
            if (device.data()?.token === send.token) {
              tx.update(ref, { token: FieldValue.delete() })
            }
          }).catch((cleanupError: unknown) => {
            logger.error('Token push non rimosso', {
              deviceId: send.deviceId,
              code: authCode(cleanupError),
            })
          })),
          deliveryRef.delete().catch(() => {}),
        ])
        continue
      }
      logger.error('Invio push non riuscito', {
        deviceId: send.deviceId,
        kind: send.kind,
        code: authCode(error),
      })
      await deliveryRef.delete().catch(() => {})
      continue
    }
    try {
      await deliveryRef.set({ at: now })
    } catch (error) {
      logger.error('Consegna push non registrata', {
        deviceId: send.deviceId,
        kind: send.kind,
        code: authCode(error),
      })
    }
  }
})

function deny(message: string): never {
  throw new HttpsError('failed-precondition', message)
}

function requireUid(auth: { uid: string } | undefined): string {
  if (!auth?.uid) throw new HttpsError('unauthenticated', 'Accesso richiesto')
  return auth.uid
}

function loginEmail(auth: { token?: { email?: string } } | undefined): string {
  const email = auth?.token?.email
  return typeof email === 'string' ? email : ''
}

function field(data: unknown, key: string): unknown {
  if (!data || typeof data !== 'object') return undefined
  return (data as Record<string, unknown>)[key]
}

function accountRole(value: unknown): AccountRole | null {
  if (value === 'titolare' || value === 'socio' || value === 'collaboratore') return value
  if (value === undefined || value === null || value === '') return 'titolare'
  return null
}

function accountOf(data: DocumentData | undefined): {
  firstName: string
  lastName: string
  email: string
  salonId: string
  role: AccountRole
} | null {
  if (!data) return null
  const role = accountRole(data.role)
  const salonId = text(data.salonId)
  if (!role || salonId.includes('/')) return null
  return {
    firstName: text(data.firstName),
    lastName: text(data.lastName),
    email: text(data.email),
    salonId,
    role,
  }
}

function salonDocPath(salonId: string, ...parts: string[]): string {
  return [...salonCollection(salonId), ...parts].join('/')
}

function seatMembers(docs: QueryDocumentSnapshot[]): { role: AccountRole; status: string; email: string }[] {
  return docs.map((doc) => ({
    role: accountRole(doc.get('role')) ?? 'titolare',
    status: text(doc.get('status')),
    email: text(doc.get('email')),
  }))
}

function seatInvites(docs: QueryDocumentSnapshot[]): { status: string; expiresAt: string }[] {
  return docs.map((doc) => ({
    status: text(doc.get('status')),
    expiresAt: text(doc.get('expiresAt')),
  }))
}

function activeStaffCount(docs: QueryDocumentSnapshot[]): number {
  return docs.filter((doc) => {
    const role = doc.get('role')
    return doc.get('status') === 'attivo' && (role === 'socio' || role === 'collaboratore')
  }).length
}

function salonNameOf(data: DocumentData | undefined): string {
  const business = data?.business
  if (!business || typeof business !== 'object') return ''
  return text((business as { salonName?: unknown }).salonName).trim()
}

function inviteFields(data: DocumentData | undefined): {
  status: string
  expiresAt: string
  email: string
  salonId: string
  role: string
} | null {
  if (!data) return null
  const salonId = text(data.salonId)
  if (salonId === '' || salonId.includes('/')) return null
  return {
    status: text(data.status),
    expiresAt: text(data.expiresAt),
    email: text(data.email),
    salonId,
    role: text(data.role),
  }
}

export const setSalonPro = onCall(pianoCall, async (request) => {
  requireUid(request.auth)
  const salonId = text(field(request.data, 'salonId'))
  const enabled = field(request.data, 'enabled')
  if (typeof enabled !== 'boolean') deny('Accesso negato')
  await impostaPianoManualePer({
    operatorEmail: loginEmail(request.auth),
    salonId,
    azione: enabled ? 'salone' : 'base',
  })
  return { ok: true }
})

export const avviaProva = onCall(pianoCall, async (request) => {
  const uid = requireUid(request.auth)
  const db = getFirestore()
  const account = accountOf((await db.doc(`accounts/${uid}`).get()).data())
  return avviaProvaPer(uid, account)
})

export const impostaPianoManuale = onCall(pianoCall, async (request) => {
  requireUid(request.auth)
  const salonId = text(field(request.data, 'salonId'))
  const azione = text(field(request.data, 'azione'))
  return impostaPianoManualePer({
    operatorEmail: loginEmail(request.auth),
    salonId,
    azione,
  })
})

export const chiudiProve = onSchedule({
  schedule: 'every 60 minutes',
  region: 'europe-west1',
}, async () => {
  const chiusi = await chiudiProveScadute()
  logger.info('Prove chiuse', { chiusi })
})

export const createInvite = onCall(callable, async (request) => {
  const uid = requireUid(request.auth)
  const db = getFirestore()
  const account = accountOf((await db.doc(`accounts/${uid}`).get()).data())
  if (!account) deny('Accesso negato')
  const salonId = account.salonId
  const email = text(field(request.data, 'email'))
  const role = text(field(request.data, 'role'))
  const readable = salonId !== '' && !salonId.includes('/')
  const proRef = readable ? db.doc(salonDocPath(salonId, 'pro', 'main')) : null
  const membersQuery = readable ? db.collection(salonDocPath(salonId, 'members')) : null
  const invitesQuery = readable ? db.collection('invites').where('salonId', '==', salonId) : null
  const settingsRef = readable ? db.doc(salonDocPath(salonId, 'settings', 'main')) : null
  const proSnap = proRef ? await proRef.get() : null
  const membersSnap = membersQuery ? await membersQuery.get() : null
  const invitesSnap = invitesQuery ? await invitesQuery.get() : null
  const settingsSnap = settingsRef ? await settingsRef.get() : null
  const decision = createInviteDecision({
    caller: { salonId, role: account.role },
    proEnabled: proSnap?.get('enabled') === true,
    email,
    role,
    members: membersSnap ? seatMembers(membersSnap.docs) : [],
    invites: invitesSnap ? seatInvites(invitesSnap.docs) : [],
    now: new Date(),
    seatLimit: limitePosti(proSnap?.data()),
  })
  if (!decision.ok) deny(decision.message)
  if (!proRef || !membersQuery || !invitesQuery) deny('Accesso negato')

  const token = tokenBytes()
  const inviteRef = db.doc(`invites/${token}`)
  const salonName = salonNameOf(settingsSnap?.data())
  let written: { email: string; role: StaffRole; expiresAt: string } | undefined
  await db.runTransaction(async (tx) => {
    const pro = await tx.get(proRef)
    const members = await tx.get(membersQuery)
    const invites = await tx.get(invitesQuery)
    const current = await tx.get(inviteRef)
    const again = createInviteDecision({
      caller: { salonId, role: account.role },
      proEnabled: pro.get('enabled') === true,
      email,
      role,
      members: seatMembers(members.docs),
      invites: seatInvites(invites.docs),
      now: new Date(),
      seatLimit: limitePosti(pro.data()),
    })
    if (!again.ok) deny(again.message)
    if (current.exists) throw new HttpsError('internal', 'Invio non riuscito')
    const created = new Date()
    const expiresAt = inviteExpiresAt(created).toISOString()
    written = { email: again.email, role: again.role, expiresAt }
    tx.set(inviteRef, {
      salonId,
      email: again.email,
      role: again.role,
      createdAt: created.toISOString(),
      expiresAt,
      status: 'aperto',
    })
    tx.set(proRef, {
      openInviteExpiries: appendOpenInviteExpiry(pro.get('openInviteExpiries'), expiresAt),
    }, { merge: true })
  })
  if (!written) throw new HttpsError('internal', 'Invio non riuscito')
  const sent = written
  const mail = inviteMail(token, salonName, sent.role)
  try {
    await deliverInvite(
      () => sendBrevo(mail.templateId, sent.email, mail.params),
      async () => {
        let cleanup: unknown
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            await db.runTransaction(async (tx) => {
              const pro = await tx.get(proRef)
              const invite = await tx.get(inviteRef)
              if (!invite.exists) return
              tx.delete(inviteRef)
              const openInviteExpiries = removeOneOpenInviteExpiry(pro.get('openInviteExpiries'), sent.expiresAt)
              if (openInviteExpiries !== null) tx.set(proRef, { openInviteExpiries }, { merge: true })
            })
            return
          } catch (error) {
            cleanup = error
          }
        }
        logger.error('Invito non cancellato dopo il rifiuto di Brevo', { code: authCode(cleanup) })
        throw cleanup
      },
    )
  } catch (error) {
    if (error instanceof HttpsError) throw error
    throw new HttpsError('internal', 'Invio non riuscito')
  }
  return { ok: true }
})

export const acceptInvite = onCall(callable, async (request) => {
  const uid = requireUid(request.auth)
  if (uid.includes('/')) deny('Accesso negato')
  const rawToken = text(field(request.data, 'token'))
  const token = /^[0-9a-f]{64}$/.test(rawToken) ? rawToken : ''
  const callerEmail = loginEmail(request.auth)
  const db = getFirestore()
  await db.runTransaction(async (tx) => {
    const account = accountOf((await tx.get(db.doc(`accounts/${uid}`))).data())
    if (!account) deny('Accesso negato')
    const inviteSnap = token ? await tx.get(db.doc(`invites/${token}`)) : null
    const invite = inviteSnap ? inviteFields(inviteSnap.data()) : null
    let proEnabled = false
    let activeOthers = 0
    let proRef: DocumentReference | null = null
    let openInviteExpiries: unknown
    let proData: DocumentData | undefined
    if (invite) {
      proRef = db.doc(salonDocPath(invite.salonId, 'pro', 'main'))
      const proSnap = await tx.get(proRef)
      proData = proSnap.data()
      proEnabled = proSnap.get('enabled') === true
      openInviteExpiries = proSnap.get('openInviteExpiries')
      const members = await tx.get(db.collection(salonDocPath(invite.salonId, 'members')))
      activeOthers = activeStaffCount(members.docs)
    }
    const dogs = await tx.get(db.collection(salonDocPath(uid, 'dogs')).limit(1))
    const appointments = await tx.get(db.collection(salonDocPath(uid, 'appointments')).limit(1))
    const decision = acceptInviteDecision({
      invite,
      now: new Date(),
      accountEmail: callerEmail,
      account: { uid, salonId: account.salonId, role: account.role },
      proEnabled,
      activeOthers,
      personalSalonHasData: !dogs.empty || !appointments.empty,
      seatLimit: limitePosti(proData),
    })
    if (!decision.ok) deny(decision.message)
    tx.update(db.doc(`invites/${token}`), { status: 'usato', usedBy: uid })
    const remainingExpiries = invite ? removeOneOpenInviteExpiry(openInviteExpiries, invite.expiresAt) : null
    if (proRef && remainingExpiries !== null) tx.set(proRef, { openInviteExpiries: remainingExpiries }, { merge: true })
    tx.set(db.doc(salonDocPath(decision.salonId, 'members', uid)), {
      uid,
      email: normalizeEmail(callerEmail),
      role: decision.role,
      firstName: account.firstName,
      lastName: account.lastName,
      status: 'attivo',
    })
    tx.update(db.doc(`accounts/${uid}`), { salonId: decision.salonId, role: decision.role })
  })
  return { ok: true }
})

export const revokeMember = onCall(callable, async (request) => {
  const uid = requireUid(request.auth)
  const targetUid = text(field(request.data, 'uid'))
  if (targetUid === '' || targetUid.includes('/')) deny('Accesso negato')
  const db = getFirestore()
  await db.runTransaction(async (tx) => {
    const account = accountOf((await tx.get(db.doc(`accounts/${uid}`))).data())
    if (!account) deny('Accesso negato')
    const salonId = account.salonId
    const readable = salonId !== '' && !salonId.includes('/')
    const proSnap = readable ? await tx.get(db.doc(salonDocPath(salonId, 'pro', 'main'))) : null
    const memberRef = readable ? db.doc(salonDocPath(salonId, 'members', targetUid)) : null
    const memberSnap = memberRef ? await tx.get(memberRef) : null
    const targetAccountRef = db.doc(`accounts/${targetUid}`)
    const targetAccountSnap = await tx.get(targetAccountRef)
    const targetRole = memberSnap?.exists
      ? text(memberSnap.get('role'))
      : targetUid === salonId ? 'titolare' : ''
    const decision = revokeDecision({
      caller: { salonId, role: account.role },
      proEnabled: proSnap?.get('enabled') === true,
      salonId,
      targetUid,
      targetRole,
    })
    if (!decision.ok) deny(decision.message)
    if (!memberRef || !memberSnap?.exists) deny('Accesso negato')
    tx.update(memberRef, { status: 'revocato' })
    if (shouldRestoreAccount(text(targetAccountSnap.get('salonId')), salonId)) {
      tx.set(targetAccountRef, { salonId: targetUid, role: 'titolare' }, { merge: true })
    }
  })
  return { ok: true }
})

export const changeMemberRole = onCall(callable, async (request) => {
  const uid = requireUid(request.auth)
  const targetUid = text(field(request.data, 'uid'))
  const nextRole = text(field(request.data, 'role'))
  if (targetUid === '' || targetUid.includes('/')) deny('Accesso negato')
  const db = getFirestore()
  await db.runTransaction(async (tx) => {
    const account = accountOf((await tx.get(db.doc(`accounts/${uid}`))).data())
    if (!account) deny('Accesso negato')
    const salonId = account.salonId
    const readable = salonId !== '' && !salonId.includes('/')
    const proSnap = readable ? await tx.get(db.doc(salonDocPath(salonId, 'pro', 'main'))) : null
    const memberRef = readable ? db.doc(salonDocPath(salonId, 'members', targetUid)) : null
    const memberSnap = memberRef ? await tx.get(memberRef) : null
    const targetAccountRef = db.doc(`accounts/${targetUid}`)
    const targetAccountSnap = await tx.get(targetAccountRef)
    const decision = changeRoleDecision({
      caller: { salonId, role: account.role },
      proEnabled: proSnap?.get('enabled') === true,
      salonId,
      targetUid,
      nextRole,
    })
    if (!decision.ok) deny(decision.message)
    if (!memberRef || !memberSnap?.exists) deny('Accesso negato')
    tx.update(memberRef, { role: decision.role })
    if (text(targetAccountSnap.get('salonId')) === salonId) {
      tx.update(targetAccountRef, { role: decision.role })
    }
  })
  return { ok: true }
})
