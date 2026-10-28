import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { HttpsError } from 'firebase-functions/v2/https'
import { linguaValida } from '../../../src/i18n/lingua'
import { isLauraEmail } from '../../../src/lib/salonPath'
import { revocaMembroAllUscita } from '../../../src/lib/uscitaMembro'
import { emailEliminazione } from './emailEliminazione'

export function avvisoAbbonamentoPlay(fonte?: string, stato?: string): boolean {
  return fonte === 'play' && stato === 'attivo'
}

export function decisioneEliminazione(input: {
  uid: string
  salonId: string
  richiesto?: string
  fonte?: string
  stato?: string
  email?: string
  vip?: boolean
}): { ok: true; azione: 'salone' | 'membro' } | { ok: false; message: string } {
  if (input.uid === '' || input.salonId === '' || input.salonId === 'shared' || input.richiesto === 'shared') {
    return { ok: false, message: 'Accesso negato' }
  }
  if (input.richiesto && input.richiesto !== input.uid) return { ok: false, message: 'Accesso negato' }
  if (isLauraEmail(input.email) || (input.vip === true && input.salonId === input.uid)) {
    return { ok: false, message: 'Questo account non si può eliminare' }
  }
  if (input.salonId === input.uid) return { ok: true, azione: 'salone' }
  return { ok: true, azione: 'membro' }
}

export async function eliminaAccountPer(
  uid: string,
  richiesto?: string,
  invia?: (to: string, subject: string, html: string) => Promise<void>,
): Promise<{ ok: true }> {
  const auth = getAuth()
  const utente = await auth.getUser(uid).catch(() => null)
  const db = getFirestore()
  const account = (await db.doc(`accounts/${uid}`).get()).data() ?? {}
  const lingua = linguaValida(account.lingua) ?? 'it'
  const salonId = typeof account.salonId === 'string' ? account.salonId : ''
  const emailAccount = typeof account.email === 'string' ? account.email : ''
  const emailAuth = typeof utente?.email === 'string' ? utente.email : ''
  const pro = salonId === uid ? ((await db.doc(`salons/${uid}/pro/main`).get()).data() ?? {}) : {}
  const vip = pro.fonte === 'omaggio' && pro.piano === 'salone' && pro.stato === 'attivo' && (pro.scadeIl == null || pro.scadeIl === '')
  const decisione = decisioneEliminazione({
    uid,
    salonId,
    richiesto,
    email: emailAuth,
    vip,
    fonte: typeof pro.fonte === 'string' ? pro.fonte : undefined,
    stato: typeof pro.stato === 'string' ? pro.stato : undefined,
  })
  if (!decisione.ok) throw new HttpsError('failed-precondition', decisione.message)
  let nomeSalone = ''
  if (decisione.azione === 'salone') {
    const settings = (await db.doc(`salons/${uid}/settings/main`).get()).data() ?? {}
    const business = settings.business
    if (business && typeof business === 'object' && 'salonName' in business && typeof business.salonName === 'string') {
      nomeSalone = business.salonName
    }
    const members = await db.collection(`salons/${uid}/members`).get()
    for (const member of members.docs) {
      await member.ref.set({ status: 'revocato' }, { merge: true })
    }
    await db.recursiveDelete(db.doc(`salons/${uid}`))
  } else {
    const member = db.doc(`salons/${salonId}/members/${uid}`)
    const dati = (await member.get()).data() ?? {}
    const status = typeof dati.status === 'string' ? dati.status : 'attivo'
    await member.set(revocaMembroAllUscita({ ...dati, status }), { merge: true })
  }
  await db.recursiveDelete(db.doc(`accounts/${uid}`))
  await svuotaStorage(uid)
  const destinazione = utente?.email || emailAccount
  await auth.deleteUser(uid)
  if (destinazione && invia) {
    const lettera = emailEliminazione(nomeSalone, lingua)
    await invia(destinazione, lettera.oggetto, lettera.html).catch(() => undefined)
  }
  return { ok: true }
}

async function svuotaStorage(uid: string): Promise<void> {
  try {
    await getStorage().bucket().deleteFiles({ prefix: `users/${uid}/` })
  } catch {
    // Il bucket può mancare negli ambienti senza Storage: i dati stanno in Firestore.
  }
}
