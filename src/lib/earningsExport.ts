import { addDays, addMonths, format, startOfMonth, startOfWeek } from 'date-fns'
import { enGB, es as esDate, it as itDate } from 'date-fns/locale'
import type { SettingsMain } from '../data/local/settings'
import type { Lingua } from '../i18n/lingua'
import { frasiReport } from '../i18n/report'
import { nomeServizioVisibile } from '../i18n/servizioVisibile'
import type { Appointment, Dog, Service } from '../types/models'
import { localDayKey, startOfLocalDay, sumDuration } from './appointments'
import { appointmentAmount, classify, paymentSplit, serviceBreakdown, type EarningsSummary, type ServiceShare } from './earnings'
export type ExportKind = 'mese' | 'anno' | 'intervallo'

export interface ExportInclude {
  riepilogo: boolean
  dettaglio: boolean
  attivita: boolean
  mancati: boolean
  pagamento?: boolean
}

export interface ExportRow {
  date: string
  time: string
  dog: string
  owner: string
  services: string
  minutes: number
  amount: number
  payment: string
  status: string
  missedAmount: number
}

export interface ExportData {
  title: string
  periodLabel: string
  business: { name: string; vatNumber: string; phone: string; address: string } | null
  incassato: number
  appuntamenti: number
  giorni: number
  media: number | null
  pagamenti: EarningsSummary['pagamenti']
  servizi: ServiceShare[]
  gruppi: { label: string; count: number; amount: number }[]
  gruppoTitolo: 'Settimana' | 'Mese'
  rows: ExportRow[]
  missed: ExportRow[]
  daChiudere: number
  generatedAt: Date
  lingua?: Lingua
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function dateOpts(lingua: Lingua) {
  const locale = lingua === 'en' ? enGB : lingua === 'es' ? esDate : itDate
  return { locale, weekStartsOn: 1 as const }
}

function shortMonth(date: Date, lingua: Lingua = 'it'): string {
  return format(date, 'MMM', dateOpts(lingua)).replace(/\.$/, '')
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase('it-IT') + text.slice(1)
}

function minutesOf(item: Appointment): number {
  if (typeof item.actualDurationMin === 'number' && item.actualDurationMin >= 0) return item.actualDurationMin
  return sumDuration(item.services)
}

function parseIsoDay(value: string | undefined): Date | null {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  return date
}

function inRange(item: Appointment, from: Date, to: Date): boolean {
  const time = item.start.getTime()
  return time >= from.getTime() && time < to.getTime()
}

function byStart(a: Appointment, b: Appointment): number {
  return a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id)
}

function csvMoney(amount: number): string {
  return amount.toFixed(2).replace('.', ',')
}

function csvMinutes(minutes: number): string {
  return Number.isInteger(minutes) ? String(minutes) : csvMoney(minutes)
}

