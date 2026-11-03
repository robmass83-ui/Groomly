import type { Lingua } from '../i18n/lingua'
import { t } from '../i18n/t'

export type CodicePaese =
  | 'AT' | 'BE' | 'BG' | 'CY' | 'CZ' | 'DE' | 'DK' | 'EE' | 'ES' | 'FI' | 'FR' | 'GR' | 'HR' | 'HU' | 'IE' | 'IT'
  | 'LT' | 'LU' | 'LV' | 'MT' | 'NL' | 'PL' | 'PT' | 'RO' | 'SE' | 'SI' | 'SK' | 'GB' | 'CH' | 'NO' | 'ALTRO'

export const PAESI: CodicePaese[] = [
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'HU', 'IE', 'IT',
  'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK', 'GB', 'CH', 'NO', 'ALTRO',
]

export function paeseValido(valore: unknown): CodicePaese | null {
  return typeof valore === 'string' && (PAESI as string[]).includes(valore) ? (valore as CodicePaese) : null
}

export function nomePaese(lingua: Lingua, codice: CodicePaese): string {
  if (codice === 'ALTRO') return t(lingua, 'paeseAltro')
  try {
    return new Intl.DisplayNames([lingua], { type: 'region' }).of(codice) ?? codice
  } catch {
    return codice
  }
}

const FUSI: Record<string, CodicePaese> = {
  'Europe/Vienna': 'AT', 'Europe/Brussels': 'BE', 'Europe/Sofia': 'BG', 'Asia/Nicosia': 'CY', 'Asia/Famagusta': 'CY',
  'Europe/Prague': 'CZ', 'Europe/Berlin': 'DE', 'Europe/Busingen': 'DE', 'Europe/Copenhagen': 'DK', 'Europe/Tallinn': 'EE',
  'Europe/Madrid': 'ES', 'Africa/Ceuta': 'ES', 'Atlantic/Canary': 'ES', 'Europe/Helsinki': 'FI', 'Europe/Mariehamn': 'FI',
  'Europe/Paris': 'FR', 'Europe/Athens': 'GR', 'Europe/Zagreb': 'HR', 'Europe/Budapest': 'HU', 'Europe/Dublin': 'IE',
  'Europe/Rome': 'IT', 'Europe/Vilnius': 'LT', 'Europe/Luxembourg': 'LU', 'Europe/Riga': 'LV', 'Europe/Malta': 'MT',
  'Europe/Amsterdam': 'NL', 'Europe/Warsaw': 'PL', 'Europe/Lisbon': 'PT', 'Atlantic/Madeira': 'PT', 'Atlantic/Azores': 'PT',
  'Europe/Bucharest': 'RO', 'Europe/Stockholm': 'SE', 'Europe/Ljubljana': 'SI', 'Europe/Bratislava': 'SK',
  'Europe/London': 'GB', 'Europe/Zurich': 'CH', 'Europe/Oslo': 'NO',
}

export function paeseDalFuso(fuso: string | null | undefined): CodicePaese | null {
  return typeof fuso === 'string' ? FUSI[fuso] ?? null : null
}

// Formati ufficiali (struttura VIES), applicati al numero senza prefisso del paese.
const FORMATI: Record<Exclude<CodicePaese, 'ALTRO'>, RegExp> = {
  AT: /^U\d{8}$/,
  BE: /^[01]\d{9}$/,
  BG: /^\d{9,10}$/,
  CY: /^\d{8}[A-Z]$/,
  CZ: /^\d{8,10}$/,
  DE: /^\d{9}$/,
  DK: /^\d{8}$/,
  EE: /^\d{9}$/,
  ES: /^[0-9A-Z]\d{7}[0-9A-Z]$/,
  FI: /^\d{8}$/,
  FR: /^[0-9A-Z]{2}\d{9}$/,
  GR: /^\d{9}$/,
  HR: /^\d{11}$/,
  HU: /^\d{8}$/,
  IE: /^(\d{7}[A-W][A-I]?|\d[A-Z+*]\d{5}[A-W])$/,
  IT: /^\d{11}$/,
  LT: /^(\d{9}|\d{12})$/,
  LU: /^\d{8}$/,
  LV: /^\d{11}$/,
  MT: /^\d{8}$/,
  NL: /^\d{9}B\d{2}$/,
  PL: /^\d{10}$/,
  PT: /^\d{9}$/,
  RO: /^\d{2,10}$/,
  SE: /^\d{12}$/,
  SI: /^\d{8}$/,
  SK: /^\d{10}$/,
  GB: /^(\d{9}|\d{12}|GD\d{3}|HA\d{3})$/,
  // «CHE-123.456.789 MWST»: tolti i separatori e il prefisso CH resta «E123456789MWST»
  CH: /^E?\d{9}(MWST|TVA|IVA)?$/,
  NO: /^\d{9}(MVA)?$/,
}

