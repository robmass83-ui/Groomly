import { LINGUE, type Lingua } from '../i18n/lingua'
import { OFFERING_ID } from './idAbbonamenti'
import { provaConcessa, tracciaBetaDi, type ProMain } from './piano'

// Impostazioni del programma beta e dei pagamenti, nel blocco `piani` di config/globale.
// Le scrive solo la callable operatore impostaConfigPiani; mostraPiani e abbonamentiAttivi restano in radice.
export type LinguaOfferta = Lingua

export interface ConfigPiani {
  provaSelfService: boolean
  showPrezziInBeta: boolean
  offertaEarlyAdopter: Record<LinguaOfferta, string>
  // Chiave pubblica dell'SDK Android ('goog_…'): non è un segreto.
  revenueCat: { chiaveSdk: string; offeringId: string }
  annuncioPagamentiIl: string | null
  // Fase 4: data di partenza dei pagamenti scelta all'annuncio, conferma «ho Partita IVA», ultima accensione.
  // Le scrivono solo le callable degli abbonamenti, non impostaConfigPiani.
  pagamentiDal: string | null
  confermaFiscaleIl: string | null
  accesiIl: string | null
}

export type ModificheConfigPiani = Partial<{
  provaSelfService: boolean
  showPrezziInBeta: boolean
  offertaEarlyAdopter: Partial<Record<LinguaOfferta, string>>
  revenueCat: Partial<ConfigPiani['revenueCat']>
  annuncioPagamentiIl: string | null
}>

export const LINGUE_OFFERTA: readonly LinguaOfferta[] = LINGUE
export const OFFERTA_MAX = 500
export const CHIAVE_SDK_MAX = 200
export const OFFERING_ID_MAX = 100

export const CONFIG_PIANI_DEFAULT: ConfigPiani = {
  provaSelfService: false,
  showPrezziInBeta: false,
  offertaEarlyAdopter: { it: '', en: '', es: '', fr: '', de: '' },
  revenueCat: { chiaveSdk: '', offeringId: OFFERING_ID },
  annuncioPagamentiIl: null,
  pagamentiDal: null,
  confermaFiscaleIl: null,
  accesiIl: null,
}

function oggetto(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

export function dataIsoValida(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return false
  return !Number.isNaN(new Date(value).getTime())
}

export function leggiConfigPiani(globale: unknown): ConfigPiani {
  const piani = oggetto(oggetto(globale).piani)
  const offerta = oggetto(piani.offertaEarlyAdopter)
  const rc = oggetto(piani.revenueCat)
  const d = CONFIG_PIANI_DEFAULT
  const testoO = (value: unknown, ripiego: string) => (typeof value === 'string' ? value : ripiego)
  return {
    provaSelfService: piani.provaSelfService === true,
    showPrezziInBeta: piani.showPrezziInBeta === true,
    offertaEarlyAdopter: {
      it: testoO(offerta.it, d.offertaEarlyAdopter.it),
      en: testoO(offerta.en, d.offertaEarlyAdopter.en),
      es: testoO(offerta.es, d.offertaEarlyAdopter.es),
      fr: testoO(offerta.fr, d.offertaEarlyAdopter.fr),
      de: testoO(offerta.de, d.offertaEarlyAdopter.de),
    },
    revenueCat: {
      chiaveSdk: testoO(rc.chiaveSdk, d.revenueCat.chiaveSdk),
      offeringId: typeof rc.offeringId === 'string' && rc.offeringId !== '' ? rc.offeringId : d.revenueCat.offeringId,
    },
    annuncioPagamentiIl: dataIsoValida(piani.annuncioPagamentiIl) ? piani.annuncioPagamentiIl : null,
    pagamentiDal: dataIsoValida(piani.pagamentiDal) ? piani.pagamentiDal : null,
    confermaFiscaleIl: dataIsoValida(piani.confermaFiscaleIl) ? piani.confermaFiscaleIl : null,
    accesiIl: dataIsoValida(piani.accesiIl) ? piani.accesiIl : null,
  }
}

export function provaSelfServiceAccesa(globale: unknown): boolean {
  return leggiConfigPiani(globale).provaSelfService
}

// Cosa vede l'app: «Prova gratis» solo se l'operatore l'ha accesa e il salone non ha mai avuto Plus (stessa regola del server).
export function provaSelfServiceConcessa(globale: unknown, doc: ProMain | undefined, adesso: Date): boolean {
  return provaSelfServiceAccesa(globale) && provaConcessa(doc, adesso)
}

// Quello che serve alla vetrina per comprare: chiave e offering dalla config, offerta fondatori se il salone è early adopter.
export interface DatiAcquistoPiano {
  chiaveSdk: string
  offeringId: string
  earlyAdopter: boolean
  offertaEarly: Record<LinguaOfferta, string>
  pagamentiDal: string | null
}

export function datiAcquistoPiano(globale: unknown, pro: unknown): DatiAcquistoPiano {
  const piani = leggiConfigPiani(globale)
  return {
    chiaveSdk: piani.revenueCat.chiaveSdk,
    offeringId: piani.revenueCat.offeringId,
    earlyAdopter: tracciaBetaDi(pro).earlyAdopter === true,
    offertaEarly: piani.offertaEarlyAdopter,
    pagamentiDal: piani.pagamentiDal,
  }
}
