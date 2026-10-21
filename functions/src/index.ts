import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldPath, FieldValue, getFirestore, type DocumentReference } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import * as logger from 'firebase-functions/logger'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { defineSecret } from 'firebase-functions/params'
import { deliveryId } from '../../src/lib/pushDue'
import { buildActionLink } from './actionLink'
import { BrevoRequestError, postBrevoTemplate, type BrevoParams } from './brevoMail'
import { rateDecision } from './rateLimit'
import {
  APPOINTMENT_LOOKBACK_MS,
  appointmentFromDoc,
  collectSends,
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
  const deviceRefs = new Map<string, DocumentReference>()

  const load: PushLoad = {
    accountIds: async () => (await db.collection('accounts').get()).docs.map((doc) => doc.id),
    prefs: async (uid) => (await db.doc(`accounts/${uid}/push/prefs`).get()).data(),
    devices: async (uid) => {
      const snap = await db.collection(`accounts/${uid}/devices`).get()
      return snap.docs.map((doc) => {
        deviceRefs.set(doc.id, doc.ref)
        const data = doc.data()
        return {
          id: doc.id,
          token: text(data.token),
          appVersion: text(data.appVersion),
        }
      })
    },
    appointments: async () => {
      const snap = await db.collection('salon/shared/appointments')
        .where('status', '==', 'programmato')
        .where('start', '>=', now - APPOINTMENT_LOOKBACK_MS)
        .get()
      return snap.docs.map((doc) => appointmentFromDoc(doc.id, doc.data()))
    },
    dogName: async (dogId) => text((await db.doc(`salon/shared/dogs/${dogId}`).get()).data()?.name),
    delivered: async (deviceId) => {
      const prefixes = [
        deliveryId(deviceId, 'updates', ''),
        deliveryId(deviceId, 'complete', ''),
      ]
      const snapshots = await Promise.all(prefixes.map((prefix) => (
        db.collection('pushDeliveries')
          .orderBy(FieldPath.documentId())
          .startAt(prefix)
          .endAt(`${prefix}\uf8ff`)
          .get()
      )))
      return snapshots.flatMap((snapshot) => (
        snapshot.docs
          .filter((doc) => typeof doc.data().at === 'number')
          .map((doc) => doc.id)
      ))
    },
    latestVersion: async () => latestVersion,
  }

  const sends = await collectSends(load, now)
  for (const send of sends) {
    const deliveryRef = db.doc(`pushDeliveries/${deliveryId(send.deviceId, send.kind, send.subject)}`)
    try {
      await deliveryRef.create({ claim: now })
    } catch (error) {
      const code = authCode(error)
      if (code !== '6' && !code.includes('already-exists')) throw error
      const slot = deliverySlot((await deliveryRef.get()).data(), now)
      if (slot === 'done' || slot === 'busy') continue
      await deliveryRef.set({ claim: now })
    }
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
            channelId: send.kind === 'complete' ? 'da-completare' : 'aggiornamenti',
          },
        },
      })
    } catch (error) {
      if (authCode(error).endsWith('registration-token-not-registered')) {
        const deviceRef = deviceRefs.get(send.deviceId)
        await Promise.all([
          deviceRef?.update({ token: FieldValue.delete() }),
          deliveryRef.delete(),
        ])
        continue
      }
      await deliveryRef.delete()
      throw error
    }
    await deliveryRef.set({ at: now })
  }
})
