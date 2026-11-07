import { Capacitor } from '@capacitor/core'
import { OFFERTA_EARLY_ADOPTER } from './idAbbonamenti'

// Acquisti con Google Play tramite RevenueCat. L'SDK si carica solo con gli abbonamenti accesi, nell'app Play e con la chiave:
// con gli abbonamenti spenti non si carica nessuno script dello store.

export function compra(abbonamentiAttivi: boolean, caricaStore: () => void = () => undefined): { stato: 'spento' } | { stato: 'pronto' } {
  if (!abbonamentiAttivi) return { stato: 'spento' }
  caricaStore()
  return { stato: 'pronto' }
}

export function sondaggioDisdettaVisibile(abbonamentiAttivi: boolean): boolean {
  return abbonamentiAttivi
}

export type Distribuzione = 'play' | 'github' | 'web'
export type StatoAcquisto = 'spento' | 'solo-play' | 'non-disponibile' | 'pronto'

export function distribuzioneCorrente(nativo: boolean = Capacitor.isNativePlatform()): Distribuzione {
  if (!nativo) return 'web'
  return typeof window !== 'undefined' && window.__GROOMLY_DISTRIBUTION__ === 'play' ? 'play' : 'github'
}

export function statoAcquisto(i: { abbonamentiAttivi: boolean; distribuzione: Distribuzione; chiaveSdk: string }): StatoAcquisto {
  if (!i.abbonamentiAttivi) return 'spento'
  if (i.distribuzione !== 'play') return 'solo-play'
  if (i.chiaveSdk.trim() === '') return 'non-disponibile'
  return 'pronto'
}

// Il minimo dei tipi dell'SDK che ci serve (PurchasesOffering, PurchasesPackage, SubscriptionOption).
export type OpzioneMinima = { id: string; tags: string[] }
export type PacchettoMinimo = { identifier: string; product: { subscriptionOptions: OpzioneMinima[] | null } }
export type OfferingMinima = { availablePackages: PacchettoMinimo[] }
export type SceltaAcquisto = { tipo: 'pacchetto'; pacchetto: PacchettoMinimo } | { tipo: 'opzione'; opzione: OpzioneMinima }

export interface NegozioAbbonamenti {
  configura(apiKey: string, appUserID: string): Promise<void>
  collega(appUserID: string): Promise<void>
  offering(id: string): Promise<OfferingMinima | null>
  /** prodottoAttuale: l'abbonamento Play che il salone ha già, così Google lo sostituisce invece di affiancarlo. */
  compra(scelta: SceltaAcquisto, prodottoAttuale?: string | null): Promise<'ok'>
  ripristina(): Promise<void>
}

const PACCHETTO_MENSILE = { plus: 'plus_mensile', salone: 'salone_mensile' } as const

// L'offerta Play «early-adopter» ha idoneità decisa da noi: RevenueCat la elenca sempre, la scegliamo solo per chi ne ha diritto.
// Su Google l'id dell'opzione è «pianoBase:offerta»; in Play Console l'offerta porta anche il tag.
function eEarlyAdopter(o: OpzioneMinima): boolean {
  return o.id === OFFERTA_EARLY_ADOPTER || o.id.endsWith(`:${OFFERTA_EARLY_ADOPTER}`) || o.tags.includes(OFFERTA_EARLY_ADOPTER)
}

export function sceltaAcquisto(offering: OfferingMinima, piano: 'plus' | 'salone', earlyAdopter: boolean): SceltaAcquisto | null {
  const pacchetto = offering.availablePackages.find((p) => p.identifier === PACCHETTO_MENSILE[piano])
  if (!pacchetto) return null
  const opzione = earlyAdopter ? (pacchetto.product.subscriptionOptions ?? []).find(eEarlyAdopter) : undefined
  return opzione ? { tipo: 'opzione', opzione } : { tipo: 'pacchetto', pacchetto }
}

// Codici di PURCHASES_ERROR_CODE: 1 annullato; 5 prodotto non in vendita, 11 credenziali, 23 configurazione → «non disponibile».
const NON_DISPONIBILE = new Set(['5', '11', '23'])

