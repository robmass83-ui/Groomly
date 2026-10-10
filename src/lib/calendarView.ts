import { addDays, addMonths, startOfWeek } from 'date-fns'
import type { Appointment, Dog } from '../types/models'
import { sumDuration } from './appointments'
import { IT_DATE } from './format'

export type CalendarVista = 'giorno' | 'settimana' | 'mese'

export function parseVista(value: string | null): CalendarVista {
  if (value === 'giorno' || value === 'settimana' || value === 'mese') return value
  return 'giorno'
}

export function shiftCalendar(vista: CalendarVista, day: Date, delta: number): Date {
  if (vista === 'settimana') return addDays(day, delta * 7)
  if (vista === 'mese') return addMonths(day, delta)
  return addDays(day, delta)
}

export function daySwipe(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy)) return 0
  return dx < 0 ? 1 : -1
}

const WEEK_SLIVER = 34
const WEEK_GAP = 4

export function weekCardLayout(fullWidths: number[], rowWidth: number): boolean[] {
  const count = fullWidths.length
  if (count === 0) return []
  if (fullWidths[0] > rowWidth) return fullWidths.map((_, index) => index === 0)
  const cost = (fullCount: number) => {
    let width = 0
    for (let index = 0; index < count; index += 1) {
      width += index < fullCount ? fullWidths[index] : WEEK_SLIVER
      if (index > 0) width += WEEK_GAP
    }
    return width
  }
  let fullCount = 0
  for (let candidate = count; candidate >= 0; candidate -= 1) {
    if (cost(candidate) <= rowWidth) {
      fullCount = candidate
      break
    }
  }
  if (fullCount === 0) return fullWidths.map((_, index) => index === 0)
  return fullWidths.map((_, index) => index < fullCount)
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

function clockMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60 + date.getMilliseconds() / 60_000
}

export function placeAppointments(
  items: { id: string; start: Date; durationMin: number }[],
): { id: string; column: number; columnCount: number }[] {
  const sorted = items
    .map((item, order) => {
      const startMs = item.start.getTime()
      const minutes = item.durationMin === 0 ? 15 : item.durationMin
      return { id: item.id, order, startMs, endMs: startMs + minutes * 60_000, column: 0, columnCount: 0 }
    })
    .sort((left, right) => {
      const byStart = left.startMs - right.startMs
      if (byStart !== 0) return byStart
      return left.id.localeCompare(right.id)
    })

  let clusterFrom = 0
  let clusterMaxEnd = Number.NEGATIVE_INFINITY
  let columnEnds: number[] = []

  const finishCluster = (until: number) => {
    const columnCount = columnEnds.length
    for (let index = clusterFrom; index < until; index += 1) sorted[index].columnCount = columnCount
  }

  for (let index = 0; index < sorted.length; index += 1) {
    const item = sorted[index]
    if (index > 0 && item.startMs >= clusterMaxEnd) {
      finishCluster(index)
      clusterFrom = index
      columnEnds = []
      clusterMaxEnd = Number.NEGATIVE_INFINITY
    }
    let column = columnEnds.findIndex((end) => end <= item.startMs)
    if (column < 0) {
      column = columnEnds.length
      columnEnds.push(item.endMs)
    } else {
      columnEnds[column] = item.endMs
    }
    if (item.endMs > clusterMaxEnd) clusterMaxEnd = item.endMs
    item.column = column
  }

  if (sorted.length > 0) finishCluster(sorted.length)
  return [...sorted]
    .sort((left, right) => left.order - right.order)
    .map(({ id, column, columnCount }) => ({ id, column, columnCount }))
}

export function gridBounds(spans: { start: Date; end: Date }[]): { startHour: number; endHour: number } {
  let startHour = 8
  let endHour = 19
  for (const span of spans) {
    if (clockMinutes(span.start) < startHour * 60) startHour = span.start.getHours()
    const endMinutes = clockMinutes(span.end)
    if (endMinutes > endHour * 60) {
      const partial =
        span.end.getMinutes() !== 0 || span.end.getSeconds() !== 0 || span.end.getMilliseconds() !== 0
      const edge = partial ? span.end.getHours() + 1 : span.end.getHours()
      if (edge > endHour) endHour = edge
    }
  }
  return { startHour, endHour }
}

export function openingScroll({
  isToday,
  now,
  startHour,
  endHour,
  hourHeight,
  viewportHeight,
}: {
  isToday: boolean
  now: Date
  startHour: number
  endHour: number
  hourHeight: number
  viewportHeight: number
}): number {
  const contentHeight = (endHour - startHour) * hourHeight
  const max = Math.max(0, contentHeight - viewportHeight)
  const clamp = (value: number) => Math.min(max, Math.max(0, value))
  if (!isToday) return clamp((8 - startHour) * hourHeight)
  const nowMinutes = clockMinutes(now)
  if (nowMinutes < startHour * 60) return 0
  if (nowMinutes > endHour * 60) return max
  const lineY = ((nowMinutes - startHour * 60) / 60) * hourHeight
  return clamp(lineY - viewportHeight / 3)
}

export function offHourCounts(
  spans: { start: Date; end: Date }[],
  startHour: number,
  endHour: number,
): { before: number; after: number } {
  let before = 0
  let after = 0
  for (const span of spans) {
    if (clockMinutes(span.start) < startHour * 60) before += 1
    if (clockMinutes(span.end) > endHour * 60) after += 1
  }
  return { before, after }
}

export function monthCellFace(input: {
  count: number
  selected: boolean
  today: boolean
  inMonth: boolean
  weekend: boolean
}): { background: string; color: string; fontWeight: number; boxShadow?: string; badge: string | null; badgeHalo: boolean } {
  const has = input.count > 0
  const face: { background: string; color: string; fontWeight: number; boxShadow?: string; badge: string | null; badgeHalo: boolean } = {
    background: 'transparent',
    color: input.inMonth ? 'var(--tx)' : 'var(--tx3)',
    fontWeight: 600,
    badge: has ? String(input.count) : null,
    badgeHalo: input.selected && has,
  }
  if (input.weekend && !input.selected && !(has && input.inMonth)) face.background = 'var(--surf)'
  if (has && input.inMonth && !input.selected) {
    face.background = 'var(--ok-s)'
    face.color = 'var(--ok)'
    face.fontWeight = 800
  }
  if (input.selected) {
    face.background = 'var(--pri-solid)'
    face.color = '#fff'
    if (has) face.fontWeight = 800
  } else if (input.today) {
    face.boxShadow = 'inset 0 0 0 2px var(--pri)'
  }
  return face
}
