import { addDays, addWeeks, format } from 'date-fns'
import { startOfLocalDay } from './appointments'
import { IT_DATE } from './format'
import type { Appointment, Dog } from '../types/models'

export type MonthlyGroup = 'in_ritardo' | 'in_scadenza' | 'nuovo' | 'fissato'

export interface MonthlyRow {
  dog: Dog
  due: Date | null
  lastCompleted: Appointment | null
  booked: Appointment | null
  late: boolean
  group: MonthlyGroup
}

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

function futureProgrammed(dogId: string, appointments: Appointment[], now: Date): Appointment[] {
  const today = startOfLocalDay(now).getTime()
  return appointments
    .filter((item) =>
      item.dogId === dogId
      && item.status === 'programmato'
      && startOfLocalDay(item.start).getTime() >= today,
    )
    .sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id))
}

function bookedOf(dogId: string, appointments: Appointment[], now: Date): Appointment | null {
  return futureProgrammed(dogId, appointments, now)[0] ?? null
}

function safeWeeks(weeks: number): number {
  return Number.isInteger(weeks) && weeks >= 1 ? weeks : 4
}

function stepPast(from: Date, weeks: number, visit: Date): Date {
  let cursor = addWeeks(from, weeks)
  const day = startOfLocalDay(visit).getTime()
  while (startOfLocalDay(cursor).getTime() <= day) cursor = addWeeks(cursor, weeks)
  return cursor
}

export function nextDueAfter(appointment: Appointment, weeks: number): Date {
  const safe = safeWeeks(weeks)
  if (appointment.cycleAnchor === 'ritmo' && appointment.coveredDue) {
    return stepPast(appointment.coveredDue, safe, appointment.start)
  }
  return addWeeks(appointment.start, safe)
}

export function openDue(
  dog: Dog,
  appointments: Appointment[],
  now: Date,
  weeks: number,
  ignoreId?: string,
): Date | null {
  if (dog.status !== 'attivo' || dog.clientType !== 'mensile') return null
  const last = lastCompletedOf(dog.id, appointments)
  if (!last) return null
  const safe = safeWeeks(weeks)
  let slot = nextDueAfter(last, safe)
  const ahead = futureProgrammed(dog.id, appointments, now).filter((item) => item.id !== ignoreId)
  for (const item of ahead) slot = nextDueAfter(item, safe)
  return slot
}

export function rhythmChoice(
  dog: Dog,
  appointments: Appointment[],
  now: Date,
  start: Date,
  weeks: number,
  ignoreId?: string,
): { coveredDue: Date; visitaOn: Date; ritmoOn: Date } | null {
  const coveredDue = openDue(dog, appointments, now, weeks, ignoreId)
  if (!coveredDue) return null
  if (startOfLocalDay(start).getTime() === startOfLocalDay(coveredDue).getTime()) return null
  const safe = safeWeeks(weeks)
  const visitaOn = addWeeks(start, safe)
  const ritmoOn = stepPast(coveredDue, safe, start)
  if (startOfLocalDay(visitaOn).getTime() === startOfLocalDay(ritmoOn).getTime()) return null
  return { coveredDue, visitaOn, ritmoOn }
}

export function rhythmQuestion(weeks: number, start: Date, coveredDue: Date): string {
  const when = (date: Date) => format(date, 'd MMM', IT_DATE)
  const tail = safeWeeks(weeks) === 1
    ? 'Da dove riparte la settimana?'
    : `Da dove ripartono le ${safeWeeks(weeks)} settimane?`
  return `Il ${when(start)} non è la scadenza del ${when(coveredDue)}. ${tail}`
}

export function fissatoVisible(visit: Date, viewedMonth: Date, now: Date): boolean {
  const viewed = new Date(viewedMonth.getFullYear(), viewedMonth.getMonth(), 1)
  const current = new Date(now.getFullYear(), now.getMonth(), 1)
  const next = new Date(current.getFullYear(), current.getMonth() + 1, 1)
  const visitMonth = new Date(visit.getFullYear(), visit.getMonth(), 1)
  if (visitMonth.getTime() === viewed.getTime()) return true
  return viewed.getTime() === current.getTime() && visitMonth.getTime() > next.getTime()
}

