import { getFirestore } from 'firebase-admin/firestore'
import { nega, richiediOperatore, salonIdValido, type TokenOperatore } from './comune'

/** L'operatore segna o toglie il prezzo di favore a un salone qualunque. */
export async function segnaEarlyAdopterPer(input: { token: TokenOperatore; salonId: unknown; valore: unknown }): Promise<{ ok: true }> {
  richiediOperatore(input.token)
  if (!salonIdValido(input.salonId)) nega('Accesso negato')
  if (typeof input.valore !== 'boolean') nega('Valore non valido')
  const db = getFirestore()
  if (!(await db.doc(`accounts/${input.salonId}`).get()).exists) nega('Salone non trovato')
  await db.doc(`salons/${input.salonId}/pro/main`).set({ earlyAdopter: input.valore, updatedAt: new Date().toISOString() }, { merge: true })
  return { ok: true }
}
