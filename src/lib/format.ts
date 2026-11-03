import { type Locale } from 'date-fns'
import { enGB, es, it } from 'date-fns/locale'
import { dataBreve, euro } from '../i18n/format'
import type { Lingua } from '../i18n/lingua'

const LOCALI: Record<Lingua, Locale> = { it, en: enGB, es }
const INTL: Record<Lingua, string> = { it: 'it-IT', en: 'en-GB', es: 'es-ES' }

/** Locale date-fns della lingua; la settimana parte dal lunedì in tutte e tre. */
export function opzioniDate(lingua: Lingua): { locale: Locale; weekStartsOn: 1 } {
  return { locale: LOCALI[lingua], weekStartsOn: 1 }
}

export const IT_DATE = opzioniDate('it')

export function maiuscolaIniziale(lingua: Lingua, testo: string): string {
  return testo ? testo.charAt(0).toLocaleUpperCase(INTL[lingua]) + testo.slice(1) : testo
}

export function formatEuro(amount: number): string {
  return euro('it', amount)
}

export function formatHomeDate(date: Date): string {
  return dataBreve('it', date)
}