function csvField(value: string): string {
  if (/[;"\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function weekGroups(done: Appointment[], range: { from: Date; to: Date }, lingua: Lingua = 'it'): ExportData['gruppi'] {
  const groups: ExportData['gruppi'] = []
  let start = startOfWeek(range.from, dateOpts(lingua))
  while (start.getTime() < range.to.getTime()) {
    const end = addDays(start, 7)
    const last = addDays(start, 6)
    const items = done.filter((item) => inRange(item, start, end) && inRange(item, range.from, range.to))
    const sameMonth = start.getFullYear() === last.getFullYear() && start.getMonth() === last.getMonth()
    const label = sameMonth
      ? `${start.getDate()}\u2013${last.getDate()}`
      : `${start.getDate()} ${shortMonth(start, lingua)} \u2013 ${last.getDate()} ${shortMonth(last, lingua)}`
    groups.push({
      label,
      count: items.length,
      amount: round2(items.reduce((sum, item) => sum + appointmentAmount(item), 0)),
    })
    start = end
  }
  return groups
}

function monthGroups(done: Appointment[], range: { from: Date; to: Date }, lingua: Lingua = 'it'): ExportData['gruppi'] {
  const groups: ExportData['gruppi'] = []
  let cursor = startOfMonth(range.from)
  while (cursor.getTime() < range.to.getTime()) {
    const next = addMonths(cursor, 1)
    const items = done.filter((item) => inRange(item, cursor, next) && inRange(item, range.from, range.to))
    groups.push({
      label: capitalize(format(cursor, 'MMMM yyyy', dateOpts(lingua))),
      count: items.length,
      amount: round2(items.reduce((sum, item) => sum + appointmentAmount(item), 0)),
    })
    cursor = next
  }
  return groups
}

function exportTitle(kind: ExportKind, range: { from: Date; to: Date }, lingua: Lingua = 'it'): string {
  const nome = frasiReport(lingua).titolo
  if (kind === 'anno') return `${nome} \u00B7 ${range.from.getFullYear()}`
  if (kind === 'mese') return `${nome} \u00B7 ${capitalize(format(range.from, 'MMMM yyyy', dateOpts(lingua)))}`
  const end = addDays(range.to, -1)
  const startYear = range.from.getFullYear() === end.getFullYear() ? '' : ` ${range.from.getFullYear()}`
  return `${nome} \u00B7 ${range.from.getDate()} ${shortMonth(range.from, lingua)}${startYear} \u2013 ${end.getDate()} ${shortMonth(end, lingua)} ${end.getFullYear()}`
}

function periodLabel(range: { from: Date; to: Date }): string {
  const end = addDays(range.to, -1)
  return `${format(range.from, 'dd/MM/yyyy')} - ${format(end, 'dd/MM/yyyy')}`
}

function stamp(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function dogOf(dogs: Dog[], dogId: string): Dog | undefined {
  return dogs.find((dog) => dog.id === dogId)
}

function serviceNames(item: Appointment, lingua: Lingua = 'it'): string {
  return item.services.map((line) => nomeServizioVisibile(lingua, line.name)).join(', ')
}

function completedRow(item: Appointment, dogs: Dog[], lingua: Lingua = 'it'): ExportRow {
  const dog = dogOf(dogs, item.dogId)
  return {
    date: format(item.start, 'dd/MM/yyyy'),
    time: format(item.start, 'HH:mm'),
    dog: dog?.name ?? '',
    owner: ownerName(dog),
    services: serviceNames(item, lingua),
    minutes: minutesOf(item),
    amount: appointmentAmount(item),
    payment: paymentLabel(item.paymentMethod, lingua),
    status: frasiReport(lingua).completato,
    missedAmount: 0,
  }
}

function missedRow(item: Appointment, dogs: Dog[], lingua: Lingua = 'it'): ExportRow {
  const dog = dogOf(dogs, item.dogId)
  return {
    date: format(item.start, 'dd/MM/yyyy'),
    time: format(item.start, 'HH:mm'),
    dog: dog?.name ?? '',
    owner: ownerName(dog),
    services: serviceNames(item, lingua),
    minutes: minutesOf(item),
    amount: 0,
    payment: '',
    status: item.status === 'non_venuto' ? frasiReport(lingua).nonVenuto : frasiReport(lingua).disdetto,
    missedAmount: appointmentAmount(item),
  }
}

function detailLine(row: ExportRow, missedColumn: boolean, payment: boolean): string {
  const cells = [
    row.date,
    row.time,
    row.dog,
    row.owner,
    row.services,
    csvMinutes(row.minutes),
    csvMoney(row.amount),
  ]
  if (payment) cells.push(row.payment)
  cells.push(row.status)
  if (missedColumn) cells.push(csvMoney(row.missedAmount))
  return cells.map(csvField).join(';')
}

function totalLine(amount: number, missedColumn: boolean, payment: boolean, totale: string): string {
  const cells = ['', '', '', '', '', totale, csvMoney(amount)]
  if (payment) cells.push('')
  cells.push('')
  if (missedColumn) cells.push('')
  return cells.join(';')
}

export function exportRange(kind: ExportKind, anchor: Date, custom?: { from: string; to: string }): { from: Date; to: Date; clipped: boolean } {
  if (kind === 'mese') {
    const from = startOfMonth(anchor)
    return { from, to: addMonths(from, 1), clipped: false }
  }
  if (kind === 'anno') {
    const from = new Date(anchor.getFullYear(), 0, 1)
    return { from, to: new Date(anchor.getFullYear() + 1, 0, 1), clipped: false }
  }
  const fallback = startOfLocalDay(anchor)
  let from = parseIsoDay(custom?.from) ?? fallback
  let inclusiveTo = parseIsoDay(custom?.to) ?? fallback
  if (inclusiveTo.getTime() < from.getTime()) {
    const swap = from
    from = inclusiveTo
    inclusiveTo = swap
  }
  const exclusive = addDays(inclusiveTo, 1)
  const limit = addMonths(from, 24)
  if (exclusive.getTime() > limit.getTime()) return { from, to: limit, clipped: true }
  return { from, to: exclusive, clipped: false }
}

export function filePrefix(name: string | undefined): string {
  const cleaned = (name ?? '')
    .trim()
    .replace(/ +/g, '_')
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
  return cleaned || 'Groomly'
}

export function wantsPayment(include: ExportInclude): boolean {
  return include.pagamento !== false
}

export function exportFileName(kind: ExportKind, from: Date, to: Date, formato: 'pdf' | 'csv' | 'xlsx', businessName = '', lingua: Lingua = 'it'): string {
  const prefix = filePrefix(businessName)
  const parola = frasiReport(lingua).file
  if (kind === 'anno') return `${prefix}_${parola}_${from.getFullYear()}.${formato}`
  if (kind === 'mese') return `${prefix}_${parola}_${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}.${formato}`
  return `${prefix}_${parola}_${stamp(from)}_${stamp(addDays(to, -1))}.${formato}`
}

export function ownerName(dog: Dog | undefined): string {
  if (!dog) return ''
  const contacts = dog.contacts ?? []
  const primary = contacts.find((contact) => contact.isPrimary)?.name.trim() ?? ''
  if (primary) return primary
  const first = contacts[0]?.name.trim() ?? ''
  if (first) return first
  return dog.contact?.name.trim() ?? ''
}

export function paymentLabel(method: Appointment['paymentMethod'] | undefined, lingua: Lingua = 'it'): string {
  const frasi = frasiReport(lingua)
  if (method === 'pos') return 'POS'
  if (method === 'contanti') return frasi.contanti
  if (method === 'na') return 'N/A'
  return frasi.nonIndicato
}

export function buildExportData(
  appointments: Appointment[],
  dogs: Dog[],
  services: Service[],
  settings: SettingsMain['business'],
  range: { from: Date; to: Date },
  include: ExportInclude,
  kind: ExportKind,
  now: Date,
  lingua: Lingua = 'it',
): ExportData {
  const inside = appointments.filter((item) => inRange(item, range.from, range.to))
  const done = inside.filter((item) => classify(item, now) === 'incassato').sort(byStart)
  const lost = include.mancati ? inside.filter((item) => classify(item, now) === 'perso').sort(byStart) : []
  const open = inside.filter((item) => classify(item, now) === 'da_chiudere')
  const incassato = round2(done.reduce((sum, item) => sum + appointmentAmount(item), 0))
  return {
    title: exportTitle(kind, range, lingua),
    periodLabel: periodLabel(range),
    business: include.attivita
      ? { name: settings.name, vatNumber: settings.vatNumber, phone: settings.phone, address: settings.address }
      : null,
    incassato,
    appuntamenti: done.length,
    giorni: new Set(done.map((item) => localDayKey(item.start))).size,
    media: done.length > 0 ? Math.round(incassato / done.length) : null,
    pagamenti: paymentSplit(done),
    servizi: serviceBreakdown(done, services).map((share) => ({ ...share, name: nomeServizioVisibile(lingua, share.name) })),
    gruppi: kind === 'mese' ? weekGroups(done, range, lingua) : monthGroups(done, range, lingua),
    gruppoTitolo: kind === 'mese' ? 'Settimana' : 'Mese',
    rows: done.map((item) => completedRow(item, dogs, lingua)),
    missed: lost.map((item) => missedRow(item, dogs, lingua)),
    daChiudere: open.length,
    generatedAt: now,
    lingua,
  }
}

export function toCsv(data: ExportData, include: ExportInclude): string {
  const frasi = frasiReport(data.lingua ?? 'it')
  const lines: string[] = []
  if (include.attivita && data.business) {
    lines.push(`${frasi.attivita};${csvField(data.business.name)}`)
    lines.push(`${frasi.piva};${csvField(data.business.vatNumber)}`)
    lines.push(`${frasi.periodo};${csvField(data.periodLabel)}`)
    lines.push('')
  }
  if (include.dettaglio) {
    const missedColumn = include.mancati
    const payment = wantsPayment(include)
    const head = [frasi.data, frasi.ora, frasi.cane, frasi.proprietario, frasi.servizi, frasi.durata, frasi.importo]
    if (payment) head.push(frasi.pagamento)
    head.push(frasi.stato)
    if (missedColumn) head.push(frasi.importoMancato)
    lines.push(head.join(';'))
    for (const row of data.rows) lines.push(detailLine(row, missedColumn, payment))
    if (missedColumn) {
      for (const row of data.missed) lines.push(detailLine(row, true, payment))
    }
    lines.push(totalLine(data.incassato, missedColumn, payment, frasi.totale))
  }
  if (include.riepilogo) {
    lines.push('')
    lines.push(`${frasi.servizio};${frasi.volte};${frasi.importo}`)
    for (const service of data.servizi) lines.push([csvField(service.name), String(service.count), csvMoney(service.amount)].join(';'))
    const volte = data.servizi.reduce((sum, service) => sum + service.count, 0)
    const importo = round2(data.servizi.reduce((sum, service) => sum + service.amount, 0))
    lines.push(`${frasi.totale};${volte};${csvMoney(importo)}`)
    lines.push('')
    lines.push(`${data.gruppoTitolo === 'Mese' ? frasi.mese : frasi.settimana};${frasi.app};${frasi.importo}`)
    for (const group of data.gruppi) lines.push([csvField(group.label), String(group.count), csvMoney(group.amount)].join(';'))
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`
}
