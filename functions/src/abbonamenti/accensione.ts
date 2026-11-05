import { getFirestore } from 'firebase-admin/firestore'
import { GIORNI_ANNUNCIO, giorniRoma, type Controllo, type VoceControllo } from '../../../src/lib/accensione'
import { dataIsoValida, leggiConfigPiani } from '../../../src/lib/configPiani'
import { controllaOperatore } from './annuncio'
import type { VoceOffering } from './offeringRc'
import { erroreServer } from '../erroriServer'

type Operatore = { admin?: boolean }
// L'offering si legge da RevenueCat: lo passa chi chiama (index.ts con i segreti, i test con un finto).
type LeggiOffering = (offeringId: string) => Promise<VoceOffering>

export const PAROLA_ACCENDI = 'ACCENDI'

export function controlloPer(stato: { globale: unknown; webhook: unknown; offering: VoceOffering }, adesso: Date): Controllo {
  const piani = leggiConfigPiani(stato.globale)
  const ultimo = (stato.webhook as { ultimoEventoIl?: unknown } | undefined)?.ultimoEventoIl
  const ultimoEventoIl = dataIsoValida(ultimo) ? ultimo : null
  const { annuncioPagamentiIl: inviatoIl, pagamentiDal } = piani
  const mancanoAnnuncio = inviatoIl ? GIORNI_ANNUNCIO - giorniRoma(new Date(inviatoIl), adesso) : GIORNI_ANNUNCIO
  const mancanoPartenza = pagamentiDal ? giorniRoma(adesso, new Date(pagamentiDal)) : 0
  const mancanoGiorni = Math.max(0, mancanoAnnuncio, mancanoPartenza)
  const voci: VoceControllo[] = [
    { id: 'chiave', ok: piani.revenueCat.chiaveSdk.startsWith('goog_') },
    stato.offering,
    { id: 'webhook', ok: ultimoEventoIl !== null, ultimoEventoIl },
    { id: 'annuncio', ok: inviatoIl !== null && pagamentiDal !== null && mancanoGiorni === 0, inviatoIl, pagamentiDal, mancanoGiorni },
    { id: 'conferma', ok: piani.confermaFiscaleIl !== null, confermatoIl: piani.confermaFiscaleIl },
  ]
  const pronti = voci.filter((v) => v.ok).length
  const attivi = (stato.globale as { abbonamentiAttivi?: unknown } | undefined)?.abbonamentiAttivi === true
  return { voci, pronti, tuttoVerde: pronti === voci.length, attivi }
}

async function controlloDa(offering: LeggiOffering, adesso: Date): Promise<Controllo> {
  const db = getFirestore()
  const [globale, webhook] = await Promise.all([db.doc('config/globale').get(), db.doc('rcStato/webhook').get()])
  const dati = globale.data()
  return controlloPer({ globale: dati, webhook: webhook.data(), offering: await offering(leggiConfigPiani(dati).revenueCat.offeringId) }, adesso)
}

export async function controlloAccensionePer(input: Operatore & { offering: LeggiOffering }, adesso = new Date()): Promise<Controllo> {
  controllaOperatore(input)
  return controlloDa(input.offering, adesso)
}

export async function confermaPartitaIvaPer(input: Operatore & { valore: unknown }, adesso = new Date()): Promise<{ ok: true; confermatoIl: string | null }> {
  controllaOperatore(input)
  if (typeof input.valore !== 'boolean') throw erroreServer('invalid-argument', 'impostazione_non_valida')
  const confermatoIl = input.valore ? adesso.toISOString() : null
  const db = getFirestore()
  const ref = db.doc('config/globale')
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    tx.set(ref, { piani: { ...leggiConfigPiani(snap.data()), confermaFiscaleIl: confermatoIl } }, { merge: true })
  })
  return { ok: true, confermatoIl }
}

// Il controllo si rifà qui: il pannello non basta a sbloccare l'interruttore.
export async function accendiAbbonamentiPer(input: Operatore & { parola: unknown; offering: LeggiOffering }, adesso = new Date()): Promise<{ ok: true }> {
  controllaOperatore(input)
  if (input.parola !== PAROLA_ACCENDI) throw erroreServer('invalid-argument', 'scrivi_parola', { parola: PAROLA_ACCENDI })
  const controllo = await controlloDa(input.offering, adesso)
  if (!controllo.tuttoVerde) throw erroreServer('failed-precondition', 'controllo_non_superato')
  const db = getFirestore()
  const ref = db.doc('config/globale')
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    tx.set(ref, { abbonamentiAttivi: true, piani: { ...leggiConfigPiani(snap.data()), accesiIl: adesso.toISOString() } }, { merge: true })
  })
  return { ok: true }
}

// Si torna come in beta: le vetrine dicono «Avvisami». I piani Play già pagati non si toccano e il webhook continua a seguirli.
export async function spegniAbbonamentiPer(input: Operatore): Promise<{ ok: true }> {
  controllaOperatore(input)
  await getFirestore().doc('config/globale').set({ abbonamentiAttivi: false }, { merge: true })
  return { ok: true }
}
