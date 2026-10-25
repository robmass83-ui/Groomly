import type { Lingua } from '../i18n/lingua'
import { t } from '../i18n/t'

const MASCHILI_IN_A = new Set(['andrea', 'luca', 'nicola', 'elia', 'mattia', 'battista', 'gianluca'])

/** Valori salvati in italiano. In pagina si mostra `etichettaRuolo`. */
export const RUOLI_BASE = ['Proprietaria', 'Co-proprietario', 'Figlia'] as const

/** Il ruolo resta in italiano nei dati: qui si traduce solo ciò che si legge. */
export function etichettaRuolo(ruolo: string, lingua: Lingua): string {
  if (ruolo === 'Proprietario') return t(lingua, 'schedaProprietario')
  if (ruolo === 'Proprietaria') return t(lingua, 'schedaProprietaria')
  if (ruolo === 'Co-proprietario') return t(lingua, 'schedaCoProprietario')
  if (ruolo === 'Figlia') return t(lingua, 'schedaFiglia')
  return ruolo
}

/** Il nome non basta a scegliere il sesso: il femminile solo se il primo nome lo indica. */
export function ruoloDelProprietario(nome: string): 'Proprietario' | 'Proprietaria' {
  const primo = nome.trim().split(/\s+/)[0]?.toLocaleLowerCase('it') ?? ''
  if (primo.endsWith('a') && !MASCHILI_IN_A.has(primo)) return 'Proprietaria'
  return 'Proprietario'
}
