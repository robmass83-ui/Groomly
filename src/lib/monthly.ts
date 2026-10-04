import { addWeeks } from 'date-fns'
import { isStartTime, localDayKey, nextAppointment } from './appointments'
import { formatHomeDate } from './format'
import type { Appointment, Dog, Service } from '../types/models'

export interface ToBookRow {
  dog: Dog
  last: Appointment | null
  subtitle: string
}

export interface BookedRow {
  dog: Dog
  next: Appointment
  subtitle: string
}

function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function latestPast(items: Appointment[], dogId: string, now: Date): Appointment | null {
  const past = items
    .filter((item) => item.dogId === dogId && item.start.getTime() < now.getTime())
    .sort((a, b) => b.start.getTime() - a.start.getTime() || a.id.localeCompare(b.id))
  return past[0] ?? null
}

function byNameId(a: Dog, b: Dog): number {
  return a.name.localeCompare(b.name, 'it') || a.id.localeCompare(b.id)
}

function lastSubtitle(last: Appointment | null): string {
  if (!last) return 'Nessun appuntamento'
  const formatted = formatHomeDate(last.start)
  const sentence = formatted.charAt(0).toLocaleLowerCase('it-IT') + formatted.slice(1)
  return `Ultimo ${sentence}`
}

function bookedSubtitle(next: Appointment): string {
  return `${formatHomeDate(next.start)} · ${clock(next.start)}`
}

export function activeServiceIds(ids: string[], services: Service[]): string[] {
  const active = new Set(services.filter((service) => service.active).map((service) => service.id))
  return [...new Set(ids)].filter((id) => active.has(id))
}

export function suggestedVisit(
  appointments: Appointment[],
  dogId: string,
  services: Service[],
  now: Date,
): { day: string; time: string; serviceIds: string[] } {
  const source = latestPast(appointments, dogId, now)
  if (!source) return { day: localDayKey(now), time: '', serviceIds: [] }
  const serviceIds = activeServiceIds(source.services.map((line) => line.serviceId), services)
  const time = clock(source.start)
  if (!isStartTime(time)) {
    let cursor = addWeeks(source.start, 4)
    while (localDayKey(cursor) < localDayKey(now)) cursor = addWeeks(cursor, 4)
    return { day: localDayKey(cursor), time: '', serviceIds }
  }
  let cursor = addWeeks(source.start, 4)
  while (cursor.getTime() < now.getTime()) cursor = addWeeks(cursor, 4)
  return { day: localDayKey(cursor), time: clock(cursor), serviceIds }
}

export function bookHref(dogId: string, appointments: Appointment[], services: Service[], now: Date): string {
  const visit = suggestedVisit(appointments, dogId, services, now)
  const params = new URLSearchParams()
  params.set('cane', dogId)
  params.set('data', visit.day)
  if (visit.time) params.set('ora', visit.time)
  if (visit.serviceIds.length > 0) params.set('servizi', visit.serviceIds.join(','))
  params.set('da', 'mensili')
  return `/appuntamenti/nuovo?${params.toString()}`
}

export function monthlyLists(dogs: Dog[], appointments: Appointment[], now: Date): { toBook: ToBookRow[]; booked: BookedRow[] } {
  const toBook: ToBookRow[] = []
  const booked: BookedRow[] = []
  for (const dog of dogs) {
    if (dog.status !== 'attivo' || dog.clientType !== 'mensile') continue
    const next = nextAppointment(appointments, dog.id, now)
    if (next) {
      booked.push({ dog, next, subtitle: bookedSubtitle(next) })
      continue
    }
    const last = latestPast(appointments, dog.id, now)
    toBook.push({ dog, last, subtitle: lastSubtitle(last) })
  }
  toBook.sort((a, b) => {
    if (!a.last && !b.last) return byNameId(a.dog, b.dog)
    if (!a.last) return -1
    if (!b.last) return 1
    return a.last.start.getTime() - b.last.start.getTime() || byNameId(a.dog, b.dog)
  })
  booked.sort((a, b) => a.next.start.getTime() - b.next.start.getTime() || a.next.id.localeCompare(b.next.id))
  return { toBook, booked }
}

export function bannerCopy(toBook: ToBookRow[]): { title: string; names: string } | null {
  if (toBook.length === 0) return null
  const title = toBook.length === 1 ? '1 mensile da programmare' : `${toBook.length} mensili da programmare`
  return { title, names: toBook.slice(0, 3).map((row) => row.dog.name).join(', ') }
}
