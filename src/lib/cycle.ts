import { addDays, addWeeks } from 'date-fns'
import { startOfLocalDay } from './appointments'
import type { Appointment, Dog } from '../types/models'

export interface CycleRow {
  dog: Dog
  due: Date
  lastCompleted: Appointment | null
  booked: Appointment | null
  state: 'fissato' | 'da_fissare'
}

export function recurrenceWeeksOf(dog: Dog): number {
  const weeks = (dog as { recurrenceWeeks?: unknown }).recurrenceWeeks
  if (typeof weeks === 'number' && Number.isFinite(weeks)) return weeks
  return 4
}

function lastCompletedOf(dogId: string, appointments: Appointment[]): Appointment | null {
  const completed = appointments
    .filter((item) => item.dogId === dogId && item.status === 'completato')
    .sort((a, b) => b.start.getTime() - a.start.getTime() || a.id.localeCompare(b.id))
  return completed[0] ?? null
}

function bookedOf(dogId: string, appointments: Appointment[], due: Date, now: Date): Appointment | null {
  const today = startOfLocalDay(now).getTime()
  const horizon = addDays(due, 14).getTime()
  const matches = appointments
    .filter((item) =>
      item.dogId === dogId
      && item.status === 'programmato'
      && item.start.getTime() >= today
      && item.start.getTime() <= horizon,
    )
    .sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id))
  return matches[0] ?? null
}

export function cycleRow(dog: Dog, appointments: Appointment[], now: Date): CycleRow | null {
  if (dog.status !== 'attivo' || dog.clientType !== 'mensile') return null
  const lastCompleted = lastCompletedOf(dog.id, appointments)
  const due = lastCompleted ? addWeeks(lastCompleted.start, recurrenceWeeksOf(dog)) : startOfLocalDay(now)
  const booked = bookedOf(dog.id, appointments, due, now)
  return {
    dog,
    due,
    lastCompleted,
    booked,
    state: booked ? 'fissato' : 'da_fissare',
  }
}

function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

function byDueThenName(a: CycleRow, b: CycleRow): number {
  return a.due.getTime() - b.due.getTime()
    || a.dog.name.localeCompare(b.dog.name, 'it')
    || a.dog.id.localeCompare(b.dog.id)
}

function byBookedStart(a: CycleRow, b: CycleRow): number {
  const aStart = a.booked?.start.getTime() ?? 0
  const bStart = b.booked?.start.getTime() ?? 0
  return aStart - bStart || (a.booked?.id ?? '').localeCompare(b.booked?.id ?? '')
}

export function monthBoard(
  dogs: Dog[],
  appointments: Appointment[],
  month: Date,
  now: Date,
): { fissati: CycleRow[]; daFissare: CycleRow[] } {
  const opening = new Date(month.getFullYear(), month.getMonth(), 1).getTime()
  const current = sameMonth(month, now)
  const rows = dogs
    .map((dog) => cycleRow(dog, appointments, now))
    .filter((row): row is CycleRow => row !== null)
    .filter((row) => {
      if (sameMonth(row.due, month)) return true
      return current && row.state === 'da_fissare' && row.due.getTime() < opening
    })
  return {
    fissati: rows.filter((row) => row.state === 'fissato').sort(byBookedStart),
    daFissare: rows.filter((row) => row.state === 'da_fissare').sort(byDueThenName),
  }
}

export function dueSoon(dogs: Dog[], appointments: Appointment[], now: Date, daysBefore: number): CycleRow[] {
  const horizon = addDays(now, daysBefore).getTime()
  return monthBoard(dogs, appointments, now, now).daFissare.filter((row) =>
    row.due.getTime() < now.getTime() || row.due.getTime() <= horizon,
  )
}
