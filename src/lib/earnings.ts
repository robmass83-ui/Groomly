import { addDays, addMonths, addWeeks, format, startOfMonth, startOfWeek } from 'date-fns'
import type { Appointment, Dog, Service, ServiceIconKey } from '../types/models'
import { localDayKey, startOfLocalDay, sumPrice } from './appointments'
import { formatEuro, IT_DATE } from './format'

export type EarningsPeriod = 'giorno' | 'settimana' | 'mese'
export type EarningsClass = 'incassato' | 'previsto' | 'perso' | 'da_chiudere' | 'escluso'
export type PeriodPhase = 'passato' | 'in_corso' | 'futuro'

const STEPS = [25, 50, 100, 200, 250, 500, 1000, 2000]

export function appointmentAmount(a: Appointment): number {
  return a.total ?? sumPrice(a.services)
}

export function classify(a: Appointment, now: Date): EarningsClass {
  if (a.status === 'completato') return 'incassato'
  if (a.status === 'non_venuto') return 'perso'
  if (a.status === 'disdetto') return a.cancelReason === 'cliente' ? 'perso' : 'escluso'
  return startOfLocalDay(a.start).getTime() < startOfLocalDay(now).getTime() ? 'da_chiudere' : 'previsto'
}

export function periodRange(periodo: EarningsPeriod, ref: Date): { from: Date; to: Date } {
  if (periodo === 'giorno') {
    const from = startOfLocalDay(ref)
    return { from, to: addDays(from, 1) }
  }
  if (periodo === 'settimana') {
    const from = startOfWeek(ref, IT_DATE)
    return { from, to: addDays(from, 7) }
  }
  const from = startOfMonth(ref)
  return { from, to: addMonths(from, 1) }
}

export function periodPhase(range: { from: Date; to: Date }, now: Date): PeriodPhase {
  if (now.getTime() >= range.to.getTime()) return 'passato'
  if (now.getTime() < range.from.getTime()) return 'futuro'
  return 'in_corso'
}

export function shiftRef(periodo: EarningsPeriod, ref: Date, steps: number): Date {
  const day = startOfLocalDay(ref)
  if (periodo === 'giorno') return addDays(day, steps)
  if (periodo === 'settimana') return addWeeks(day, steps)
  return addMonths(day, steps)
}

export function canGoNext(periodo: EarningsPeriod, ref: Date, now: Date): boolean {
  const next = periodRange(periodo, shiftRef(periodo, ref, 1)).from
  return next.getTime() <= addWeeks(startOfLocalDay(now), 4).getTime()
}

export function parsePeriod(value: string | null): EarningsPeriod {
  return value === 'giorno' || value === 'mese' ? value : 'settimana'
}

export function niceScale(value: number): { step: number; max: number } {
  if (value <= 0) return { step: 25, max: 100 }
  let step = STEPS.find((item) => Math.ceil(value / item) <= 4)
  if (step === undefined) {
    step = 5000
    while (Math.ceil(value / step) > 4) step *= 2
  }
  return { step, max: Math.ceil(value / step) * step }
}

export function maskEuro(amount: number, hidden: boolean): string {
  return hidden ? '•••' : formatEuro(amount)
}

export function plainAmount(amount: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 }).format(amount)
}

export interface EarningsBucket {
  key: string
  label: string
  sublabel: string
  title: string
  incassato: number
  previsto: number
  isToday: boolean
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase('it-IT') + text.slice(1)
}

function shortMonth(date: Date): string {
  return format(date, 'MMM', IT_DATE).replace(/\.$/, '')
}

function inRange(a: Appointment, from: Date, to: Date): boolean {
  const time = a.start.getTime()
  return time >= from.getTime() && time < to.getTime()
}

function total(items: Appointment[]): number {
  return round2(items.reduce((sum, item) => sum + appointmentAmount(item), 0))
}

function sums(items: Appointment[], now: Date): { incassato: number; previsto: number } {
  return {
    incassato: total(items.filter((item) => classify(item, now) === 'incassato')),
    previsto: total(items.filter((item) => classify(item, now) === 'previsto')),
  }
}

export function dogName(dogs: Dog[], dogId: string): string {
  return dogs.find((dog) => dog.id === dogId)?.name ?? 'Cane'
}

export function hourKey(day: Date, hour: number): string {
  return `${localDayKey(day)}T${String(hour).padStart(2, '0')}`
}