export interface UnbookedRow {
  dog: Dog
  due: Date
  kind: 'manca' | 'prossimo'
  upcoming: Appointment | null
  lastCompleted: Appointment | null
}

export function unbookedMonthly(dogs: Dog[], appointments: Appointment[], now: Date): UnbookedRow[] {
  const rows: UnbookedRow[] = []
  for (const dog of dogs) {
    if (dog.status !== 'attivo' || dog.clientType !== 'mensile') continue
    const ahead = futureProgrammed(dog.id, appointments, now)
    const lastCompleted = lastCompletedOf(dog.id, appointments)
    const weeks = recurrenceWeeksOf(dog)
    if (ahead.length >= 1) continue
    rows.push({
      dog,
      due: lastCompleted ? nextDueAfter(lastCompleted, weeks) : startOfLocalDay(now),
      kind: 'manca',
      upcoming: null,
      lastCompleted,
    })
  }
  rows.sort((a, b) => a.due.getTime() - b.due.getTime()
    || a.dog.name.localeCompare(b.dog.name, 'it')
    || a.dog.id.localeCompare(b.dog.id))
  return rows
}

function openGroup(due: Date, now: Date, daysBefore: number): 'in_ritardo' | 'in_scadenza' | null {
  const dueDay = startOfLocalDay(due).getTime()
  const today = startOfLocalDay(now).getTime()
  if (dueDay < today) return 'in_ritardo'
  if (dueDay <= startOfLocalDay(addDays(now, daysBefore)).getTime()) return 'in_scadenza'
  return null
}

export function monthlyStatus(dog: Dog, appointments: Appointment[], now: Date, daysBefore: number): MonthlyRow | null {
  if (dog.status !== 'attivo' || dog.clientType !== 'mensile') return null
  const lastCompleted = lastCompletedOf(dog.id, appointments)
  const booked = bookedOf(dog.id, appointments, now)
  if (!lastCompleted) {
    if (booked) {
      return { dog, due: null, lastCompleted: null, booked, late: false, group: 'fissato' }
    }
    return { dog, due: null, lastCompleted: null, booked: null, late: false, group: 'nuovo' }
  }
  const weeks = recurrenceWeeksOf(dog)
  const due = nextDueAfter(lastCompleted, weeks)
  if (booked) {
    const anchor = booked.coveredDue ?? openDue(dog, appointments, now, weeks, booked.id) ?? due
    return {
      dog,
      due: anchor,
      lastCompleted,
      booked,
      late: booked.start.getTime() > addDays(anchor, 14).getTime(),
      group: 'fissato',
    }
  }
  const group = openGroup(due, now, daysBefore)
  if (!group) return null
  return { dog, due, lastCompleted, booked: null, late: false, group }
}

export function cycleRow(dog: Dog, appointments: Appointment[], now: Date): CycleRow | null {
  if (dog.status !== 'attivo' || dog.clientType !== 'mensile') return null
  const lastCompleted = lastCompletedOf(dog.id, appointments)
  const due = lastCompleted ? nextDueAfter(lastCompleted, recurrenceWeeksOf(dog)) : startOfLocalDay(now)
  const booked = bookedOf(dog.id, appointments, now)
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

export function dueSoon(dogs: Dog[], appointments: Appointment[], now: Date, daysBefore: number): MonthlyRow[] {
  const open = dogs
    .map((dog) => monthlyStatus(dog, appointments, now, daysBefore))
    .filter((row): row is MonthlyRow & { due: Date } =>
      row !== null && row.due !== null && (row.group === 'in_ritardo' || row.group === 'in_scadenza'),
    )
  return open
    .sort((a, b) => (a.due?.getTime() ?? 0) - (b.due?.getTime() ?? 0)
      || a.dog.name.localeCompare(b.dog.name, 'it')
      || a.dog.id.localeCompare(b.dog.id))
}
