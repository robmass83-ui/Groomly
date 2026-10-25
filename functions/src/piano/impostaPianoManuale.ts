import { getFirestore, type DocumentData } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { isOperator } from '../../../src/lib/salonPath'
import { campiAzione, scriviPiano, type AzionePiano } from './scriviPiano'

const AZIONI = new Set<AzionePiano>(['prova', 'pro', 'salone', 'base'])

export async function impostaPianoManualePer(input: {
  operatorEmail: string
  salonId: string
  azione: string
  adesso?: Date
}): Promise<{ ok: true }> {
  if (!isOperator(input.operatorEmail)) throw new HttpsError('failed-precondition', 'Accesso negato')
  if (!AZIONI.has(input.azione as AzionePiano)) throw new HttpsError('failed-precondition', 'Accesso negato')
  if (input.salonId === '' || input.salonId.includes('/') || input.salonId === 'shared') {
    throw new HttpsError('failed-precondition', 'Accesso negato')
  }
  const adesso = input.adesso ?? new Date()
  const db = getFirestore()
  const ref = db.doc(`salons/${input.salonId}/pro/main`)
  const ownerRef = db.doc(`accounts/${input.salonId}`)
  const memberRef = db.doc(`salons/${input.salonId}/members/${input.salonId}`)
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const ownerSnap = await tx.get(ownerRef)
    const memberSnap = await tx.get(memberRef)
    const provaUsata = snap.get('provaUsata') === true
    const campi = campiAzione(input.azione as AzionePiano, adesso, provaUsata)
    if ('message' in campi) throw new HttpsError('failed-precondition', campi.message)
    tx.set(ref, { ...scriviPiano(campi, adesso), updatedAt: adesso.toISOString() }, { merge: true })
    if (input.azione !== 'salone' || memberSnap.exists) return
    const owner = ownerSnap.data() as DocumentData | undefined
    if (!owner || owner.salonId !== input.salonId || owner.role !== 'titolare') return
    tx.set(memberRef, {
      uid: input.salonId,
      email: typeof owner.email === 'string' ? owner.email : '',
      role: 'titolare',
      firstName: typeof owner.firstName === 'string' ? owner.firstName : '',
      lastName: typeof owner.lastName === 'string' ? owner.lastName : '',
      status: 'attivo',
    })
  })
  return { ok: true }
}
