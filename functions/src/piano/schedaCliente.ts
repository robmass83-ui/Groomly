import { randomBytes } from 'node:crypto'
import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { esitoToken, schedaPubblica } from '../../../src/lib/schedaPubblica'

export async function pubblicaSchedaPer(salonId: string, dogId: string): Promise<{ token: string }> {
  if (salonId === '' || salonId === 'shared' || salonId.includes('/') || dogId === '') {
    throw new HttpsError('failed-precondition', 'Accesso negato')
  }
  const token = randomBytes(32).toString('hex')
  await getFirestore().doc(`schede/${token}`).set({ salonId, dogId, revocato: false })
  return { token }
}

export async function revocaSchedaPer(salonId: string, token: string): Promise<{ ok: true }> {
  const ref = getFirestore().doc(`schede/${token}`)
  const data = (await ref.get()).data()
  if (!data || data.salonId !== salonId) throw new HttpsError('not-found', 'non_trovata')
  await ref.set({ revocato: true }, { merge: true })
  return { ok: true }
}

export async function schedaClientePer(token: string): Promise<{ stato: 'ok' | 'non_trovata'; scheda?: { nome: string; specie: string } }> {
  if (!/^[a-f0-9]{64}$/.test(token)) return { stato: 'non_trovata' }
  const data = (await getFirestore().doc(`schede/${token}`).get()).data()
  const stato = esitoToken(data?.revocato === true, Boolean(data))
  if (stato === 'non_trovata' || !data) return { stato: 'non_trovata' }
  const cane = (await getFirestore().doc(`salons/${data.salonId}/dogs/${data.dogId}`).get()).data() ?? {}
  return { stato: 'ok', scheda: schedaPubblica(cane) }
}
