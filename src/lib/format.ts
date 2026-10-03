import { format, type Locale } from 'date-fns'
import { it } from 'date-fns/locale'

export const IT_DATE: { locale: Locale; weekStartsOn: 1 } = {
  locale: it,
  weekStartsOn: 1,
}

export function formatEuro(amount: number): string {
  const whole = Math.abs(amount - Math.round(amount)) < 1e-9
  const formatted = new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return `€ ${formatted}`
}

export function formatHomeDate(date: Date): string {
  const raw = format(date, 'EEEE d MMMM', IT_DATE)
  return raw.charAt(0).toLocaleUpperCase('it-IT') + raw.slice(1)
}
