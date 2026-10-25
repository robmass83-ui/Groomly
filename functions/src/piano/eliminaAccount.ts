import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { revocaMembroAllUscita } from '../../../src/lib/uscitaMembro'

export function decisioneEliminazione(input: {
  uid: string
  salonId: string
  richiesto?: string
  fonte?: string
  stato?: string
}): { ok: true; azione: 'salone' | 'membro' } | { ok: false; message: string } {
  if (input.uid === '' || input.salonId === '' || input.salonId === 'shared' || input.richiesto === 'shared') {
    return { ok: false, message: 'Accesso negato' }
  }
  if (input.richiesto && input.richiesto !== input.uid) return { ok: false, message: 'Accesso negato' }
  if (input.salonId === input.uid) {
    if (input.fonte === 'play' && input.stato === 'attivo') return { ok: false, message: 'Disdici prima su Google Play' }
    return { ok: true, azione: 'salone' }
  }
  return { ok: true, azione: 'membro' }
}

export async function eliminaAccountPer(uid: string, richiesto?: string): Promise<{ ok: true }> {
  const db = getFirestore()
  const account = (await db.doc(`accounts/${uid}`).get()).data() ?? {}
  const salonId = typeof account.salonId === 'string' ? account.salonId : ''
  const pro = salonId === uid ? ((await db.doc(`salons/${uid}/pro/main`).get()).data() ?? {}) : {}
  const decisione = decisioneEliminazione({
    uid,
    salonId,
    richiesto,
    fonte: typeof pro.fonte === 'string' ? pro.fonte : undefined,
    stato: typeof pro.stato === 'string' ? pro.stato : undefined,
  })
  if (!decisione.ok) throw new HttpsError('failed-precondition', decisione.message)
  if (decisione.azione === 'membro') {
    const member = db.doc(`salons/${salonId}/members/${uid}`)
    const dati = (await member.get()).data() ?? {}
    const status = typeof dati.status === 'string' ? dati.status : 'attivo'
    await member.set(revocaMembroAllUscita({ ...dati, status }), { merge: true })
    await db.recursiveDelete(db.doc(`accounts/${uid}`))
    await getAuth().deleteUser(uid)
    return { ok: true }
  }
  const members = await db.collection(`salons/${uid}/members`).get()
  for (const member of members.docs) {
    await member.ref.set({ status: 'revocato' }, { merge: true })
  }
  await db.recursiveDelete(db.doc(`salons/${uid}`))
  await db.recursiveDelete(db.doc(`accounts/${uid}`))
  await getAuth().deleteUser(uid)
  return { ok: true }
}
