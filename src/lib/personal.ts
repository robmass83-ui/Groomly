import { localDayKey } from './appointments'

export function appointmentKind(appointment: { kind?: 'pelosetto' | 'personale' }): 'pelosetto' | 'personale' {
  return appointment.kind === 'personale' ? 'personale' : 'pelosetto'
}

export function personalTitleOk(title: string): boolean {
  const trimmed = title.trim()
  return trimmed.length >= 1 && trimmed.length <= 60
}

export function personalEndOk(start: Date, plannedEnd: Date | null): boolean {
  if (plannedEnd === null) return true
  return localDayKey(start) === localDayKey(plannedEnd) && plannedEnd.getTime() > start.getTime()
}

export function personalPlaceMinutes(start: Date, plannedEnd: Date | null): number {
  if (plannedEnd === null) return 15
  return Math.round((plannedEnd.getTime() - start.getTime()) / 60_000)
}
