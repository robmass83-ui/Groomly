import { addDays, startOfWeek } from 'date-fns'
import type { Appointment, Dog } from '../types/models'
import { sumDuration } from './appointments'
import { IT_DATE } from './format'

export type CalendarVista = 'giorno' | 'settimana' | 'mese'

export function parseVista(value: string | null): CalendarVista {
  if (value === 'giorno' || value === 'settimana' || value === 'mese') return value
  return 'giorno'
}

export function weekDays(selected: Date): Date[] {
  const start = startOfWeek(selected, { weekStartsOn: IT_DATE.weekStartsOn })
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

export function blockTone(
  clientType: 'mensile' | 'occasionale',
  iconKeys: Array<string | undefined>,
): 'warn' | 'sen' | 'tea' | 'pri' {
  if (clientType === 'mensile') return 'warn'
  if (iconKeys.includes('bagno_taglio')) return 'sen'
  if (iconKeys.includes('dermatologico') || iconKeys.includes('antiparassitario')) return 'tea'
  return 'pri'
}

export function daySummary(dogs: Dog[], appointments: Appointment[]): { dogs: number; minutes: number; mordaci: number } {
  const ids = new Set(appointments.map((item) => item.dogId))
  const byId = new Map(dogs.map((dog) => [dog.id, dog]))
  let mordaci = 0
  for (const id of ids) {
    if (byId.get(id)?.temperament === 'mordace') mordaci += 1
  }
  const minutes = appointments.reduce((total, item) => total + sumDuration(item.services), 0)
  return { dogs: ids.size, minutes, mordaci }
}

export function snapQuarter(date: Date): Date {
  const total = date.getHours() * 60 + date.getMinutes()
  let snapped = Math.round(total / 15) * 15
  const earliest = 8 * 60
  const latest = 19 * 60
  if (snapped < earliest) snapped = earliest
  if (snapped > latest) snapped = latest
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, snapped, 0, 0)
}
