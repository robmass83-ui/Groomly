import { type Locale } from 'date-fns'
import { it } from 'date-fns/locale'
import { dataBreve, euro } from '../i18n/format'

export const IT_DATE: { locale: Locale; weekStartsOn: 1 } = {
  locale: it,
  weekStartsOn: 1,
}

export function formatEuro(amount: number): string {
  return euro('it', amount)
}

export function formatHomeDate(date: Date): string {
  return dataBreve('it', date)
}
