// Un numero solo per tutti i documenti: quando i testi cambiano si alza qui e ognuno riaccetta una volta.
export const VERSIONE_DOCUMENTI = 1
export const DOCUMENTI_IN_VIGORE = { termini: '1.1', privacy: '2' } as const

const VERSIONE_BASE = 1

export type TerminiAccount = {
  accettati: boolean
  at: string
  versione?: number
  documenti?: { termini: string; privacy: string }
  /** La data l'ha scritta il server e c'è la riga di registro. */
  suServer?: boolean
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
export function deveRiaccettare(termini: TerminiAccount | undefined, richiesta: number = VERSIONE_DOCUMENTI): boolean {
  return (termini?.versione ?? VERSIONE_BASE) < richiesta
}

export function mancaSuServer(termini: TerminiAccount | undefined): boolean {
  return typeof termini?.versione === 'number' && termini.suServer !== true
}
