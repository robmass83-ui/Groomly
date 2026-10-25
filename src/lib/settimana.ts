import { formaPlurale } from '../i18n/format'
import type { Lingua } from '../i18n/lingua'
import { t } from '../i18n/t'
import type { Appointment } from '../types/models'
import { onLocalDay, sumDuration } from './appointments'
import { formatCompactDuration } from './display'
import { appointmentKind } from './personal'

export const SOGLIA_CANI_SETTIMANA = 4

export function riepilogoGiorno(appointments: Appointment[], day: Date): { cani: number; minuti: number; pieno: boolean } {
  const delGiorno = onLocalDay(appointments, day).filter((item) => {
    if (item.status === 'disdetto' || item.status === 'non_venuto') return false
    return appointmentKind(item) !== 'personale'
  })
  const minuti = delGiorno.reduce((sum, item) => sum + sumDuration(item.services), 0)
  return { cani: delGiorno.length, minuti, pieno: delGiorno.length > SOGLIA_CANI_SETTIMANA }
}

export function testoRiepilogo(lingua: Lingua, riepilogo: { cani: number; minuti: number }): string {
  if (riepilogo.cani === 0) return t(lingua, 'settimanaNessunCane')
  const cani = formaPlurale(lingua, riepilogo.cani, {
    one: t(lingua, 'settimanaCaneUno', { n: riepilogo.cani }),
    other: t(lingua, 'settimanaCaneAltri', { n: riepilogo.cani }),
  })
  if (riepilogo.minuti <= 0) return cani
  return `${cani} · ${formatCompactDuration(riepilogo.minuti)}`
}
