import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { provaSelfServiceAccesa } from '../../../src/lib/configPiani'
import type { ProMain } from '../../../src/lib/piano'
import { campiProva, decisioneProva, scriviPiano } from './scriviPiano'

type Account = { salonId: string; role: string }

export async function avviaProvaPer(
  uid: string,
  account: Account | null,
  adesso = new Date(),
): Promise<{ ok: true }> {
  if (!account || account.role !== 'titolare' || account.salonId === '' || account.salonId === 'shared' || account.salonId.includes('/')) {
    throw new HttpsError('failed-precondition', 'Accesso negato')
  }
  if (account.salonId !== uid) throw new HttpsError('failed-precondition', 'Accesso negato')
  const db = getFirestore()
  const ref = db.doc(`salons/${account.salonId}/pro/main`)
  await db.runTransaction(async (tx) => {
    // La prova self-service è spenta finché l'operatore non accende provaSelfService; il «Regala 30 giorni» passa da impostaPianoManuale.
    const config = await tx.get(db.doc('config/globale'))
    if (!provaSelfServiceAccesa(config.data())) throw new HttpsError('failed-precondition', 'Prova non disponibile')
    const snap = await tx.get(ref)
    const decisione = decisioneProva(account.role, snap.data() as ProMain | undefined, adesso)
    if (!decisione.ok) throw new HttpsError('failed-precondition', decisione.message)
    tx.set(ref, { ...scriviPiano(campiProva(adesso), adesso), updatedAt: adesso.toISOString() }, { merge: true })
  })
  return { ok: true }
}
