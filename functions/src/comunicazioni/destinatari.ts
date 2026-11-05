import type { Firestore } from 'firebase-admin/firestore'
import { linguaValida, type Lingua } from '../../../src/i18n/lingua'
import { leggiEmailPromo } from '../../../src/lib/versioneLegale'

export type Destinatario = { uid: string; email: string; lingua: Lingua; salonId: string; consenso: boolean }

// Gli account dei saloni finti del test 360°: non ricevono mai nulla.
const DOMINIO_TEST = '@test.groomly'

/** Una sola scelta dei destinatari per anteprima e invio. Qui `shared` non si scarta: I Pelosetti riceve come gli altri. */
export async function selezionaDestinatari(db: Firestore, salonIds: readonly string[] | 'tutti'): Promise<{ account: Destinatario[]; titolari: Destinatario[] }> {
  const scelti = salonIds === 'tutti' ? null : new Set(salonIds)
  const account: Destinatario[] = []
  const titolari: Destinatario[] = []
  for (const doc of (await db.collection('accounts').get()).docs) {
    const dati = doc.data()
    const email = typeof dati.email === 'string' ? dati.email.trim() : ''
    const salonId = dati.salonId
    if (typeof salonId !== 'string' || salonId === '' || email.toLowerCase().endsWith(DOMINIO_TEST)) continue
    if (scelti && !scelti.has(salonId)) continue
    const voce = { uid: doc.id, email, lingua: linguaValida(dati.lingua) ?? 'it', salonId, consenso: leggiEmailPromo(dati.emailPromo)?.attivo === true }
    account.push(voce)
    if (dati.role === 'titolare' && email.includes('@')) titolari.push(voce)
  }
  return { account, titolari }
}