export function buckets(appointments: Appointment[], dogs: Dog[], periodo: EarningsPeriod, ref: Date, now: Date): EarningsBucket[] {
  const { from, to } = periodRange(periodo, ref)
  const counted = appointments
    .filter((item) => inRange(item, from, to))
    .filter((item) => {
      const kind = classify(item, now)
      return kind === 'incassato' || kind === 'previsto'
    })
  if (periodo === 'giorno') {
    const hours = [...new Set(counted.map((item) => item.start.getHours()))].sort((a, b) => a - b)
    return hours.map((hour) => {
      const items = counted.filter((item) => item.start.getHours() === hour)
      const who = items.length === 1 ? dogName(dogs, items[0].dogId) : `${items.length} appuntamenti`
      return { key: hourKey(from, hour), label: String(hour), sublabel: '', title: `Ore ${hour} · ${who}`, ...sums(items, now), isToday: false }
    })
  }
  if (periodo === 'settimana') {
    const days = Array.from({ length: 7 }, (_, index) => addDays(from, index))
    return days
      .filter((day, index) => index < 6 || counted.some((item) => localDayKey(item.start) === localDayKey(day)))
      .map((day) => {
        const items = counted.filter((item) => localDayKey(item.start) === localDayKey(day))
        const today = localDayKey(day) === localDayKey(now)
        return {
          key: localDayKey(day),
          label: capitalize(format(day, 'EEE', IT_DATE)),
          sublabel: String(day.getDate()),
          title: `${capitalize(format(day, 'EEEE d', IT_DATE))}${today ? ' · oggi' : ''}`,
          ...sums(items, now),
          isToday: today,
        }
      })
  }
  const weeks: EarningsBucket[] = []
  let start = from
  let index = 1
  while (start.getTime() < to.getTime()) {
    const monday = startOfWeek(addDays(start, 7), IT_DATE)
    const end = monday.getTime() < to.getTime() ? monday : to
    const last = addDays(end, -1)
    const single = start.getDate() === last.getDate()
    const items = counted.filter((item) => inRange(item, start, end))
    weeks.push({
      key: `${localDayKey(start)}_${localDayKey(last)}`,
      label: single ? String(start.getDate()) : `${start.getDate()}–${last.getDate()}`,
      sublabel: `sett. ${index}`,
      title: single ? `${start.getDate()} ${format(last, 'MMMM', IT_DATE)}` : `${start.getDate()} – ${last.getDate()} ${format(last, 'MMMM', IT_DATE)}`,
      ...sums(items, now),
      isToday: now.getTime() >= start.getTime() && now.getTime() < end.getTime(),
    })
    start = end
    index += 1
  }
  return weeks
}

export function periodTitle(periodo: EarningsPeriod, ref: Date, now: Date): string {
  const { from, to } = periodRange(periodo, ref)
  if (periodo === 'giorno') {
    const text = format(from, 'EEE d MMMM', IT_DATE)
    return localDayKey(from) === localDayKey(now) ? `Oggi · ${text}` : capitalize(text)
  }
  if (periodo === 'settimana') {
    const last = addDays(to, -1)
    if (from.getMonth() === last.getMonth()) return `${from.getDate()} – ${last.getDate()} ${format(last, 'MMMM', IT_DATE)}`
    return `${from.getDate()} ${shortMonth(from)} – ${last.getDate()} ${shortMonth(last)}`
  }
  return capitalize(format(from, 'MMMM yyyy', IT_DATE))
}

function previousRef(periodo: EarningsPeriod, from: Date): Date {
  return periodo === 'mese' ? addMonths(from, -1) : addWeeks(from, -1)
}

function compareLabel(periodo: EarningsPeriod, previousFrom: Date): string {
  if (periodo === 'giorno') return `vs ${format(previousFrom, 'EEE', IT_DATE)} ${previousFrom.getDay() === 0 ? 'scorsa' : 'scorso'}`
  if (periodo === 'settimana') return 'vs sett. scorsa'
  return `vs ${format(previousFrom, 'MMMM', IT_DATE)}`
}

