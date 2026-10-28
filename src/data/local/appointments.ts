import { appointmentEnd, parseAppointmentStatus, parseCancelReason, sumDuration } from '../../lib/appointments'
import { appointmentKind, personalTitleOk } from '../../lib/personal'
import { migrateStored } from '../../lib/migrate'
import type { Appointment, AppointmentPhoto, AppointmentService, AppointmentStatus, AppointmentWrite, CancelReason, CycleAnchor, DogExtraNote, PaymentMethod } from '../../types/models'
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
  chiusoIl?: string
  seriesId?: string
  cycleAnchor?: string
  coveredDue?: string
  extraNotes?: { id: string; text: string; createdAt: string }[]
  assigneeUid?: string
  provvisorio?: boolean
  scadeIl?: string
  richiestaId?: string
  ospiteNome?: string
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

function testoPresente(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function assignProvisional(appointment: Appointment, source: {
  provvisorio?: boolean
  scadeIl?: unknown
  richiestaId?: unknown
  ospiteNome?: unknown
}): void {
  if (source.provvisorio === true) appointment.provvisorio = true
  const scadeIl = testoPresente(source.scadeIl)
  if (scadeIl) appointment.scadeIl = scadeIl
  const richiestaId = testoPresente(source.richiestaId)
  if (richiestaId) appointment.richiestaId = richiestaId
  const ospiteNome = testoPresente(source.ospiteNome)
  if (ospiteNome) appointment.ospiteNome = ospiteNome
}

function keepProvisional(appointment: Appointment, input: AppointmentWrite, previous: Appointment): void {
  if (input.provvisorio === false) delete appointment.provvisorio
  else if (input.provvisorio !== true && previous.provvisorio === true) appointment.provvisorio = true
  keepText(appointment, 'scadeIl', input.scadeIl, previous.scadeIl)
  keepText(appointment, 'richiestaId', input.richiestaId, previous.richiestaId)
  keepText(appointment, 'ospiteNome', input.ospiteNome, previous.ospiteNome)
}

function keepText(
  appointment: Appointment,
  key: 'scadeIl' | 'richiestaId' | 'ospiteNome',
  written: string | undefined,
  previous: string | undefined,
): void {
  if (written === undefined) {
    const kept = testoPresente(previous)
    if (kept) appointment[key] = kept
    return
  }
  const next = testoPresente(written)
  if (next) appointment[key] = next
  else delete appointment[key]
}

function readPayment(value: unknown): PaymentMethod | undefined {
  return value === 'pos' || value === 'contanti' || value === 'na' ? value : undefined
}

function readAssignee(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

function assignAssignee(appointment: Appointment, value: unknown): void {
  const assigneeUid = readAssignee(value)
  if (assigneeUid) appointment.assigneeUid = assigneeUid
}

function copyExtraNotes(notes: DogExtraNote[] | undefined): DogExtraNote[] | undefined {
  if (!notes) return undefined
  return notes.map((item) => ({ id: item.id, text: item.text, createdAt: new Date(item.createdAt) }))
}

function extraNotesFromStored(notes: unknown): DogExtraNote[] | undefined {
  if (!Array.isArray(notes)) return undefined
  const kept: DogExtraNote[] = []
  for (const item of notes) {
    if (!item || typeof item !== 'object') continue
    const row = item as { id?: unknown; text?: unknown; createdAt?: unknown }
    if (typeof row.id !== 'string' || row.id.length === 0) continue
    if (typeof row.text !== 'string' || !(row.text.trim().length > 0)) continue
    if (typeof row.createdAt !== 'string') continue
    const createdAt = new Date(row.createdAt)
    if (Number.isNaN(createdAt.getTime())) continue
    kept.push({ id: row.id, text: row.text, createdAt })
  }
  return kept.length > 0 ? kept : undefined
}

function extraNotesFromWrite(notes: DogExtraNote[]): DogExtraNote[] | undefined {
  const kept: DogExtraNote[] = []
  for (const item of notes) {
    if (typeof item.id !== 'string' || item.id.length === 0) continue
    if (typeof item.text !== 'string' || !(item.text.trim().length > 0)) continue
    const createdAt = new Date(item.createdAt)
    if (Number.isNaN(createdAt.getTime())) continue
    kept.push({ id: item.id, text: item.text, createdAt })
  }
  return kept.length > 0 ? kept : undefined
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
    assignAssignee(appointment, stored.assigneeUid)
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
  const chiusoIl = typeof stored.chiusoIl === 'string' ? new Date(stored.chiusoIl) : undefined
  if (chiusoIl && !Number.isNaN(chiusoIl.getTime())) appointment.chiusoIl = chiusoIl
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
  const extraNotes = extraNotesFromStored(stored.extraNotes)
  if (extraNotes) appointment.extraNotes = extraNotes
  assignAssignee(appointment, stored.assigneeUid)
  assignProvisional(appointment, stored)
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
    const assigneeUid = readAssignee(appointment.assigneeUid)
    if (assigneeUid) stored.assigneeUid = assigneeUid
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
  if (appointment.chiusoIl) stored.chiusoIl = appointment.chiusoIl.toISOString()
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
  if (appointment.extraNotes?.length) {
    stored.extraNotes = appointment.extraNotes.map((item) => ({
      id: item.id,
      text: item.text,
      createdAt: item.createdAt.toISOString(),
    }))
  }
  if (appointment.provvisorio === true) stored.provvisorio = true
  const scadeIl = testoPresente(appointment.scadeIl)
  if (scadeIl) stored.scadeIl = scadeIl
  const richiestaId = testoPresente(appointment.richiestaId)
  if (richiestaId) stored.richiestaId = richiestaId
  const ospiteNome = testoPresente(appointment.ospiteNome)
  if (ospiteNome) stored.ospiteNome = ospiteNome
  const assigneeUid = readAssignee(appointment.assigneeUid)
  if (assigneeUid) stored.assigneeUid = assigneeUid
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

function fineDaTenere(
  start: Date,
  services: { durationMin: number }[],
  previous: { start: Date; end?: Date; services: { durationMin: number }[] },
): Date {
  const calcolata = appointmentEnd(start, services)
  if (!previous.end) return calcolata
  if (sumDuration(services) !== sumDuration(previous.services)) return calcolata
  if (start.getTime() === previous.start.getTime()) return new Date(previous.end.getTime())
  return new Date(start.getTime() + (previous.end.getTime() - previous.start.getTime()))
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
    assignAssignee(appointment, input.assigneeUid)
    return appointment
  }
  if (input.seriesId) appointment.seriesId = input.seriesId
  if (input.cycleAnchor) appointment.cycleAnchor = input.cycleAnchor
  if (input.coveredDue) appointment.coveredDue = new Date(input.coveredDue.getTime())
  if (Array.isArray(input.extraNotes)) {
    const extraNotes = extraNotesFromWrite(input.extraNotes)
    if (extraNotes) appointment.extraNotes = extraNotes
  }
  assignProvisional(appointment, input)
  assignAssignee(appointment, input.assigneeUid)
  appointment.end = appointmentEnd(appointment.start, appointment.services)
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
  if (input.assigneeUid === undefined && previous.assigneeUid) appointment.assigneeUid = previous.assigneeUid
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
  appointment.end = fineDaTenere(appointment.start, appointment.services, previous)
  if (previous.chiusoIl) appointment.chiusoIl = new Date(previous.chiusoIl.getTime())
  if (input.seriesId) appointment.seriesId = input.seriesId
  else if (previous.seriesId) appointment.seriesId = previous.seriesId
  if (input.extraNotes === undefined && previous.extraNotes) {
    appointment.extraNotes = copyExtraNotes(previous.extraNotes)
  }
  keepProvisional(appointment, input, previous)
  const next = { ...map, [id]: toStored(appointment) }
  writeMap(uid, next)
  return appointment
}

export function completeAppointment(uid: string, id: string): Appointment {
  const map = readMap(uid) ?? {}
  const current = map[id]
  if (!current) throw new AppError('Appuntamento assente', 'appointment_missing')
  const previous = toDomain(current)
  const adesso = new Date()
  const appointment = { ...previous, status: 'completato' as const, updatedAt: adesso, chiusoIl: previous.chiusoIl ?? adesso }
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
  if (complete) {
    appointment.status = 'completato'
    appointment.chiusoIl = appointment.chiusoIl ?? appointment.updatedAt
  }
  writeMap(uid, { ...map, [id]: toStored(appointment) })
  return appointment
}

export function setAppointmentStatus(uid: string, id: string, status: AppointmentStatus, cancelReason?: CancelReason): Appointment {
  const map = readMap(uid) ?? {}
  const current = map[id]
  if (!current) throw new AppError('Appuntamento assente', 'appointment_missing')
  const previous = toDomain(current)
  const adesso = new Date()
  const appointment: Appointment = { ...previous, status, updatedAt: adesso }
  if (status === 'completato') appointment.chiusoIl = previous.chiusoIl ?? adesso
  else delete appointment.chiusoIl
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
