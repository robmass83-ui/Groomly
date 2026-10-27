import { getFirestore } from 'firebase-admin/firestore'
import { haAccesso, statoPiano, type ProMain } from '../../../src/lib/piano'
import { prenotazioneAccesa } from '../../../src/lib/prenotazionePubblica'

export async function salonPrenota(salonId: string): Promise<boolean> {
  const db = getFirestore()
  const settings = (await db.doc(`salons/${salonId}/settings/main`).get()).data() ?? {}
  const pro = (await db.doc(`salons/${salonId}/pro/main`).get()).data()
  const accesso = haAccesso(statoPiano(pro as ProMain | undefined, new Date()), 'prenotazioni')
  return prenotazioneAccesa({ prenotazioniOnline: settings.prenotazioniOnline === true, accesso })
}
