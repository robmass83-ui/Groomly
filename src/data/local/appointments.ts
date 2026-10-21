import { parseAppointmentStatus, parseCancelReason } from '../../lib/appointments'
import { appointmentKind, personalTitleOk } from '../../lib/personal'
import { migrateStored } from '../../lib/migrate'
import type { Appointment, AppointmentPhoto, AppointmentService, AppointmentStatus, AppointmentWrite, CancelReason, CycleAnchor, PaymentMethod } from '../../types/models'
import { AppError } from '../errors'
import { readJson, storageKeys, writeJson } from './storage'

interface StoredAppointment {
  id: string
  dogId?: string
  start: string
  services?: AppointmentService[]
  createdAt: string
  updatedAt: string
  status?: string
  kind?: 'pelosetto' | 'personale'
  title?: string
  plannedEnd?: string
  cancelReason?: string
  total?: number
  actualDurationMin?: number
  adjustmentNote?: string
  paymentMethod?: string
  tools?: string[]
  products?: string[]
  cutStyle?: string
  photos?: AppointmentPhoto[]
  removedPhotoIds?: string[]
  end?: string
  seriesId?: string
  cycleAnchor?: string
  coveredDue?: string
}

function readAnchor(value: unknown): CycleAnchor | undefined {
  return value === 'visita' || value === 'ritmo' ? value : undefined
}

function readCovered(value: unknown): Date | undefined {
  if (typeof value !== 'string') return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
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

function readNote(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const note = value.trim()
  return note ? note : undefined
}

function readPayment(value: unknown): PaymentMethod | undefined {
  return value === 'pos' || value === 'contanti' || value === 'na' ? value : undefined
}

function assignAppointmentDetails(appointment: Appointment, source: {
  total?: number
  actualDurationMin?: number
  adjustmentNote?: string
  paymentMethod?: PaymentMethod
  tools?: string[]
  products?: string[]
  cutStyle?: string
  photos?: AppointmentPhoto[]
  end?: Date
  seriesId?: string
}): void {
  if (typeof source.total === 'number') appointment.total = source.total
  if (typeof source.actualDurationMin === 'number') appointment.actualDurationMin = source.actualDurationMin
  if (source.adjustmentNote) appointment.adjustmentNote = source.adjustmentNote
  if (source.paymentMethod) appointment.paymentMethod = source.paymentMethod
  appointment.tools = source.tools ? [...source.tools] : []
  appointment.products = source.products ? [...source.products] : []
  if (source.cutStyle) appointment.cutStyle = source.cutStyle
  appointment.photos = source.photos ? source.photos.map((item) => ({ ...item })) : []
  if (source.end) appointment.end = new Date(source.end.getTime())
  if (source.seriesId) appointment.seriesId = source.seriesId
}

function toDomain(stored: StoredAppointment): Appointment {
  if (stored.kind === 'personale') {
    const appointment: Appointment = {
      id: stored.id,
      kind: 'personale',
      title: typeof stored.title === 'string' ? stored.title.trim() : '',
      dogId: '',
      start: new Date(stored.start),
      services: stored.services ?? [],
      status: parseAppointmentStatus(stored.status),
      createdAt: new Date(stored.createdAt),
      updatedAt: new Date(stored.updatedAt),
    }
    const plannedEnd = typeof stored.plannedEnd === 'string' ? new Date(stored.plannedEnd) : undefined
    if (plannedEnd && !Number.isNaN(plannedEnd.getTime())) appointment.plannedEnd = plannedEnd
    assignAppointmentDetails(appointment, { tools: [], products: [], photos: [] })
    return appointment
  }
  const appointment: Appointment = {
    id: stored.id,
    dogId: stored.dogId ?? '',
    start: new Date(stored.start),
    services: stored.services ?? [],
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
    adjustmentNote: readNote(stored.adjustmentNote),
    paymentMethod: readPayment(stored.paymentMethod),
    tools: readStrings(stored.tools),
    products: readStrings(stored.products),
    cutStyle: typeof stored.cutStyle === 'string' ? stored.cutStyle : undefined,
    photos: readPhotos(stored.photos),
    end: end && !Number.isNaN(end.getTime()) ? end : undefined,
    seriesId: typeof stored.seriesId === 'string' ? stored.seriesId : undefined,
  })
  const cycleAnchor = readAnchor(stored.cycleAnchor)
  if (cycleAnchor) appointment.cycleAnchor = cycleAnchor
  const coveredDue = readCovered(stored.coveredDue)
  if (coveredDue) appointment.coveredDue = coveredDue
  const removedPhotoIds = readStrings(stored.removedPhotoIds)
  if (removedPhotoIds?.length) appointment.removedPhotoIds = removedPhotoIds
  if (stored.kind === 'pelosetto') appointment.kind = 'pelosetto'
  return appointment
}

