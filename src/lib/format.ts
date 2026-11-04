import { type Locale } from 'date-fns'
import { de, enGB, es, fr, it } from 'date-fns/locale'
import { dataBreve, euro } from '../i18n/format'
import { LOCALE_INTL as INTL, type Lingua } from '../i18n/lingua'

const LOCALI: Record<Lingua, Locale> = { it, en: enGB, es, fr, de }

/** Locale date-fns della lingua; la settimana parte dal lunedì in tutte le lingue. */
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
