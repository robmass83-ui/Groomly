import { chiaveGiornoRoma } from './disponibilita'

// Un numero solo per tutti i documenti: quando i testi cambiano si alza qui e ognuno riaccetta una volta.
export const VERSIONE_DOCUMENTI = 2
export const DOCUMENTI_IN_VIGORE = { termini: '2', privacy: '3', dpa: '2' } as const
// Da questo giorno, a Roma, chi ha già un account riaccetta. Si cambia solo con `npm run legale:data`, insieme alle pagine.
export const RIACCETTA_DAL = '2026-12-01'
// Cosa valeva con le versioni passate: serve a chi ha ancora l'accettazione senza riga sul server.
const DOCUMENTI_PASSATI: Record<number, DocumentiAccettati> = { 1: { termini: '1.1', privacy: '2' } }

const VERSIONE_BASE = 1

export type DocumentiAccettati = { termini: string; privacy: string; dpa?: string }

export type TerminiAccount = {
  accettati: boolean
  at: string
  versione?: number
  documenti?: DocumentiAccettati
  /** La data l'ha scritta il server e c'è la riga di registro. */
  suServer?: boolean
}

export type EmailPromo = {
  attivo: boolean
  at: string
  fonte: 'tour' | 'account' | 'link'
  token?: string
}

export const FONTI_CONSENSO_METRICHE = ['tour', 'riaccettazione', 'account'] as const

export type ConsensoMetriche = {
  attivo: boolean
  at: string
  fonte: (typeof FONTI_CONSENSO_METRICHE)[number]
  versione: number
}

export function leggiConsensoMetriche(value: unknown): ConsensoMetriche | undefined {
  if (!value || typeof value !== 'object') return undefined
  const dati = value as Record<string, unknown>
  if (typeof dati.attivo !== 'boolean' || typeof dati.at !== 'string' || typeof dati.versione !== 'number') return undefined
  const fonte = FONTI_CONSENSO_METRICHE.find((voce) => voce === dati.fonte)
  return fonte ? { attivo: dati.attivo, at: dati.at, fonte, versione: dati.versione } : undefined
}

export function leggiEmailPromo(value: unknown): EmailPromo | undefined {
  if (!value || typeof value !== 'object') return undefined
  const dati = value as Record<string, unknown>
  if (typeof dati.attivo !== 'boolean' || typeof dati.at !== 'string') return undefined
  if (dati.fonte !== 'tour' && dati.fonte !== 'account' && dati.fonte !== 'link') return undefined
  return {
    attivo: dati.attivo,
    at: dati.at,
    fonte: dati.fonte,
    ...(typeof dati.token === 'string' ? { token: dati.token } : {}),
  }
}

export function leggiTermini(value: unknown): TerminiAccount | undefined {
  if (!value || typeof value !== 'object') return undefined
  const dati = value as Record<string, unknown>
  if (dati.accettati !== true || typeof dati.at !== 'string') return undefined
  return {
    accettati: true,
    at: dati.at,
    ...(typeof dati.versione === 'number' ? { versione: dati.versione } : {}),
    ...(dati.suServer === true ? { suServer: true } : {}),
  }
}

// Chi non ha una versione salvata vale come la prima: la richiesta parte solo quando il numero sale.
export function deveRiaccettare(termini: TerminiAccount | undefined, richiesta: number = VERSIONE_DOCUMENTI, adesso: Date = new Date()): boolean {
  return chiaveGiornoRoma(adesso) >= RIACCETTA_DAL && (termini?.versione ?? VERSIONE_BASE) < richiesta
}

/** Il DPA è fra il salone e Groomly: soci e collaboratori non ne sono parte. */
export function documentiPerRuolo(role: unknown, versione: number = VERSIONE_DOCUMENTI): DocumentiAccettati {
  if (versione !== VERSIONE_DOCUMENTI) return DOCUMENTI_PASSATI[versione] ?? { termini: '', privacy: '' }
  if (role === 'titolare') return DOCUMENTI_IN_VIGORE
  const { dpa: _dpa, ...resto } = DOCUMENTI_IN_VIGORE
  return resto
}

export function mancaSuServer(termini: TerminiAccount | undefined): boolean {
  return typeof termini?.versione === 'number' && termini.suServer !== true
}