export function compare(appointments: Appointment[], periodo: EarningsPeriod, ref: Date, now: Date): { delta: number | null; etichetta: string } {
  const current = periodRange(periodo, ref)
  const previous = periodRange(periodo, previousRef(periodo, current.from))
  const etichetta = compareLabel(periodo, previous.from)
  const phase = periodPhase(current, now)
  if (phase === 'futuro') return { delta: null, etichetta }
  let cutoff = previous.to
  if (phase === 'in_corso') {
    const shifted = previousRef(periodo, now)
    const clamped = periodo === 'mese' && shifted.getDate() !== now.getDate()
    if (!clamped && shifted.getTime() < previous.to.getTime()) cutoff = shifted
  }
  const earned = (from: Date, to: Date) => total(appointments.filter((item) => classify(item, now) === 'incassato' && inRange(item, from, to)))
  const before = earned(previous.from, cutoff)
  if (before === 0) return { delta: null, etichetta }
  return { delta: Math.round(((earned(current.from, current.to) - before) / before) * 100), etichetta }
}

export interface Money {
  incassato: number
  previsto: number
  persi: number
}

export type RowState = 'completato' | 'previsto' | 'non venuto' | 'disdetto' | 'da chiudere'

export type EarningsRow =
  | { kind: 'appuntamento'; key: string; bucketKey: string; appointmentId: string; time: string; dogName: string; services: string; state: RowState; amount: number }
  | { kind: 'giorno'; key: string; bucketKey: string; day: string; title: string; detail: string; amount: number; muted: boolean }
  | { kind: 'servizio'; key: string; name: string; iconKey?: ServiceIconKey; count: number; amount: number }

export interface LostRow {
  key: string
  appointmentId: string
  dogName: string
  when: string
  reason: 'non venuto' | 'disdetto dal cliente'
  amount: number
}

export interface EarningsSummary {
  periodo: EarningsPeriod
  from: Date
  to: Date
  phase: PeriodPhase
  titolo: string
  totali: Money
  completati: number
  totaliAppuntamenti: number
  mediaACane: number | null
  daChiudere: { count: number; importo: number }
  confronto: { delta: number | null; etichetta: string }
  buckets: EarningsBucket[]
  mediaBarre: number | null
  scala: { step: number; max: number }
  elenco: { titolo: string; righe: EarningsRow[] }
  persi: LostRow[]
  selezione: string | null
}

function byStart(a: Appointment, b: Appointment): number {
  return a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id)
}

