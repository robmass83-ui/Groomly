import { addDays, addMonths, addWeeks, format, startOfMonth, startOfWeek } from 'date-fns'
import type { Appointment, Dog } from '../types/models'
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
