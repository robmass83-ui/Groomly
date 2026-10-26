import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { eChiaveFunzione } from '../../../src/lib/funzioniPiano'
import { isOperator } from '../../../src/lib/salonPath'
import { decisioneManuale } from './scriviPiano'

export async function impostaFunzionePer(input: {
  operatorEmail: string
  salonId: string
  chiave: string
  acceso: boolean
}): Promise<{ ok: true }> {
  if (!isOperator(input.operatorEmail)) throw new HttpsError('failed-precondition', 'Accesso negato')
  const decisione = decisioneManuale(true, input.salonId)
  if (!decisione.ok) throw new HttpsError('failed-precondition', decisione.message)
  if (!eChiaveFunzione(input.chiave)) throw new HttpsError('failed-precondition', 'Accesso negato')
  const db = getFirestore()
  const ref = db.doc(`salons/${input.salonId}/pro/main`)
  const adesso = new Date().toISOString()
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const attuali = snap.get('funzioni')
    const funzioni: Record<string, boolean> = {}
    if (attuali && typeof attuali === 'object') {
      for (const [chiave, valore] of Object.entries(attuali as Record<string, unknown>)) {
        if (typeof valore === 'boolean') funzioni[chiave] = valore
      }
    }
    funzioni[input.chiave] = input.acceso === true
    tx.set(ref, { funzioni, updatedAt: adesso }, { merge: true })
  })
  return { ok: true }
}
