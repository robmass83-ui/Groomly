import { addDays, addMonths, addWeeks, startOfMonth, startOfWeek } from 'date-fns'
import type { Appointment } from '../types/models'
import { startOfLocalDay, sumPrice } from './appointments'
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
