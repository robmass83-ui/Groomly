import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { GIORNI_ANNUNCIO, giorniRoma } from '../../../src/lib/accensione'
import { dataIsoValida, leggiConfigPiani } from '../../../src/lib/configPiani'
import { linguaValida, type Lingua } from '../../../src/i18n/lingua'
import { operatoreAutorizzato } from '../../../src/lib/salonPath'
import { erroreServer } from '../erroriServer'

export type InvioAnnuncio = (a: { email: string; lingua: Lingua; pagamentiDal: string }) => Promise<void>

export function dataPartenzaValida(data: unknown, adesso: Date): data is string {
  return dataIsoValida(data) && giorniRoma(adesso, new Date(data)) >= GIORNI_ANNUNCIO
}

export function controllaOperatore(input: { admin?: boolean }): void {
  if (!operatoreAutorizzato({ admin: input.admin })) {
    throw erroreServer('failed-precondition', 'accesso_negato')
  }
}

// Titolari dei saloni ex beta o early adopter: sono loro ad avere l'offerta fondatori.
async function destinatari(): Promise<{ email: string; lingua: Lingua }[]> {
  const db = getFirestore()
  const pro = await db.collectionGroup('pro').get()
  const saloni = new Set<string>()
  for (const doc of pro.docs) {
    const [radice, salonId, , id] = doc.ref.path.split('/')
    const dati = doc.data()
    if (radice !== 'salons' || id !== 'main' || !salonId || salonId === 'shared') continue
    if (dati.exBeta === true || dati.earlyAdopter === true) saloni.add(salonId)
  }
  const out: { email: string; lingua: Lingua }[] = []
  for (const salonId of saloni) {
    const accounts = await db.collection('accounts').where('salonId', '==', salonId).get()
    for (const account of accounts.docs) {
      const dati = account.data()
      if (dati.role !== 'titolare' || typeof dati.email !== 'string' || !dati.email.includes('@')) continue
      out.push({ email: dati.email, lingua: linguaValida(dati.lingua) ?? 'it' })
    }
  }
  return out
}

export async function annunciaPagamentiPer(input: {
  admin?: boolean
  data: unknown
  inviaEmail: InvioAnnuncio
  adesso?: Date
}): Promise<{ ok: true; email: number }> {
  controllaOperatore(input)
  const adesso = input.adesso ?? new Date()
  if (!dataPartenzaValida(input.data, adesso)) throw erroreServer('invalid-argument', 'annuncio_giorni_minimi', { n: GIORNI_ANNUNCIO })
  const pagamentiDal = new Date(input.data).toISOString()
  const db = getFirestore()
  const ref = db.doc('config/globale')
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const globale = snap.data()
    if (globale?.abbonamentiAttivi === true) throw erroreServer('failed-precondition', 'abbonamenti_gia_attivi')
    tx.set(ref, { piani: { ...leggiConfigPiani(globale), annuncioPagamentiIl: adesso.toISOString(), pagamentiDal } }, { merge: true })
  })
  let email = 0
  for (const d of await destinatari()) {
    try {
      await input.inviaEmail({ ...d, pagamentiDal })
      email += 1
    } catch (error) {
      logger.warn('Email annuncio non inviata', { error: String(error) })
    }
  }
  return { ok: true, email }
}
