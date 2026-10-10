import { parseAppointmentStatus, parseCancelReason } from '../../lib/appointments'
import { migrateStored } from '../../lib/migrate'
import type { Appointment, AppointmentPhoto, AppointmentService, AppointmentStatus, AppointmentWrite, CancelReason } from '../../types/models'
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
  cancelReason?: string
  total?: number
  actualDurationMin?: number
  tools?: string[]
  products?: string[]
  cutStyle?: string
  photos?: AppointmentPhoto[]
  end?: string
  seriesId?: string
}

function photoKind(value: unknown): AppointmentPhoto['kind'] | null {
  return value === 'prima' || value === 'dopo' || value === 'altro' ? value : null
}

function readPhotos(value: unknown): AppointmentPhoto[] | undefined {
  if (!Array.isArray(value)) return undefined
  const photos: AppointmentPhoto[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const photo = item as { id?: unknown; photo?: unknown; kind?: unknown }
    const kind = photoKind(photo.kind)
    if (typeof photo.id !== 'string' || typeof photo.photo !== 'string' || !kind) continue
    photos.push({ id: photo.id, photo: photo.photo, kind })
  }
  return photos
}

function readStrings(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.filter((item): item is string => typeof item === 'string')
}

function assignAppointmentDetails(appointment: Appointment, source: {
  total?: number
  actualDurationMin?: number
  tools?: string[]
  products?: string[]
  cutStyle?: string
  photos?: AppointmentPhoto[]
  end?: Date
  seriesId?: string
}): void {
  if (typeof source.total === 'number') appointment.total = source.total
  if (typeof source.actualDurationMin === 'number') appointment.actualDurationMin = source.actualDurationMin
  appointment.tools = source.tools ? [...source.tools] : []
  appointment.products = source.products ? [...source.products] : []
  if (source.cutStyle) appointment.cutStyle = source.cutStyle
  appointment.photos = source.photos ? source.photos.map((item) => ({ ...item })) : []
  if (source.end) appointment.end = new Date(source.end.getTime())
  if (source.seriesId) appointment.seriesId = source.seriesId
}

function toDomain(stored: StoredAppointment): Appointment {
  const appointment: Appointment = {
    id: stored.id,
    dogId: stored.dogId,
    start: new Date(stored.start),
    services: stored.services,
    status: parseAppointmentStatus(stored.status),
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
  }
  const reason = parseCancelReason(stored.cancelReason)
  if (reason && appointment.status === 'disdetto') appointment.cancelReason = reason
  const end = typeof stored.end === 'string' ? new Date(stored.end) : undefined
  assignAppointmentDetails(appointment, {
    total: stored.total,
    actualDurationMin: stored.actualDurationMin,
    tools: readStrings(stored.tools),
    products: readStrings(stored.products),
    cutStyle: typeof stored.cutStyle === 'string' ? stored.cutStyle : undefined,
    photos: readPhotos(stored.photos),
    end: end && !Number.isNaN(end.getTime()) ? end : undefined,
    seriesId: typeof stored.seriesId === 'string' ? stored.seriesId : undefined,
  })
  return appointment
}

function toStored(appointment: Appointment): StoredAppointment {
  const stored: StoredAppointment = {
    id: appointment.id,
    dogId: appointment.dogId,
    start: appointment.start.toISOString(),
    services: appointment.services,
    status: appointment.status,
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
  }
  if (appointment.cancelReason) stored.cancelReason = appointment.cancelReason
  if (typeof appointment.total === 'number') stored.total = appointment.total
  if (typeof appointment.actualDurationMin === 'number') stored.actualDurationMin = appointment.actualDurationMin
  if (appointment.tools?.length) stored.tools = [...appointment.tools]
  if (appointment.products?.length) stored.products = [...appointment.products]
  if (appointment.cutStyle) stored.cutStyle = appointment.cutStyle
  if (appointment.photos?.length) stored.photos = appointment.photos.map((item) => ({ ...item }))
  if (appointment.end) stored.end = appointment.end.toISOString()
  if (appointment.seriesId) stored.seriesId = appointment.seriesId
  return stored
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
  migrateStored(uid)
  const map = readMap(uid) ?? {}
  return sortAppointments(Object.values(map).map(toDomain))
}

function appointmentFromWrite(input: AppointmentWrite, id: string, createdAt: Date, status: AppointmentStatus): Appointment {
  const appointment: Appointment = {
    id,
    dogId: input.dogId,
    start: input.start,
    services: input.services,
    status,
    createdAt,
    updatedAt: new Date(),
    tools: [],
    products: [],
    photos: [],
  }
  if (input.seriesId) appointment.seriesId = input.seriesId
  return appointment
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
  if (typeof input.total === 'number') appointment.total = input.total
  else if (input.total !== null && previous.total !== undefined) appointment.total = previous.total
  if (previous.cancelReason) appointment.cancelReason = previous.cancelReason
  if (previous.actualDurationMin !== undefined) appointment.actualDurationMin = previous.actualDurationMin
  if (previous.tools) appointment.tools = [...previous.tools]
  if (previous.products) appointment.products = [...previous.products]
  if (previous.cutStyle) appointment.cutStyle = previous.cutStyle
  if (previous.photos) appointment.photos = previous.photos.map((item) => ({ ...item }))
  if (previous.end) appointment.end = new Date(previous.end.getTime())
  if (input.seriesId) appointment.seriesId = input.seriesId
  else if (previous.seriesId) appointment.seriesId = previous.seriesId
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

export function setAppointmentStatus(uid: string, id: string, status: AppointmentStatus, cancelReason?: CancelReason): Appointment {
  const map = readMap(uid) ?? {}
  const current = map[id]
  if (!current) throw new AppError('Appuntamento assente', 'appointment_missing')
  const previous = toDomain(current)
  const appointment: Appointment = { ...previous, status, updatedAt: new Date() }
  delete appointment.cancelReason
  if (status === 'disdetto' && cancelReason) appointment.cancelReason = cancelReason
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
