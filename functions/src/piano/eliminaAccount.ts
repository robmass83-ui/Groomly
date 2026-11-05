import { getAuth } from 'firebase-admin/auth'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { linguaValida } from '../../../src/i18n/lingua'
import { isLauraEmail } from '../../../src/lib/salonPath'
import { revocaMembroAllUscita } from '../../../src/lib/uscitaMembro'
import { shouldRestoreAccount } from '../salonInvite'
import { emailEliminazione } from './emailEliminazione'
import { riprendiSalone } from './pausaSalone'
import { pulisciPersona, pulisciRaccolteSalone } from './pulisciSalone'
import { erroreDaMessaggio, messaggioServer } from '../erroriServer'

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
    return { ok: false, message: messaggioServer('accesso_negato') }
  }
  if (input.richiesto && input.richiesto !== input.uid) return { ok: false, message: messaggioServer('accesso_negato') }
  // VIP è il salone personale: chi lo ha non si elimina, anche mentre lavora in un altro salone.
  if (isLauraEmail(input.email) || input.vip === true) {
    return { ok: false, message: messaggioServer('account_non_eliminabile') }
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
  // Il piano del salone personale: anche chi ora lavora altrove può averne uno VIP.
  const pro = salonId !== '' && salonId !== 'shared' ? ((await db.doc(`salons/${uid}/pro/main`).get()).data() ?? {}) : {}
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
  if (!decisione.ok) throw erroreDaMessaggio('failed-precondition', decisione.message)
  let nomeSalone = ''
  if (decisione.azione === 'salone') {
    const settings = (await db.doc(`salons/${uid}/settings/main`).get()).data() ?? {}
    const business = settings.business
    if (business && typeof business === 'object' && 'salonName' in business && typeof business.salonName === 'string') {
      nomeSalone = business.salonName
    }
    await restituisciMembri(db, uid)
    await db.recursiveDelete(db.doc(`salons/${uid}`))
    await pulisciRaccolteSalone(db, uid)
    await pulisciPersona(db, { uid, emails: [emailAuth, emailAccount] })
  } else {
    const member = db.doc(`salons/${salonId}/members/${uid}`)
    const dati = (await member.get()).data() ?? {}
    const status = typeof dati.status === 'string' ? dati.status : 'attivo'
    await member.set(revocaMembroAllUscita({ ...dati, status }), { merge: true })
    // Il salone personale di chi se ne va non resta orfano, e chi ci lavorava torna al proprio.
    await restituisciMembri(db, uid)
    await db.recursiveDelete(db.doc(`salons/${uid}`))
    await pulisciRaccolteSalone(db, uid)
    await pulisciPersona(db, { uid, emails: [emailAuth, emailAccount] })
  }
  const destinazione = utente?.email || emailAccount
  await auth.deleteUser(uid)
  if (destinazione && invia) {
    const lettera = emailEliminazione(nomeSalone, lingua)
    await invia(destinazione, lettera.oggetto, lettera.html).catch(() => undefined)
  }
  return { ok: true }
}

// Soci e collaboratori del salone che sparisce tengono il loro accesso: tornano al proprio salone,
// come quando escono, e se il loro salone era in pausa torna operativo insieme a loro.
async function restituisciMembri(db: Firestore, salonId: string): Promise<void> {
  const members = await db.collection(`salons/${salonId}/members`).get()
  for (const member of members.docs) {
    if (member.id !== salonId) {
      // Prima il suo account torna al proprio salone, poi risulta revocato: chi lo vede revocato e
      // rilegge il proprio account dal server trova già il salone giusto.
      const accountMembro = db.doc(`accounts/${member.id}`)
      const legatoA = (await accountMembro.get()).get('salonId')
      const legato = typeof legatoA === 'string' ? legatoA : ''
      if (shouldRestoreAccount(legato, salonId)) {
        await accountMembro.set({ salonId: member.id, role: 'titolare' }, { merge: true })
        await riprendiSalone(db, member.id)
      }
    }
    await member.ref.set({ status: 'revocato' }, { merge: true })
  }
}