const ESEMPI: Record<CodicePaese, string> = {
  AT: 'ATU12345678', BE: 'BE0123456789', BG: 'BG123456789', CY: 'CY12345678X', CZ: 'CZ12345678', DE: 'DE123456789',
  DK: 'DK12345678', EE: 'EE123456789', ES: 'ESX1234567X', FI: 'FI12345678', FR: 'FR12345678901', GR: 'EL123456789',
  HR: 'HR12345678901', HU: 'HU12345678', IE: 'IE1234567T', IT: '12345678901', LT: 'LT123456789', LU: 'LU12345678',
  LV: 'LV12345678901', MT: 'MT12345678', NL: 'NL123456789B01', PL: 'PL1234567890', PT: 'PT123456789', RO: 'RO1234567890',
  SE: 'SE123456789012', SI: 'SI12345678', SK: 'SK1234567890', GB: 'GB123456789', CH: 'CHE-123.456.789 MWST',
  NO: 'NO123456789MVA', ALTRO: '',
}

function prefisso(paese: CodicePaese): string {
  return paese === 'GR' ? 'EL' : paese
}

function pulito(valore: string): string {
  return valore.replace(/[\s.\-]/g, '').toUpperCase()
}

export function normalizzaIva(valore: string, paese: CodicePaese): string {
  const v = pulito(valore)
  if (paese === 'ALTRO') return v
  const p = prefisso(paese)
  return v.startsWith(p) ? v.slice(p.length) : v
}

export function erroreIva(valore: string, paese: CodicePaese): 'formato' | null {
  const v = pulito(valore)
  if (v === '' || paese === 'ALTRO') return null
  const formato = FORMATI[paese]
  // il numero intero vale anche se comincia come il prefisso (es. chiave FR che inizia per «FR»)
  return formato.test(v) || formato.test(normalizzaIva(v, paese)) ? null : 'formato'
}

export function esempioIva(paese: CodicePaese): string {
  return ESEMPI[paese]
}

export function haCodiceFiscale(paese: CodicePaese): boolean {
  return paese === 'IT'
}

const LINGUA_DEL_PAESE: Partial<Record<CodicePaese, Lingua>> = { IT: 'it', ES: 'es' }
const TERMINE_PAESE: Partial<Record<CodicePaese, 'ivaIT' | 'ivaES' | 'ivaFR'>> = { IT: 'ivaIT', ES: 'ivaES', FR: 'ivaFR' }

/** Etichetta del campo: il termine del paese da solo se è nella lingua dell'app, altrimenti «Numero IVA (termine)». */
export function etichettaIva(lingua: Lingua, paese: CodicePaese): string {
  const chiave = TERMINE_PAESE[paese]
  if (!chiave) return t(lingua, 'ivaAltro')
  const termine = t(lingua, chiave)
  return LINGUA_DEL_PAESE[paese] === lingua ? termine : `${t(lingua, 'ivaAltro')} (${termine})`
}

/** Il paese più probabile alla registrazione: quello del fuso del telefono, altrimenti l'Italia. */
export function paeseIndovinato(): CodicePaese {
  let fuso: string | undefined
  try {
    fuso = Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    fuso = undefined
  }
  return paeseDalFuso(fuso) ?? 'IT'
}

/** Il paese di una partita IVA: quello indovinato se il formato torna, poi gli altri; null se nessuno la accetta. */
export function paeseDellIva(valore: string, indovinato: CodicePaese): CodicePaese | null {
  if (pulito(valore) === '') return null
  const candidati = [indovinato, ...PAESI.filter((p) => p !== indovinato && p !== 'ALTRO')]
  return candidati.find((p) => p !== 'ALTRO' && erroreIva(valore, p) === null) ?? null
}
