import { format } from 'date-fns'
import { enGB, es, it } from 'date-fns/locale'
import type { Lingua } from './lingua'

const locali = { it, en: enGB, es }
const intl = { it: 'it-IT', en: 'en-GB', es: 'es-ES' } as const

function corpoEuro(lingua: Lingua, importo: number): string {
  const negativo = importo < 0
  const assoluto = Math.abs(importo)
  const intero = Math.abs(assoluto - Math.round(assoluto)) < 1e-9
  const [parteIntera, decimali] = assoluto.toFixed(intero ? 0 : 2).split('.')
  const migliaia = lingua === 'en' ? ',' : '.'
  const raggruppato = parteIntera.replace(/\B(?=(\d{3})+(?!\d))/g, migliaia)
  const testo = intero ? raggruppato : `${raggruppato}${lingua === 'en' ? '.' : ','}${decimali}`
  return negativo ? `-${testo}` : testo
}

export function euro(lingua: Lingua, importo: number): string {
  const formatted = corpoEuro(lingua, importo)
  if (lingua === 'es') return `${formatted} €`
  if (lingua === 'en') return `€${formatted}`
  return `€ ${formatted}`
}

export function meseCorto(lingua: Lingua, data: Date): string {
  return format(data, 'MMM', { locale: locali[lingua] }).replace(/\.$/, '')
}

export function dataCorta(lingua: Lingua, data: Date): string {
  const raw = format(data, 'd MMM', { locale: locali[lingua], weekStartsOn: 1 })
  return lingua === 'it' ? raw : raw.replace(/\.$/, '')
}

export function meseAnno(lingua: Lingua, data: Date): string {
  const raw = format(data, 'MMMM yyyy', { locale: locali[lingua], weekStartsOn: 1 })
  return raw.charAt(0).toLocaleUpperCase(intl[lingua]) + raw.slice(1)
}

export function dataBreve(lingua: Lingua, data: Date): string {
  const raw = format(data, 'EEEE d MMMM', { locale: locali[lingua], weekStartsOn: 1 })
  return raw.charAt(0).toLocaleUpperCase(intl[lingua]) + raw.slice(1)
}

export function dataConOra(lingua: Lingua, data: Date): string {
  const giorno = dataBreve(lingua, data)
  const ora = format(data, 'HH:mm')
  if (lingua === 'en') return `${giorno} at ${ora}`
  if (lingua === 'es') return `${giorno} a las ${ora}`
  return `${giorno} alle ${ora}`
}

export function dataEstesa(lingua: Lingua, data: Date): string {
  if (lingua === 'es') return format(data, "d 'de' MMMM 'de' yyyy", { locale: es, weekStartsOn: 1 })
  return format(data, 'd MMMM yyyy', { locale: locali[lingua], weekStartsOn: 1 })
}

export function confrontaNomi(lingua: Lingua, a: string, b: string): number {
  return new Intl.Collator(intl[lingua]).compare(a, b)
}

/** 0 = domenica, come `Date.getDay()`. */
export function giornoCorto(lingua: Lingua, domenicaZero: number): string {
  const data = new Date(2026, 9, 25 + domenicaZero)
  const raw = format(data, 'EEE', { locale: locali[lingua], weekStartsOn: 1 }).replace(/\.$/, '')
  return raw.charAt(0).toLocaleUpperCase(intl[lingua]) + raw.slice(1)
}

export function formaPlurale(lingua: Lingua, n: number, forme: Record<string, string>): string {
  const scelta = new Intl.PluralRules(intl[lingua]).select(n)
  return forme[scelta] ?? forme.other ?? ''
}
