import { addDays, addMonths, addWeeks, format, startOfMonth, startOfWeek } from 'date-fns'
import type { Appointment, Dog, Service, ServiceIconKey } from '../types/models'
import { localDayKey, startOfLocalDay, sumDuration, sumPrice } from './appointments'
import { appointmentKind } from './personal'
import { formatEuro, IT_DATE } from './format'

export type EarningsPeriod = 'giorno' | 'settimana' | 'mese'
export type EarningsClass = 'incassato' | 'previsto' | 'perso' | 'da_chiudere' | 'escluso'
export type PeriodPhase = 'passato' | 'in_corso' | 'futuro'

const STEPS = [25, 50, 100, 200, 250, 500, 1000, 2000]

export function appointmentAmount(a: Appointment): number {
  return a.total ?? sumPrice(a.services)
}

export function classify(a: Appointment, now: Date): EarningsClass {
  if (appointmentKind(a) === 'personale') return 'escluso'
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
  pagamenti: {
    pos: { importo: number; count: number }
    contanti: { importo: number; count: number }
    nonIndicato: { importo: number; count: number }
    offerti: number
  }
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

export interface ServiceShare {
  key: string
  name: string
  iconKey?: ServiceIconKey
  count: number
  amount: number
}

export function serviceBreakdown(items: Appointment[], services: Service[]): ServiceShare[] {
  const groups = new Map<string, ServiceShare>()
  for (const item of items) {
    const amount = appointmentAmount(item)
    const listed = sumPrice(item.services)
    for (const line of item.services) {
      const share = listed > 0 ? (amount * line.price) / listed : amount / item.services.length
      const catalog = services.find((entry) => entry.id === line.serviceId)
      const extra = catalog?.kind === 'extra'
      const key = extra ? 'extra' : line.serviceId
      const group = groups.get(key) ?? { key, name: extra ? 'Extra' : line.name, iconKey: extra ? undefined : catalog?.iconKey, count: 0, amount: 0 }
      group.count += 1
      group.amount += share
      groups.set(key, group)
    }
  }
  return [...groups.values()]
    .map((group) => ({ ...group, amount: round2(group.amount) }))
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'it'))
}

