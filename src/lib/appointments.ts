import { addWeeks } from 'date-fns'
import type { Appointment, AppointmentService, AppointmentWrite, Dog, DogSize, Service } from '../types/models'
import { appointmentFormSchema, type AppointmentFormValues } from './schemas'

function buildStartTimes(): string[] {
  const times: string[] = []
  for (let minutes = 8 * 60; minutes <= 19 * 60; minutes += 15) {
    times.push(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`)
  }
  return times
}

export const START_TIMES = buildStartTimes()

export function isStartTime(value: string): boolean {
  return START_TIMES.includes(value)
}

export function sumDuration(services: { durationMin: number }[]): number {
  return services.reduce((total, line) => total + line.durationMin, 0)
}

export function sumPrice(services: { price: number }[]): number {
  return services.reduce((total, line) => total + line.price, 0)
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (rest === 0) return `${hours}h`
  return `${hours}h ${rest}`
}

const WEEKDAYS = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab']
const MONTHS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']

export function formatBookedWhen(date: Date): string {
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]} ${time}`
}

export function localDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function parseDayParam(value: string | null, now: Date): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return startOfLocalDay(now)
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return startOfLocalDay(now)
  return date
}

export function combineDayTime(day: string, time: string): Date {
  const [year, month, date] = day.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(year, month - 1, date, hours, minutes, 0, 0)
}

export function appointmentEnd(start: Date, services: { durationMin: number }[]): Date {
  return new Date(start.getTime() + sumDuration(services) * 60_000)
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd
}

export function overlapLabel(items: Appointment[], dogName: (dogId: string) => string, start: Date, end: Date, ignoreId?: string): string | null {
  const names = items
    .filter((item) => item.id !== ignoreId)
    .filter((item) => rangesOverlap(start, end, item.start, appointmentEnd(item.start, item.services)))
    .sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id))
    .map((item) => dogName(item.dogId))
  if (names.length === 0) return null
  return `Si sovrappone a ${names.join(', ')}`
}

export function onLocalDay(items: Appointment[], day: Date): Appointment[] {
  const key = localDayKey(day)
  return items.filter((item) => localDayKey(item.start) === key)
}

function byDog(items: Appointment[], dogId: string): Appointment[] {
  return items.filter((item) => item.dogId === dogId)
}

export function nextAppointment(items: Appointment[], dogId: string, now: Date): Appointment | null {
  const future = byDog(items, dogId)
    .filter((item) => item.start.getTime() >= now.getTime() && item.status !== 'completato')
    .sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id))
  return future[0] ?? null
}

export function chipSource(items: Appointment[], dogId: string, now: Date): Appointment | null {
  const upcoming = nextAppointment(items, dogId, now)
  if (upcoming) return upcoming
  const latest = byDog(items, dogId)
    .sort((a, b) => b.start.getTime() - a.start.getTime() || a.id.localeCompare(b.id))
  return latest[0] ?? null
}

export function shiftWeeks(start: Date, weeks: 2 | 4 | 6): Date {
  return addWeeks(start, weeks)
}

export function chipOpenDay(now: Date, weeks: 2 | 4 | 6): string {
  return localDayKey(addWeeks(now, weeks))
}

export function quoteServices(catalog: Service[], ids: string[], size: DogSize): AppointmentService[] | null {
  const lines: AppointmentService[] = []
  for (const id of ids) {
    const service = catalog.find((item) => item.id === id && item.active)
    if (!service) return null
    lines.push({
      serviceId: service.id,
      name: service.name,
      durationMin: service.durationMin[size],
      price: service.price[size],
    })
  }
  return lines
}

export function visibleServiceNames(names: string[]): { shown: string[]; extra: number } {
  if (names.length <= 2) return { shown: names, extra: 0 }
  return { shown: names.slice(0, 2), extra: names.length - 2 }
}

export type AppointmentField = 'dogId' | 'serviceIds' | 'day' | 'time'

export function prepareAppointmentWrite(
  values: AppointmentFormValues,
  dogs: Dog[],
  services: Service[],
  existing: Appointment | null,
): { ok: true; write: AppointmentWrite } | { ok: false; field: AppointmentField; message: string } {
  const parsed = appointmentFormSchema.safeParse(values)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const key = issue.path[0]
    const field: AppointmentField = key === 'serviceIds' || key === 'day' || key === 'time' ? key : 'dogId'
    return { ok: false, field, message: issue.message }
  }
  const dog = dogs.find((item) => item.id === parsed.data.dogId)
  const kept = existing?.dogId === parsed.data.dogId
  if (!dog || (dog.status !== 'attivo' && !kept)) return { ok: false, field: 'dogId', message: 'Scegli un cane' }
  const ordered = [...parsed.data.serviceIds].sort((a, b) => {
    const left = services.find((service) => service.id === a)?.order ?? 0
    const right = services.find((service) => service.id === b)?.order ?? 0
    return left - right
  })
  const lines = quoteServices(services, ordered, dog.size)
  if (!lines) return { ok: false, field: 'serviceIds', message: 'Scegli un servizio' }
  return {
    ok: true,
    write: { dogId: dog.id, start: combineDayTime(parsed.data.day, parsed.data.time), services: lines },
  }
}
