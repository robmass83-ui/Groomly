import { getFirestore } from 'firebase-admin/firestore'
import { provaSelfServiceAccesa } from '../../../src/lib/configPiani'
import type { ProMain } from '../../../src/lib/piano'
import { campiProva, decisioneProva, scriviPiano } from './scriviPiano'
import { erroreDaMessaggio, erroreServer } from '../erroriServer'

type Account = { salonId: string; role: string }

export async function avviaProvaPer(
  uid: string,
  account: Account | null,
  adesso = new Date(),
): Promise<{ ok: true }> {
  if (!account || account.role !== 'titolare' || account.salonId === '' || account.salonId === 'shared' || account.salonId.includes('/')) {
    throw erroreServer('failed-precondition', 'accesso_negato')
  }
  if (account.salonId !== uid) throw erroreServer('failed-precondition', 'accesso_negato')
  const db = getFirestore()
  const ref = db.doc(`salons/${account.salonId}/pro/main`)
  await db.runTransaction(async (tx) => {
    // La prova self-service è spenta finché l'operatore non accende provaSelfService; il «Regala 30 giorni» passa da impostaPianoManuale.
    const config = await tx.get(db.doc('config/globale'))
    if (!provaSelfServiceAccesa(config.data())) throw erroreServer('failed-precondition', 'prova_non_disponibile')
    const snap = await tx.get(ref)
    const decisione = decisioneProva(account.role, snap.data() as ProMain | undefined, adesso)
    if (!decisione.ok) throw erroreDaMessaggio('failed-precondition', decisione.message)
    tx.set(ref, { ...scriviPiano(campiProva(adesso), adesso), updatedAt: adesso.toISOString() }, { merge: true })
  })
  return { ok: true }
}
