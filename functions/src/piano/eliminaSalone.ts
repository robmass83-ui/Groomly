import { getAuth } from 'firebase-admin/auth'
import { FieldPath, getFirestore, type Firestore, type Query } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { HttpsError } from 'firebase-functions/v2/https'
import { isSharedEmail, normalizeEmail, operatoreAutorizzato } from '../../../src/lib/salonPath'

/** Persona del salone da cancellare: titolare o collaboratore, con l'email dell'accesso e quella dell'account. */
export type PersonaSalone = { uid: string; emails: string[] }

/**
 * Solo per i test: l'operatore cancella un salone intero.
 * Mai Laura o Roberto, mai il salone condiviso, mai il salone di chi chiama.
 */
export function decisioneEliminaSalone(input: {
  salonId: string
  operatorEmail: string
  emailVerified?: boolean
  admin?: boolean
  chiamante: string
  salonChiamante?: string
  persone: PersonaSalone[]
}): { ok: true } | { ok: false; message: string } {
  if (!operatoreAutorizzato({ email: input.operatorEmail, emailVerified: input.emailVerified, admin: input.admin })) {
    return { ok: false, message: 'Accesso negato' }
  }
  const id = input.salonId.trim()
  if (id === '' || id === 'shared' || id.includes('/')) return { ok: false, message: 'Accesso negato' }
  if (id === input.chiamante || id === input.salonChiamante) {
    return { ok: false, message: 'Questa toelettatura non si può eliminare' }
  }
  if (input.persone.some((persona) => persona.uid === input.chiamante || persona.emails.some((email) => isSharedEmail(email)))) {
    return { ok: false, message: 'Questa toelettatura non si può eliminare' }
  }
  return { ok: true }
}

export async function eliminaSalonePer(input: {
  operatorEmail: string
  emailVerified?: boolean
  admin?: boolean
  chiamante: string
  salonId: string
}): Promise<{ ok: true; persone: number }> {
  const db = getFirestore()
  const auth = getAuth()
  const salonId = input.salonId.trim()
  if (salonId === '' || salonId.includes('/')) throw new HttpsError('failed-precondition', 'Accesso negato')
  const chiamante = (await db.doc(`accounts/${input.chiamante}`).get()).data() ?? {}
  const persone = await personeDelSalone(db, salonId)
  const decisione = decisioneEliminaSalone({
    salonId,
    operatorEmail: input.operatorEmail,
    emailVerified: input.emailVerified,
    admin: input.admin,
    chiamante: input.chiamante,
    salonChiamante: typeof chiamante.salonId === 'string' ? chiamante.salonId : undefined,
    persone,
  })
  if (!decisione.ok) throw new HttpsError('failed-precondition', decisione.message)

  const uids = persone.map((persona) => persona.uid)
  const emails = [...new Set(persone.flatMap((persona) => persona.emails.map(normalizeEmail)).filter((email) => email !== ''))]
  const telefoni: string[] = []
  for (const uid of uids) {
    const devices = await db.collection(`accounts/${uid}/devices`).get()
    telefoni.push(...devices.docs.map((doc) => doc.id))
  }

  // Prima il salone, poi le persone: se si interrompe, rilanciare riprende da dove era.
  await db.recursiveDelete(db.doc(`salons/${salonId}`))
  await cancellaQuery(db, db.collection('invites').where('salonId', '==', salonId))
  await cancellaQuery(db, db.collection('pubblici').where('salonId', '==', salonId))
  await cancellaQuery(db, db.collection('schede').where('salonId', '==', salonId))
  await cancellaQuery(db, db.collection('suggerimenti').where('salonId', '==', salonId))
  for (const uid of uids) {
    await cancellaQuery(db, db.collection('suggerimenti').where('uid', '==', uid))
    await cancellaQuery(db, db.collection('pushSfide').where('uid', '==', uid))
    for (const limite of ['suggerimentiLimiti', 'placesRateLimits', 'pushRateLimits']) {
      await db.doc(`${limite}/${uid}`).delete()
    }
    await db.recursiveDelete(db.doc(`accounts/${uid}`))
    await db.recursiveDelete(db.doc(`users/${uid}`))
    await svuotaStorage(uid)
  }
  for (const telefono of telefoni) {
    const parte = telefono.replace(/[^a-zA-Z0-9_-]+/g, '_')
    await cancellaQuery(db, db.collection('pushDeliveries')
      .orderBy(FieldPath.documentId())
      .startAt(`${parte}__`)
      .endAt(`${parte}__`))
  }
  for (const email of emails) {
    await db.doc(`emailRateLimits/${email}`).delete()
  }
  // Per ultimi gli accessi: così la stessa email torna libera per una nuova registrazione.
  for (const uid of uids) {
    await auth.deleteUser(uid).catch((error: unknown) => {
      if ((error as { code?: string }).code !== 'auth/user-not-found') throw error
    })
  }
  return { ok: true, persone: uids.length }
}

/** Titolare (uid = salonId) e chi ha l'account legato al salone. */
async function personeDelSalone(db: Firestore, salonId: string): Promise<PersonaSalone[]> {
  const auth = getAuth()
  const emailAccount = new Map<string, string>()
  const legati = await db.collection('accounts').where('salonId', '==', salonId).get()
  for (const doc of legati.docs) emailAccount.set(doc.id, testo(doc.get('email')))
  if (!emailAccount.has(salonId)) {
    const titolare = await db.doc(`accounts/${salonId}`).get()
    if (titolare.exists) emailAccount.set(salonId, testo(titolare.get('email')))
  }
  const accessoTitolare = await auth.getUser(salonId).catch(() => null)
  if (accessoTitolare && !emailAccount.has(salonId)) emailAccount.set(salonId, '')
  const persone: PersonaSalone[] = []
  for (const [uid, email] of emailAccount) {
    const accesso = uid === salonId ? accessoTitolare : await auth.getUser(uid).catch(() => null)
    persone.push({ uid, emails: [email, accesso?.email ?? ''].filter((voce) => voce !== '') })
  }
  return persone
}

function testo(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

async function cancellaQuery(db: Firestore, query: Query): Promise<void> {
  const snap = await query.get()
  if (snap.empty) return
  const writer = db.bulkWriter()
  for (const doc of snap.docs) void writer.delete(doc.ref)
  await writer.close()
}

async function svuotaStorage(uid: string): Promise<void> {
  try {
    await getStorage().bucket().deleteFiles({ prefix: `users/${uid}/` })
  } catch {
    // Il bucket può mancare negli ambienti senza Storage: i dati stanno in Firestore.
  }
}
