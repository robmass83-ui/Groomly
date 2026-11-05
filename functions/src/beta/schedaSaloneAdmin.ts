import { getFirestore } from 'firebase-admin/firestore'
import { linguaValida, type Lingua } from '../../../src/i18n/lingua'
import { erroreServer } from '../erroriServer'
import { GIORNO_MS, richiediOperatore, type TokenOperatore } from './comune'

export type SchedaAggregata = {
  cani: number
  appuntamenti: number
  appuntamenti30: number
  persone: number
  versioneApp: string | null
  lingua: Lingua | null
}

function piuRecente(a: string | null, b: string): string {
  if (!a) return b
  const [pa, pb] = [a, b].map((v) => v.split('.').map(Number))
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const differenza = (pb[i] ?? 0) - (pa[i] ?? 0)
    if (differenza !== 0) return differenza > 0 ? b : a
  }
  return a
}

/** Solo numeri: il DPA vieta di portare in Console i dati dei clienti del salone. Non scrive nulla. */
export async function schedaSaloneAdminPer(input: { token: TokenOperatore; salonId: unknown; adesso?: Date }): Promise<SchedaAggregata> {
  richiediOperatore(input.token)
  const { salonId } = input
  if (typeof salonId !== 'string' || salonId === '' || salonId.includes('/')) throw erroreServer('invalid-argument', 'richiesta_non_valida')
  const adesso = (input.adesso ?? new Date()).getTime()
  const db = getFirestore()
  const radice = `salons/${salonId}`
  const appuntamenti = db.collection(`${radice}/appointments`)
  const [cani, tutti, recenti, persone, account] = await Promise.all([
    db.collection(`${radice}/dogs`).count().get(),
    appuntamenti.count().get(),
    appuntamenti.where('start', '>=', adesso - 30 * GIORNO_MS).where('start', '<=', adesso).count().get(),
    db.collection(`${radice}/members`).where('status', '==', 'attivo').count().get(),
    db.collection('accounts').where('salonId', '==', salonId).get(),
  ])
  let versioneApp: string | null = null
  for (const doc of account.docs) {
    for (const telefono of (await doc.ref.collection('devices').get()).docs) {
      const versione = telefono.data().appVersion
      if (typeof versione === 'string' && versione !== '') versioneApp = piuRecente(versioneApp, versione)
    }
  }
  const titolare = account.docs.find((doc) => doc.data().role === 'titolare')
  return {
    cani: cani.data().count,
    appuntamenti: tutti.data().count,
    appuntamenti30: recenti.data().count,
    persone: persone.data().count,
    versioneApp,
    lingua: linguaValida(titolare?.data().lingua),
  }
}
