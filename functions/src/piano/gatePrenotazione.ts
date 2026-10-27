import { getFirestore } from 'firebase-admin/firestore'
import { prenotazioniConcesse } from '../../../src/lib/funzioniPiano'
import { prenotazioneAccesa } from '../../../src/lib/prenotazionePubblica'
import type { ProMain } from '../../../src/lib/piano'

export async function salonPrenota(salonId: string): Promise<boolean> {
  const db = getFirestore()
  const settings = (await db.doc(`salons/${salonId}/settings/main`).get()).data() ?? {}
  const pro = (await db.doc(`salons/${salonId}/pro/main`).get()).data()
  const accesso = prenotazioniConcesse(pro as ProMain | undefined)
  return prenotazioneAccesa({ prenotazioniOnline: settings.prenotazioniOnline === true, accesso })
}
