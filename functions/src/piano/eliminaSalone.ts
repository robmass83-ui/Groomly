import { getAuth } from 'firebase-admin/auth'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { isSharedEmail, operatoreAutorizzato } from '../../../src/lib/salonPath'
import { pulisciPersona, pulisciRaccolteSalone } from './pulisciSalone'
import { erroreDaMessaggio, erroreServer, messaggioServer } from '../erroriServer'

/** Persona del salone da cancellare: titolare o collaboratore, con l'email dell'accesso e quella dell'account. */
export type PersonaSalone = { uid: string; emails: string[] }

/**
 * Solo per i test: l'operatore cancella un salone intero.
 * Mai le persone del salone condiviso, mai il salone condiviso, mai il salone di chi chiama.
 */
export function decisioneEliminaSalone(input: {
  salonId: string
  admin?: boolean
  chiamante: string
  salonChiamante?: string
  persone: PersonaSalone[]
}): { ok: true } | { ok: false; message: string } {
  if (!operatoreAutorizzato({ admin: input.admin })) {
    return { ok: false, message: messaggioServer('accesso_negato') }
  }
  const id = input.salonId.trim()
  if (id === '' || id === 'shared' || id.includes('/')) return { ok: false, message: messaggioServer('accesso_negato') }
  if (id === input.chiamante || id === input.salonChiamante) {
    return { ok: false, message: messaggioServer('salone_non_eliminabile') }
  }
  if (input.persone.some((persona) => persona.uid === input.chiamante || persona.emails.some((email) => isSharedEmail(email)))) {
    return { ok: false, message: messaggioServer('salone_non_eliminabile') }
  }
  return { ok: true }
}

export async function eliminaSalonePer(input: {
  admin?: boolean
  chiamante: string
  salonId: string
}): Promise<{ ok: true; persone: number; riportate: number }> {
  const db = getFirestore()
  const auth = getAuth()
  const salonId = input.salonId.trim()
  if (salonId === '' || salonId.includes('/')) throw erroreServer('failed-precondition', 'accesso_negato')
  const chiamante = (await db.doc(`accounts/${input.chiamante}`).get()).data() ?? {}
  const persone = await personeDelSalone(db, salonId)
  const decisione = decisioneEliminaSalone({
    salonId,
    admin: input.admin,
    chiamante: input.chiamante,
    salonChiamante: typeof chiamante.salonId === 'string' ? chiamante.salonId : undefined,
    persone,
  })
  if (!decisione.ok) throw erroreDaMessaggio('failed-precondition', decisione.message)

  // Chi ha un salone proprio con dati (cani o appuntamenti) non perde nulla: torna titolare del suo salone.
  const daCancellare: PersonaSalone[] = []
  let riportate = 0
  for (const persona of persone) {
    if (persona.uid !== salonId && (await haDatiPersonali(db, persona.uid))) {
      await db.doc(`accounts/${persona.uid}`).set({ salonId: persona.uid, role: 'titolare' }, { merge: true })
      riportate += 1
    } else {
      daCancellare.push(persona)
    }
  }
  const uids = daCancellare.map((persona) => persona.uid)

  // Prima il salone, poi le persone: se si interrompe, rilanciare riprende da dove era.
  await db.recursiveDelete(db.doc(`salons/${salonId}`))
  await pulisciRaccolteSalone(db, salonId)
  for (const persona of daCancellare) {
    await pulisciPersona(db, persona)
  }
  // Per ultimi gli accessi: così la stessa email torna libera per una nuova registrazione.
  for (const uid of uids) {
    await auth.deleteUser(uid).catch((error: unknown) => {
      if ((error as { code?: string }).code !== 'auth/user-not-found') throw error
    })
  }
  return { ok: true, persone: uids.length, riportate }
}

/** Il salone personale ha almeno un cane o un appuntamento. */
async function haDatiPersonali(db: Firestore, uid: string): Promise<boolean> {
  for (const raccolta of ['dogs', 'appointments']) {
    const snap = await db.collection(`salons/${uid}/${raccolta}`).limit(1).get()
    if (!snap.empty) return true
  }
  return false
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