export function esitoErrore(errore: unknown): 'annullato' | 'non-disponibile' | 'errore' {
  const e = errore && typeof errore === 'object' ? errore as { userCancelled?: unknown; code?: unknown } : {}
  const codice = e.code === undefined ? '' : String(e.code)
  if (e.userCancelled === true || codice === '1') return 'annullato'
  if (NON_DISPONIBILE.has(codice)) return 'non-disponibile'
  return 'errore'
}

export type EsitoAcquisto = Exclude<StatoAcquisto, 'pronto'> | 'ok' | 'annullato' | 'errore'

export type DatiNegozio = {
  abbonamentiAttivi: boolean
  chiaveSdk: string
  offeringId: string
  salonId: string
  /** L'id del salone per RevenueCat, dato dal server (callable idAcquisti): mai il salonId, che è pubblico. */
  idAcquisti: () => Promise<string>
  /** Il prodotto Play che regge il piano in corso (pro/main.rcProdotto), se c'è. */
  prodottoAttuale?: string | null
  distribuzione?: Distribuzione
  negozio?: () => Promise<NegozioAbbonamenti>
}

let collegato: { salonId: string; idUtente: string; negozio: NegozioAbbonamenti } | null = null
let inCorso: Promise<EsitoAcquisto> | null = null

export function azzeraNegozio(): void {
  collegato = null
  inCorso = null
}

async function caricaNegozio(): Promise<NegozioAbbonamenti> {
  return (await import('./negozioRevenueCat')).negozioRevenueCat()
}

// RevenueCat collegato al salone con l'id dato dal server: acquisto e ripristino valgono da ogni telefono del titolare,
// e nessuno può far arrivare un acquisto al salone di un altro scrivendone il salonId.
async function negozioPronto(d: DatiNegozio): Promise<NegozioAbbonamenti> {
  if (collegato?.salonId === d.salonId) return collegato.negozio
  const idUtente = (await d.idAcquisti()).trim()
  if (idUtente === '') throw Object.assign(new Error('id acquisti'), { code: '23' })
  if (!collegato) {
    const negozio = await (d.negozio ?? caricaNegozio)()
    await negozio.configura(d.chiaveSdk.trim(), idUtente)
    collegato = { salonId: d.salonId, idUtente, negozio }
  } else {
    await collegato.negozio.collega(idUtente)
    collegato = { ...collegato, salonId: d.salonId, idUtente }
  }
  return collegato.negozio
}

function prima(d: DatiNegozio): Exclude<StatoAcquisto, 'pronto'> | null {
  const stato = statoAcquisto({ abbonamentiAttivi: d.abbonamentiAttivi, distribuzione: d.distribuzione ?? distribuzioneCorrente(), chiaveSdk: d.chiaveSdk })
  if (stato === 'pronto' && !d.salonId) return 'non-disponibile'
  return stato === 'pronto' ? null : stato
}

// Un solo acquisto alla volta: il secondo tocco riceve l'esito del primo.
export function avviaAcquisto(d: DatiNegozio & { piano: 'plus' | 'salone'; earlyAdopter: boolean }): Promise<EsitoAcquisto> {
  const fermo = prima(d)
  if (fermo) return Promise.resolve(fermo)
  if (inCorso) return inCorso
  inCorso = (async (): Promise<EsitoAcquisto> => {
    try {
      const negozio = await negozioPronto(d)
      const offering = await negozio.offering(d.offeringId)
      const scelta = offering ? sceltaAcquisto(offering, d.piano, d.earlyAdopter) : null
      if (!scelta) return 'non-disponibile'
      return await negozio.compra(scelta, d.prodottoAttuale ?? null)
    } catch (errore) {
      return esitoErrore(errore)
    } finally {
      inCorso = null
    }
  })()
  return inCorso
}

export async function ripristinaAcquisti(d: DatiNegozio): Promise<Exclude<StatoAcquisto, 'pronto'> | 'ok' | 'errore'> {
  const fermo = prima(d)
  if (fermo) return fermo
  try {
    await (await negozioPronto(d)).ripristina()
    return 'ok'
  } catch (errore) {
    return esitoErrore(errore) === 'non-disponibile' ? 'non-disponibile' : 'errore'
  }
}
