import { getFirestore } from 'firebase-admin/firestore'
import { nega, richiediOperatore, type TokenOperatore } from '../beta/comune'

/** «Mostra i piani» dell'Admin Manager: resta nella radice di config/globale, la leggono le APK installate. */
export async function impostaMostraPianiPer(input: { token: TokenOperatore; valore: unknown }): Promise<{ ok: true }> {
  richiediOperatore(input.token)
  if (typeof input.valore !== 'boolean') nega('Impostazione non valida')
  await getFirestore().doc('config/globale').set({ mostraPiani: input.valore }, { merge: true })
  return { ok: true }
}