function serviceRows(items: Appointment[], services: Service[]): EarningsRow[] {
  return serviceBreakdown(items, services).map((group) => ({
    kind: 'servizio',
    key: group.key,
    name: group.name,
    iconKey: group.iconKey,
    count: group.count,
    amount: group.amount,
  }))
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

export function paymentSplit(done: Appointment[]): EarningsSummary['pagamenti'] {
  const pos = { importo: 0, count: 0 }
  const contanti = { importo: 0, count: 0 }
  const nonIndicato = { importo: 0, count: 0 }
  let offerti = 0
  for (const item of done) {
    if (item.paymentMethod === 'na') {
      offerti += 1
      continue
    }
    const bucket = item.paymentMethod === 'pos' ? pos : item.paymentMethod === 'contanti' ? contanti : nonIndicato
    bucket.count += 1
    bucket.importo += appointmentAmount(item)
  }
  return {
    pos: { importo: round2(pos.importo), count: pos.count },
    contanti: { importo: round2(contanti.importo), count: contanti.count },
    nonIndicato: { importo: round2(nonIndicato.importo), count: nonIndicato.count },
    offerti,
  }
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
    pagamenti: paymentSplit(done),
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

export type ReportPreset = 'mese' | 'mese_scorso' | 'tre_mesi' | 'anno' | 'scelto'

export function reportBounds(preset: ReportPreset, now: Date, chosen?: Date): { from: Date; to: Date } {
  const today = startOfLocalDay(now)
  if (preset === 'mese_scorso') {
    const from = startOfMonth(addMonths(today, -1))
    return { from, to: addMonths(from, 1) }
  }
  if (preset === 'tre_mesi') {
    const from = startOfMonth(addMonths(today, -2))
    return { from, to: addMonths(startOfMonth(today), 1) }
  }
  if (preset === 'anno') return { from: new Date(today.getFullYear(), 0, 1), to: new Date(today.getFullYear() + 1, 0, 1) }
  const anchor = preset === 'scelto' && chosen ? chosen : today
  const from = startOfMonth(anchor)
  return { from, to: addMonths(from, 1) }
}

export function reportTitle(preset: ReportPreset, bounds: { from: Date; to: Date }, now: Date): string {
  const open = periodPhase(bounds, now) === 'in_corso'
  if (preset === 'anno') return open ? `Anno ${bounds.from.getFullYear()} · fino a oggi` : `Anno ${bounds.from.getFullYear()}`
  if (preset === 'tre_mesi') {
    const last = addDays(bounds.to, -1)
    return `${shortMonth(bounds.from)} – ${shortMonth(last)} ${last.getFullYear()}`
  }
  const name = capitalize(format(bounds.from, 'MMMM yyyy', IT_DATE))
  return open ? `${name} · fino a oggi` : name
}

export function reportBadgeVisible(since: string | undefined, now: Date): boolean {
  if (!since || !/^\d{4}-\d{2}-\d{2}$/.test(since)) return false
  const [year, month, day] = since.split('-').map(Number)
  const start = new Date(year, month - 1, day)
  if (start.getFullYear() !== year || start.getMonth() !== month - 1 || start.getDate() !== day) return false
  const today = startOfLocalDay(now).getTime()
  return today >= start.getTime() && today < addDays(start, 14).getTime()
}

function earnedBetween(appointments: Appointment[], from: Date, to: Date, now: Date): number {
  return total(appointments.filter((item) => classify(item, now) === 'incassato' && inRange(item, from, to)))
}

export function spanDelta(appointments: Appointment[], from: Date, to: Date, now: Date): number | null {
  const length = to.getTime() - from.getTime()
  const previousFrom = new Date(from.getTime() - length)
  const phase = periodPhase({ from, to }, now)
  if (phase === 'futuro') return null
  let cutoff = new Date(previousFrom.getTime() + length)
  if (phase === 'in_corso') {
    const shifted = new Date(previousFrom.getTime() + Math.max(0, now.getTime() - from.getTime()))
    if (shifted.getTime() < cutoff.getTime()) cutoff = shifted
  }
  const before = earnedBetween(appointments, previousFrom, cutoff, now)
  if (before === 0) return null
  return Math.round(((earnedBetween(appointments, from, to, now) - before) / before) * 100)
}

function doneBetween(appointments: Appointment[], from: Date, to: Date, now: Date): Appointment[] {
  return appointments.filter((item) => classify(item, now) === 'incassato' && inRange(item, from, to))
}

function minutesOf(item: Appointment): number {
  if (typeof item.actualDurationMin === 'number' && item.actualDurationMin >= 0) return item.actualDurationMin
  return sumDuration(item.services)
}

function previousWindow(from: Date, to: Date, now: Date): { previousFrom: Date; previousTo: Date } {
  const length = to.getTime() - from.getTime()
  const previousFrom = new Date(from.getTime() - length)
  const phase = periodPhase({ from, to }, now)
  let previousTo = new Date(previousFrom.getTime() + length)
  if (phase === 'in_corso') {
    const shifted = new Date(previousFrom.getTime() + Math.max(0, now.getTime() - from.getTime()))
    if (shifted.getTime() < previousTo.getTime()) previousTo = shifted
  }
  return { previousFrom, previousTo }
}

function monthWindow(from: Date, now: Date): { currentTo: Date; previousFrom: Date; previousTo: Date } {
  const current = periodRange('mese', from)
  const previous = periodRange('mese', addMonths(current.from, -1))
  const phase = periodPhase(current, now)
  let previousTo = previous.to
  if (phase === 'in_corso') {
    const shifted = addMonths(now, -1)
    if (shifted.getDate() === now.getDate() && shifted.getTime() < previous.to.getTime()) previousTo = shifted
  }
  return { currentTo: current.to, previousFrom: previous.from, previousTo }
}

function mediaBetween(appointments: Appointment[], from: Date, to: Date, now: Date): number | null {
  const done = doneBetween(appointments, from, to, now)
  if (done.length === 0) return null
  return Math.round(total(done) / done.length)
}

export interface DayPoint {
  day: number
  current: number | null
  previous: number | null
}

export function cumulativeMonth(appointments: Appointment[], month: Date, now: Date): DayPoint[] {
  const from = startOfMonth(month)
  const days = new Date(from.getFullYear(), from.getMonth() + 1, 0).getDate()
  const prevFrom = addMonths(from, -1)
  const prevDays = new Date(prevFrom.getFullYear(), prevFrom.getMonth() + 1, 0).getDate()
  const today = startOfLocalDay(now).getTime()
  const points: DayPoint[] = []
  for (let day = 1; day <= days; day += 1) {
    const currentDay = new Date(from.getFullYear(), from.getMonth(), day)
    const current = currentDay.getTime() > today ? null : earnedBetween(appointments, from, addDays(currentDay, 1), now)
    const previous = day > prevDays ? null : earnedBetween(appointments, prevFrom, new Date(prevFrom.getFullYear(), prevFrom.getMonth(), day + 1), now)
    points.push({ day, current, previous })
  }
  return points
}

export function monthBars(appointments: Appointment[], from: Date, to: Date, now: Date): EarningsBucket[] {
  const bars: EarningsBucket[] = []
  let cursor = startOfMonth(from)
  while (cursor.getTime() < to.getTime()) {
    const next = addMonths(cursor, 1)
    const inside = appointments.filter((item) => inRange(item, cursor, next))
    const value = sums(inside, now)
    bars.push({
      key: format(cursor, 'yyyy-MM'),
      label: capitalize(shortMonth(cursor)),
      sublabel: '',
      title: capitalize(format(cursor, 'MMMM yyyy', IT_DATE)),
      incassato: value.incassato,
      previsto: value.previsto,
      isToday: startOfMonth(now).getTime() === cursor.getTime(),
    })
    cursor = next
  }
  if (!bars.some((bar) => bar.incassato + bar.previsto > 0)) return []
  return bars
}

export interface RangeReport {
  from: Date
  to: Date
  phase: PeriodPhase
  titolo: string
  incassato: number
  previsto: number
  persi: number
  completati: number
  inAgenda: number
  mediaACane: number | null
  euroAllOra: number | null
  minuti: number
  giorni: number
  pagamenti: EarningsSummary['pagamenti']
  confronto: { delta: number | null; etichetta: string }
  mediaDelta: number | null
  servizi: ServiceShare[]
  top: { dogId: string; name: string; amount: number }[]
  mancati: LostRow[]
  daChiudere: { count: number; importo: number }
  mesi: EarningsBucket[]
  punti: DayPoint[]
}

export function reportOf(appointments: Appointment[], dogs: Dog[], services: Service[], preset: ReportPreset, now: Date, chosen?: Date): RangeReport {
  const bounds = reportBounds(preset, now, chosen)
  const phase = periodPhase(bounds, now)
  const inside = appointments.filter((item) => inRange(item, bounds.from, bounds.to))
  const of = (kind: EarningsClass) => inside.filter((item) => classify(item, now) === kind)
  const done = of('incassato')
  const coming = of('previsto')
  const lost = of('perso')
  const open = of('da_chiudere')
  const incassato = total(done)
  const minuti = done.reduce((sum, item) => sum + minutesOf(item), 0)
  const monthPreset = preset === 'mese' || preset === 'mese_scorso' || preset === 'scelto'
  const confronto = monthPreset
    ? compare(appointments, 'mese', bounds.from, now)
    : { delta: spanDelta(appointments, bounds.from, bounds.to, now), etichetta: preset === 'tre_mesi' ? 'vs i 3 mesi prima' : 'vs anno scorso' }
  const mediaNow = done.length > 0 ? Math.round(incassato / done.length) : null
  const compared = monthPreset ? monthWindow(bounds.from, now) : previousWindow(bounds.from, bounds.to, now)
  const mediaBefore = mediaBetween(appointments, compared.previousFrom, compared.previousTo, now)
  const totals = new Map<string, number>()
  for (const item of done) totals.set(item.dogId, round2((totals.get(item.dogId) ?? 0) + appointmentAmount(item)))
  const top = [...totals.entries()]
    .map(([dogId, amount]) => ({ dogId, name: dogName(dogs, dogId), amount }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'it'))
    .slice(0, 5)
  return {
    from: bounds.from,
    to: bounds.to,
    phase,
    titolo: reportTitle(preset, bounds, now),
    incassato,
    previsto: total(coming),
    persi: total(lost),
    completati: done.length,
    inAgenda: coming.length,
    mediaACane: mediaNow,
    euroAllOra: minuti > 0 ? Math.round(incassato / (minuti / 60)) : null,
    minuti,
    giorni: new Set(done.map((item) => localDayKey(item.start))).size,
    pagamenti: paymentSplit(done),
    confronto,
    mediaDelta: mediaNow === null || mediaBefore === null ? null : mediaNow - mediaBefore,
    servizi: serviceBreakdown(done, services),
    top,
    mancati: lostRows(lost, dogs),
    daChiudere: { count: open.length, importo: total(open) },
    mesi: monthBars(appointments, bounds.from, bounds.to, now),
    punti: cumulativeMonth(appointments, bounds.from, now),
  }
}
