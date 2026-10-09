import type { Appointment, AppointmentService, AppointmentStatus, AppointmentWrite } from '../../types/models'
import { AppError } from '../errors'
import { readJson, storageKeys, writeJson } from './storage'

interface StoredAppointment {
  id: string
  dogId: string
  start: string
  services: AppointmentService[]
  createdAt: string
  updatedAt: string
  status?: string
}

function appointmentStatus(value: unknown): AppointmentStatus {
  return value === 'programmato' || value === 'completato' ? value : 'programmato'
}

function toDomain(stored: StoredAppointment): Appointment {
  return {
    id: stored.id,
    dogId: stored.dogId,
    start: new Date(stored.start),
    services: stored.services,
    status: appointmentStatus(stored.status),
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
  }
}

function toStored(appointment: Appointment): StoredAppointment {
  return {
    id: appointment.id,
    dogId: appointment.dogId,
    start: appointment.start.toISOString(),
    services: appointment.services,
    status: appointment.status,
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
  }
}

function readMap(uid: string): Record<string, StoredAppointment> | null {
  return readJson<Record<string, StoredAppointment>>(storageKeys.appointments(uid))
}

function writeMap(uid: string, map: Record<string, StoredAppointment>): void {
  writeJson(storageKeys.appointments(uid), map)
}

function sortAppointments(items: Appointment[]): Appointment[] {
  return items.sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id))
}

export function listAppointments(uid: string): Appointment[] {
  const map = readMap(uid) ?? {}
  return sortAppointments(Object.values(map).map(toDomain))
}

function appointmentFromWrite(input: AppointmentWrite, id: string, createdAt: Date, status: AppointmentStatus): Appointment {
  return {
    id,
    dogId: input.dogId,
    start: input.start,
    services: input.services,
    status,
    createdAt,
    updatedAt: new Date(),
  }
}

export function createAppointment(uid: string, input: AppointmentWrite): Appointment {
  const map = readMap(uid) ?? {}
  const now = new Date()
  const appointment = appointmentFromWrite(input, crypto.randomUUID(), now, 'programmato')
  appointment.updatedAt = now
  const next = { ...map, [appointment.id]: toStored(appointment) }
  writeMap(uid, next)
  return appointment
}

export function updateAppointment(uid: string, id: string, input: AppointmentWrite): Appointment {
  const map = readMap(uid) ?? {}
  const current = map[id]
  if (!current) throw new AppError('Appuntamento assente', 'appointment_missing')
  const previous = toDomain(current)
  const appointment = appointmentFromWrite(input, id, previous.createdAt, previous.status)
  const next = { ...map, [id]: toStored(appointment) }
  writeMap(uid, next)
  return appointment
}

export function completeAppointment(uid: string, id: string): Appointment {
  const map = readMap(uid) ?? {}
  const current = map[id]
  if (!current) throw new AppError('Appuntamento assente', 'appointment_missing')
  const previous = toDomain(current)
  const appointment = { ...previous, status: 'completato' as const, updatedAt: new Date() }
  writeMap(uid, { ...map, [id]: toStored(appointment) })
  return appointment
}

export function deleteAppointment(uid: string, id: string): void {
  const map = readMap(uid) ?? {}
  if (!map[id]) throw new AppError('Appuntamento assente', 'appointment_missing')
  const next = { ...map }
  delete next[id]
  writeMap(uid, next)
}
