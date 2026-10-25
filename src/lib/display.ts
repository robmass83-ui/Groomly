import type { Lingua } from '../i18n/lingua'
import { t } from '../i18n/t'
import type { Appointment } from '../types/models'
import { sumDuration } from './appointments'

export function formatCompactDuration(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes))
  if (whole < 60) return `${whole}m`
  const hours = Math.floor(whole / 60)
  const rest = whole % 60
  if (rest === 0) return `${hours}h`
  return `${hours}h${String(rest).padStart(2, '0')}`
}

export function ageText(birthYear: number | undefined, categoryLabel: string, now: Date, lingua: Lingua = 'it'): string {
  if (birthYear == null) return categoryLabel
  const years = now.getFullYear() - birthYear
  return years === 1 ? t(lingua, 'etaUnAnno') : t(lingua, 'etaAnni', { n: years })
}

export function shortOwner(name: string): string {
  const parts = name.trim().split(/\s+/).filter((part) => part !== '')
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  return `${parts[0].charAt(0).toLocaleUpperCase('it-IT')}. ${parts[parts.length - 1]}`
}

export function splitCritical(note: string): { title: string; rest: string } {
  const index = note.indexOf('. ')
  if (index === -1) return { title: note, rest: '' }
  return { title: note.slice(0, index), rest: note.slice(index + 2) }
}

export function averageDuration(appointments: Appointment[], dogId: string): string {
  const recent = appointments
    .filter((item) => item.dogId === dogId && item.status === 'completato')
    .sort((a, b) => b.start.getTime() - a.start.getTime() || b.id.localeCompare(a.id))
    .slice(0, 5)
  if (recent.length === 0) return '—'
  const values = recent.map((item) => (
    item.actualDurationMin != null ? item.actualDurationMin : sumDuration(item.services)
  ))
  const mean = values.reduce((total, value) => total + value, 0) / values.length
  return formatCompactDuration(mean)
}