function toStored(appointment: Appointment): StoredAppointment {
  if (appointmentKind(appointment) === 'personale') {
    const stored: StoredAppointment = {
      id: appointment.id,
      kind: 'personale',
      title: (appointment.title ?? '').trim(),
      start: appointment.start.toISOString(),
      createdAt: appointment.createdAt.toISOString(),
      updatedAt: appointment.updatedAt.toISOString(),
    }
    if (appointment.plannedEnd) stored.plannedEnd = appointment.plannedEnd.toISOString()
    return stored
  }
  const stored: StoredAppointment = {
    id: appointment.id,
    dogId: appointment.dogId,
    start: appointment.start.toISOString(),
    services: appointment.services,
    status: appointment.status,
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
  }
  if (appointment.kind === 'pelosetto') stored.kind = 'pelosetto'
  if (appointment.cancelReason) stored.cancelReason = appointment.cancelReason
  if (typeof appointment.total === 'number') stored.total = appointment.total
  if (typeof appointment.actualDurationMin === 'number') stored.actualDurationMin = appointment.actualDurationMin
  const note = readNote(appointment.adjustmentNote)
  if (note) stored.adjustmentNote = note
  if (appointment.paymentMethod) stored.paymentMethod = appointment.paymentMethod
  if (appointment.tools?.length) stored.tools = [...appointment.tools]
  if (appointment.products?.length) stored.products = [...appointment.products]
  if (appointment.cutStyle) stored.cutStyle = appointment.cutStyle
  if (appointment.photos?.length) stored.photos = appointment.photos.map((item) => ({ ...item }))
  if (appointment.removedPhotoIds?.length) stored.removedPhotoIds = [...appointment.removedPhotoIds]
  if (appointment.end) stored.end = appointment.end.toISOString()
  if (appointment.seriesId) stored.seriesId = appointment.seriesId
  if (appointment.cycleAnchor) stored.cycleAnchor = appointment.cycleAnchor
  if (appointment.coveredDue) stored.coveredDue = appointment.coveredDue.toISOString()
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

function readableAppointment(stored: StoredAppointment): boolean {
  if (stored.kind !== 'personale') return true
  return personalTitleOk(typeof stored.title === 'string' ? stored.title : '')
}

export function listAppointments(uid: string): Appointment[] {
  migrateStored(uid)
  const map = readMap(uid) ?? {}
  return sortAppointments(Object.values(map).filter(readableAppointment).map(toDomain))
}

function appointmentFromWrite(input: AppointmentWrite, id: string, createdAt: Date, status: AppointmentStatus): Appointment {
  const personal = input.kind === 'personale'
  const appointment: Appointment = {
    id,
    dogId: personal ? '' : input.dogId,
    start: input.start,
    services: personal ? [] : input.services,
    status,
    createdAt,
    updatedAt: new Date(),
    tools: [],
    products: [],
    photos: [],
  }
  if (personal) {
    appointment.kind = 'personale'
    appointment.title = (input.title ?? '').trim()
    if (input.plannedEnd && !Number.isNaN(input.plannedEnd.getTime())) appointment.plannedEnd = new Date(input.plannedEnd.getTime())
    return appointment
  }
  if (input.seriesId) appointment.seriesId = input.seriesId
  if (input.cycleAnchor) appointment.cycleAnchor = input.cycleAnchor
  if (input.coveredDue) appointment.coveredDue = new Date(input.coveredDue.getTime())
  return appointment
}

export function photosPatch(previous: Appointment, photos: AppointmentPhoto[], removed: string[]): { photos: AppointmentPhoto[]; removedPhotoIds?: string[] } {
  const removedPhotoIds = [...new Set([...(previous.removedPhotoIds ?? []), ...removed])]
  return removedPhotoIds.length > 0 ? { photos, removedPhotoIds } : { photos }
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
  if (appointment.kind === 'personale') {
    const next = { ...map, [id]: toStored(appointment) }
    writeMap(uid, next)
    return appointment
  }
  if (typeof input.total === 'number') appointment.total = input.total
  else if (input.total !== null && previous.total !== undefined) appointment.total = previous.total
  if (previous.cancelReason) appointment.cancelReason = previous.cancelReason
  if (previous.actualDurationMin !== undefined) appointment.actualDurationMin = previous.actualDurationMin
  if (previous.adjustmentNote) appointment.adjustmentNote = previous.adjustmentNote
  if (previous.paymentMethod) appointment.paymentMethod = previous.paymentMethod
  if (previous.tools) appointment.tools = [...previous.tools]
  if (previous.products) appointment.products = [...previous.products]
  if (previous.cutStyle) appointment.cutStyle = previous.cutStyle
  if (previous.photos) appointment.photos = previous.photos.map((item) => ({ ...item }))
  if (previous.removedPhotoIds) appointment.removedPhotoIds = [...previous.removedPhotoIds]
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

export function saveClose(
  uid: string,
  id: string,
  patch: { total: number | null; actualDurationMin: number; adjustmentNote: string | null; paymentMethod?: PaymentMethod | null },
  complete: boolean,
): Appointment {
  const map = readMap(uid) ?? {}
  const current = map[id]
  if (!current) throw new AppError('Appuntamento assente', 'appointment_missing')
  const appointment: Appointment = { ...toDomain(current), updatedAt: new Date() }
  if (typeof patch.total === 'number') appointment.total = patch.total
  else delete appointment.total
  appointment.actualDurationMin = patch.actualDurationMin
  const note = readNote(patch.adjustmentNote)
  if (note) appointment.adjustmentNote = note
  else delete appointment.adjustmentNote
  if (patch.paymentMethod === 'pos' || patch.paymentMethod === 'contanti' || patch.paymentMethod === 'na') {
    appointment.paymentMethod = patch.paymentMethod
  } else if ('paymentMethod' in patch && patch.paymentMethod === null) {
    delete appointment.paymentMethod
  }
  if (complete) appointment.status = 'completato'
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

export function deleteAppointmentsOfDog(uid: string, dogId: string): string[] {
  const map = readMap(uid) ?? {}
  const ids = Object.values(map).filter((item) => item.dogId === dogId).map((item) => item.id)
  if (ids.length === 0) return []
  const next = { ...map }
  for (const id of ids) delete next[id]
  writeMap(uid, next)
  return ids
}

export function forgetLocalAppointments(ids: ReadonlySet<string>): void {
  if (typeof localStorage === 'undefined' || ids.size === 0) return
  const keys: string[] = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key?.startsWith('groomly.users.') && key.endsWith('.appointments')) keys.push(key)
  }
  for (const key of keys) {
    const raw = localStorage.getItem(key)
    if (!raw) continue
    try {
      const map = JSON.parse(raw) as Record<string, { id?: string }>
      if (!map || typeof map !== 'object' || Array.isArray(map)) continue
      let changed = false
      for (const id of Object.keys(map)) {
        if (!ids.has(id)) continue
        delete map[id]
        changed = true
      }
      if (changed) localStorage.setItem(key, JSON.stringify(map))
    } catch {
      continue
    }
  }
}