function rowState(a: Appointment, now: Date): RowState {
  const kind = classify(a, now)
  if (kind === 'incassato') return 'completato'
  if (kind === 'previsto') return 'previsto'
  if (kind === 'da_chiudere') return 'da chiudere'
  return a.status === 'non_venuto' ? 'non venuto' : 'disdetto'
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

function appointmentRows(items: Appointment[], dogs: Dog[], now: Date): EarningsRow[] {
  return items
    .filter((item) => classify(item, now) !== 'escluso')
    .sort(byStart)
    .map((item) => ({
      kind: 'appuntamento',
      key: item.id,
      bucketKey: hourKey(item.start, item.start.getHours()),
      appointmentId: item.id,
      time: format(item.start, 'HH:mm'),
      dogName: dogName(dogs, item.dogId),
      services: item.services.map((line) => line.name).join(', '),
      state: rowState(item, now),
      amount: appointmentAmount(item),
    }))
}

function dayRows(items: Appointment[], from: Date, now: Date): EarningsRow[] {
  return Array.from({ length: 7 }, (_, index) => addDays(from, index)).flatMap((day): EarningsRow[] => {
    const key = localDayKey(day)
    const own = items.filter((item) => localDayKey(item.start) === key)
    const done = own.filter((item) => classify(item, now) === 'incassato')
    const coming = own.filter((item) => classify(item, now) === 'previsto')
    if (done.length === 0 && coming.length === 0) return []
    const detail = [
      done.length > 0 ? plural(done.length, 'completato', 'completati') : '',
      coming.length > 0 ? plural(coming.length, 'previsto', 'previsti') : '',
    ].filter(Boolean).join(' · ')
    const earned = total(done)
    return [{
      kind: 'giorno',
      key,
      bucketKey: key,
      day: key,
      title: capitalize(format(day, 'EEEE d', IT_DATE)),
      detail,
      amount: earned > 0 ? earned : total(coming),
      muted: earned === 0,
    }]
  })
}

function serviceRows(items: Appointment[], services: Service[]): EarningsRow[] {
  const groups = new Map<string, { name: string; iconKey?: ServiceIconKey; count: number; amount: number }>()
  for (const item of items) {
    const amount = appointmentAmount(item)
    const listed = sumPrice(item.services)
    for (const line of item.services) {
      const share = listed > 0 ? (amount * line.price) / listed : amount / item.services.length
      const catalog = services.find((entry) => entry.id === line.serviceId)
      const extra = catalog?.kind === 'extra'
      const key = extra ? 'extra' : line.serviceId
      const group = groups.get(key) ?? { name: extra ? 'Extra' : line.name, iconKey: extra ? undefined : catalog?.iconKey, count: 0, amount: 0 }
      group.count += 1
      group.amount += share
      groups.set(key, group)
    }
  }
  return [...groups.entries()]
    .map(([key, group]): EarningsRow => ({ kind: 'servizio', key, name: group.name, iconKey: group.iconKey, count: group.count, amount: round2(group.amount) }))
    .sort((a, b) => b.amount - a.amount || (a.kind === 'servizio' && b.kind === 'servizio' ? a.name.localeCompare(b.name, 'it') : 0))
}

function lostRows(items: Appointment[], dogs: Dog[]): LostRow[] {
  return [...items].sort(byStart).map((item) => ({
    key: item.id,
    appointmentId: item.id,
    dogName: dogName(dogs, item.dogId),
    when: `${format(item.start, 'EEE d', IT_DATE)} ${shortMonth(item.start)}`,
    reason: item.status === 'non_venuto' ? 'non venuto' : 'disdetto dal cliente',
    amount: appointmentAmount(item),
  }))
}

function defaultSelection(periodo: EarningsPeriod, phase: PeriodPhase, list: EarningsBucket[]): string | null {
  if (list.length === 0) return null
  if (phase === 'in_corso') {
    if (periodo === 'giorno') return [...list].reverse().find((item) => item.incassato > 0)?.key ?? list[0].key
    return list.find((item) => item.isToday)?.key ?? list[0].key
  }
  if (phase === 'passato') return list.reduce((best, item) => (item.incassato > best.incassato ? item : best), list[0]).key
  return list[0].key
}

function listTitle(periodo: EarningsPeriod, from: Date, now: Date): string {
  if (periodo === 'settimana') return 'Per giorno'
  if (periodo === 'mese') return 'Per servizio'
  return localDayKey(from) === localDayKey(now) ? 'Appuntamenti di oggi' : `Appuntamenti di ${format(from, 'EEE d', IT_DATE)}`
}

export function summarize(appointments: Appointment[], dogs: Dog[], services: Service[], periodo: EarningsPeriod, ref: Date, now: Date): EarningsSummary {
  const range = periodRange(periodo, ref)
  const phase = periodPhase(range, now)
  const inside = appointments.filter((item) => inRange(item, range.from, range.to))
  const of = (kind: EarningsClass) => inside.filter((item) => classify(item, now) === kind)
  const done = of('incassato')
  const coming = of('previsto')
  const lost = of('perso')
  const open = of('da_chiudere')
  const drawn = buckets(appointments, dogs, periodo, ref, now)
  const list = drawn.some((item) => item.incassato + item.previsto > 0) ? drawn : []
  const earning = list.filter((item) => item.incassato > 0)
  const righe = periodo === 'giorno' ? appointmentRows(inside, dogs, now) : periodo === 'settimana' ? dayRows(inside, range.from, now) : serviceRows(done, services)
  return {
    periodo,
    from: range.from,
    to: range.to,
    phase,
    titolo: periodTitle(periodo, ref, now),
    totali: { incassato: total(done), previsto: total(coming), persi: total(lost) },
    completati: done.length,
    totaliAppuntamenti: done.length + coming.length,
    mediaACane: done.length > 0 ? Math.round(total(done) / done.length) : null,
    daChiudere: { count: open.length, importo: total(open) },
    confronto: compare(appointments, periodo, ref, now),
    buckets: list,
    mediaBarre: earning.length > 0 ? Math.round(earning.reduce((sum, item) => sum + item.incassato, 0) / earning.length) : null,
    scala: niceScale(Math.max(0, ...list.map((item) => item.incassato + item.previsto))),
    elenco: { titolo: listTitle(periodo, range.from, now), righe },
    persi: lostRows(lost, dogs),
    selezione: defaultSelection(periodo, phase, list),
  }
}

export function earnedOn(appointments: Appointment[], day: Date, now: Date): number {
  const { from, to } = periodRange('giorno', day)
  return total(appointments.filter((item) => classify(item, now) === 'incassato' && inRange(item, from, to)))
}
