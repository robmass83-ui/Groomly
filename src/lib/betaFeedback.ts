import type { FeatureKey } from './piano'

// Feedback dei beta tester: betaFeedback/{autoId}, scritto solo dalla callable inviaFeedbackBeta, letto solo dagli operatori.
export type GiudizioFunzione = 'utile' | 'poco-utile' | 'non-usata'
export type Pagheresti = 'si' | 'forse' | 'no'
export type FasciaPrezzo = 'meno-5' | '5-10' | '10-20' | 'piu-20'

export interface FeedbackBeta {
  salonId: string
  uid: string
  piano: 'pro' | 'salone'
  voto: 1 | 2 | 3 | 4 | 5
  funzioni: Partial<Record<FeatureKey, GiudizioFunzione>>
  nonVa: string
  manca: string
  pagheresti: Pagheresti
  quanto: FasciaPrezzo | null
  ricontatto: boolean
  fineBeta: boolean
  versioneApp: string
  creatoIl: string
}

export const GIUDIZI_FUNZIONE: readonly GiudizioFunzione[] = ['utile', 'poco-utile', 'non-usata']
export const PAGHERESTI: readonly Pagheresti[] = ['si', 'forse', 'no']
export const FASCE_PREZZO: readonly FasciaPrezzo[] = ['meno-5', '5-10', '10-20', 'piu-20']
export const TESTO_FEEDBACK_MAX = 1000
export const LIMITE_FEEDBACK_GIORNO = 5
