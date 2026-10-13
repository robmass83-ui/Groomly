import { blankSettings, type SettingsMain } from '../data/local/settings'
import {
  SERVICE_ICON_KEYS,
  type Appointment,
  type AppointmentPhoto,
  type AppointmentService,
  type AppointmentStatus,
  type Dog,
  type DogContact,
  type DogStatus,
  type GalleryPhoto,
  type Service,
  type ServiceIconKey,
  type SizeTriple,
} from '../types/models'
import { parseAppointmentStatus, parseCancelReason } from './appointments'

export function dateToMillis(value: Date): number {
  return value.getTime()
}

export function millisToDate(value: number): Date {
  return new Date(value)
}

export function storagePaths(uid: string) {
  return {
    backup: (day: string) => `users/${uid}/backups/${day}.json`,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function dateValue(value: unknown, fallback: Date): Date {
  return typeof value === 'number' && Number.isFinite(value) ? millisToDate(value) : fallback
}

function optionalDate(value: unknown): Date | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? millisToDate(value) : undefined
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function withoutSecret(record: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(record)) {
    if (value !== undefined && key !== 'passwordHash') next[key] = value
  }
  return next
}

function storedImage(value: string | undefined): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined
  if (value.startsWith('data:') && !value.startsWith('data:image/')) return undefined
  return value
}

function priceFileToDoc(file: Record<string, unknown>): Record<string, unknown> {
  const next = { ...file }
  if (typeof next.dataUrl !== 'string' || next.dataUrl.startsWith('data:')) delete next.dataUrl
  return next
}

function sizeTriple(value: unknown): SizeTriple {
  const record = isRecord(value) ? value : {}
  return {
    piccola: numberValue(record.piccola) ?? 0,
    media: numberValue(record.media) ?? 0,
    grande: numberValue(record.grande) ?? 0,
  }
}

function iconKey(value: unknown): ServiceIconKey | undefined {
  return SERVICE_ICON_KEYS.includes(value as ServiceIconKey) ? (value as ServiceIconKey) : undefined
}

export function serviceToDoc(service: Service): Record<string, unknown> {
  return withoutSecret({
    id: service.id,
    name: service.name,
    iconKey: service.iconKey,
    kind: service.kind,
    durationMin: { ...service.durationMin },
    price: { ...service.price },
    order: service.order,
    active: service.active,
    createdAt: dateToMillis(service.createdAt),
    updatedAt: dateToMillis(service.updatedAt),
  })
}

export function serviceFromDoc(id: string, data: Record<string, unknown>): Service {
  const icon = iconKey(data.iconKey)
  const service: Service = {
    id: text(data.id, id),
    name: text(data.name),
    kind: data.kind === 'extra' ? 'extra' : 'principale',
    durationMin: sizeTriple(data.durationMin),
    price: sizeTriple(data.price),
    order: numberValue(data.order) ?? 0,
    active: data.active !== false,
    createdAt: dateValue(data.createdAt, new Date()),
    updatedAt: dateValue(data.updatedAt, new Date()),
  }
  if (icon) service.iconKey = icon
  return service
}

function readContacts(value: unknown, fallback: { name: string; phone: string }): DogContact[] {
  if (!Array.isArray(value)) {
    return [{ id: 'primary', name: fallback.name, role: 'Proprietaria', phone: fallback.phone, isPrimary: true }]
  }
  const contacts: DogContact[] = []
  for (const item of value) {
    if (!isRecord(item)) continue
    contacts.push({
      id: text(item.id, 'primary'),
      name: text(item.name),
      role: text(item.role),
      phone: text(item.phone),
      isPrimary: item.isPrimary === true,
    })
  }
  if (contacts.length === 0) {
    return [{ id: 'primary', name: fallback.name, role: 'Proprietaria', phone: fallback.phone, isPrimary: true }]
  }
  return contacts
}

function readGallery(value: unknown): GalleryPhoto[] {
  if (!Array.isArray(value)) return []
  const photos: GalleryPhoto[] = []
  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.photo !== 'string') continue
    const takenAt = optionalDate(item.takenAt)
    if (!takenAt) continue
    photos.push({ id: item.id, photo: item.photo, takenAt })
  }
  return photos
}

export function dogToDoc(dog: Dog): Record<string, unknown> {
  return withoutSecret({
    id: dog.id,
    name: dog.name,
    species: dog.species,
    breed: dog.breed,
    sex: dog.sex,
    ageCategory: dog.ageCategory,
    size: dog.size,
    temperament: dog.temperament,
    clientType: dog.clientType,
    photo: storedImage(dog.photo),
    criticalNote: dog.criticalNote,
    notes: dog.notes,
    contact: { name: dog.contact.name, phone: dog.contact.phone },
    contacts: dog.contacts.map((item) => ({ ...item })),
    birthYear: dog.birthYear,
    isSenior: dog.isSenior,
    weightKg: dog.weightKg,
    tags: [...dog.tags],
    servicePrices: dog.servicePrices.map((item) => {
      const row: { serviceId: string; price?: number; durationMin?: number } = { serviceId: item.serviceId }
      if (item.price !== undefined) row.price = item.price
      if (item.durationMin !== undefined) row.durationMin = item.durationMin
      return row
    }),
    hiddenServiceIds: [...dog.hiddenServiceIds],
    customFields: dog.customFields.map((item) => ({ ...item })),
    gallery: dog.gallery.flatMap((item) => {
      const photo = storedImage(item.photo)
      if (!photo) return []
      return [{ id: item.id, photo, takenAt: dateToMillis(item.takenAt) }]
    }),
    removedPhotoIds: dog.removedPhotoIds?.length ? [...dog.removedPhotoIds] : undefined,
    recurrenceWeeks: dog.recurrenceWeeks,
    status: dog.status,
    archivedAt: dog.archivedAt ? dateToMillis(dog.archivedAt) : undefined,
    searchKey: dog.searchKey,
    createdAt: dateToMillis(dog.createdAt),
    updatedAt: dateToMillis(dog.updatedAt),
  })
}

export function dogFromDoc(id: string, data: Record<string, unknown>): Dog {
  const contact = isRecord(data.contact)
    ? { name: text(data.contact.name), phone: text(data.contact.phone) }
    : { name: '', phone: '' }
  const dog: Dog = {
    id: text(data.id, id),
    name: text(data.name),
    species: oneOf(data.species, ['cane', 'gatto', 'altro'] as const, 'cane'),
    breed: text(data.breed),
    ageCategory: oneOf(data.ageCategory, ['cucciolo', 'giovane', 'adulto', 'anziano'] as const, 'adulto'),
    size: oneOf(data.size, ['piccola', 'media', 'grande'] as const, 'media'),
    temperament: oneOf(data.temperament, ['bravo', 'agitato', 'mordace'] as const, 'bravo'),
    clientType: oneOf(data.clientType, ['mensile', 'occasionale'] as const, 'occasionale'),
    contact,
    contacts: readContacts(data.contacts, contact),
    tags: strings(data.tags),
    servicePrices: Array.isArray(data.servicePrices)
      ? data.servicePrices.flatMap((item) => {
        if (!isRecord(item) || typeof item.serviceId !== 'string') return []
        const price = numberValue(item.price)
        const durationMin = numberValue(item.durationMin)
        const row: { serviceId: string; price?: number; durationMin?: number } = { serviceId: item.serviceId }
        if (price !== undefined) row.price = price
        if (durationMin !== undefined) row.durationMin = durationMin
        return [row]
      })
      : [],
    hiddenServiceIds: strings(data.hiddenServiceIds),
    customFields: Array.isArray(data.customFields)
      ? data.customFields.flatMap((item) => {
        if (!isRecord(item) || typeof item.id !== 'string') return []
        return [{ id: item.id, label: text(item.label), value: text(item.value) }]
      })
      : [],
    gallery: readGallery(data.gallery),
    status: oneOf(data.status, ['attivo', 'non_in_cura', 'deceduto'] as const, 'attivo') as DogStatus,
    searchKey: text(data.searchKey),
    createdAt: dateValue(data.createdAt, new Date()),
    updatedAt: dateValue(data.updatedAt, new Date()),
  }
  const sex = data.sex === 'M' || data.sex === 'F' ? data.sex : undefined
  if (sex) dog.sex = sex
  if (typeof data.photo === 'string') dog.photo = data.photo
  if (typeof data.criticalNote === 'string') dog.criticalNote = data.criticalNote
  if (typeof data.notes === 'string') dog.notes = data.notes
  if (typeof data.birthYear === 'number') dog.birthYear = data.birthYear
  if (typeof data.isSenior === 'boolean') dog.isSenior = data.isSenior
  if (typeof data.weightKg === 'number') dog.weightKg = data.weightKg
  if (typeof data.recurrenceWeeks === 'number') dog.recurrenceWeeks = data.recurrenceWeeks
  const archivedAt = optionalDate(data.archivedAt)
  if (archivedAt) dog.archivedAt = archivedAt
  const removedPhotoIds = strings(data.removedPhotoIds)
  if (removedPhotoIds.length > 0) dog.removedPhotoIds = removedPhotoIds
  return dog
}

function readAppointmentServices(value: unknown): AppointmentService[] {
  if (!Array.isArray(value)) return []
  const lines: AppointmentService[] = []
  for (const item of value) {
    if (!isRecord(item) || typeof item.serviceId !== 'string') continue
    lines.push({
      serviceId: item.serviceId,
      name: text(item.name),
      durationMin: numberValue(item.durationMin) ?? 0,
      price: numberValue(item.price) ?? 0,
    })
  }
  return lines
}

function readWorkPhotos(value: unknown): AppointmentPhoto[] {
  if (!Array.isArray(value)) return []
  const photos: AppointmentPhoto[] = []
  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.photo !== 'string') continue
    const kind = item.kind === 'prima' || item.kind === 'dopo' || item.kind === 'altro' ? item.kind : null
    if (!kind) continue
    photos.push({ id: item.id, photo: item.photo, kind })
  }
  return photos
}

export function appointmentToDoc(appointment: Appointment): Record<string, unknown> {
  return withoutSecret({
    id: appointment.id,
    dogId: appointment.dogId,
    start: dateToMillis(appointment.start),
    services: appointment.services.map((line) => ({ ...line })),
    status: appointment.status,
    cancelReason: appointment.cancelReason,
    createdAt: dateToMillis(appointment.createdAt),
    updatedAt: dateToMillis(appointment.updatedAt),
    end: appointment.end ? dateToMillis(appointment.end) : undefined,
    total: appointment.total,
    actualDurationMin: appointment.actualDurationMin,
    tools: appointment.tools ? [...appointment.tools] : undefined,
    products: appointment.products ? [...appointment.products] : undefined,
    cutStyle: appointment.cutStyle,
    photos: appointment.photos?.flatMap((item) => {
      const photo = storedImage(item.photo)
      if (!photo) return []
      return [{ id: item.id, photo, kind: item.kind }]
    }),
    removedPhotoIds: appointment.removedPhotoIds?.length ? [...appointment.removedPhotoIds] : undefined,
    seriesId: appointment.seriesId,
    cycleAnchor: appointment.cycleAnchor,
    coveredDue: appointment.coveredDue ? dateToMillis(appointment.coveredDue) : undefined,
  })
}

export function appointmentFromDoc(id: string, data: Record<string, unknown>): Appointment {
  const status: AppointmentStatus = parseAppointmentStatus(data.status)
  const appointment: Appointment = {
    id: text(data.id, id),
    dogId: text(data.dogId),
    start: dateValue(data.start, new Date()),
    services: readAppointmentServices(data.services),
    status,
    createdAt: dateValue(data.createdAt, new Date()),
    updatedAt: dateValue(data.updatedAt, new Date()),
    tools: strings(data.tools),
    products: strings(data.products),
    photos: readWorkPhotos(data.photos),
  }
  const cancelReason = parseCancelReason(data.cancelReason)
  if (cancelReason && status === 'disdetto') appointment.cancelReason = cancelReason
  if (typeof data.total === 'number') appointment.total = data.total
  if (typeof data.actualDurationMin === 'number') appointment.actualDurationMin = data.actualDurationMin
  if (typeof data.cutStyle === 'string') appointment.cutStyle = data.cutStyle
  const end = optionalDate(data.end)
  if (end) appointment.end = end
  if (typeof data.seriesId === 'string') appointment.seriesId = data.seriesId
  if (data.cycleAnchor === 'visita' || data.cycleAnchor === 'ritmo') appointment.cycleAnchor = data.cycleAnchor
  const coveredDue = optionalDate(data.coveredDue)
  if (coveredDue) appointment.coveredDue = coveredDue
  const removedPhotoIds = strings(data.removedPhotoIds)
  if (removedPhotoIds.length > 0) appointment.removedPhotoIds = removedPhotoIds
  return appointment
}

export function settingsToDoc(settings: SettingsMain): Record<string, unknown> {
  const copy = JSON.parse(JSON.stringify(settings)) as Record<string, unknown>
  delete copy.passwordHash
  if (isRecord(copy.backup)) {
    const backup = { ...copy.backup }
    delete backup.snapshot
    copy.backup = backup
  }
  if (isRecord(copy.priceList)) copy.priceList = priceFileToDoc(copy.priceList)
  if (Array.isArray(copy.priceListHistory)) {
    copy.priceListHistory = copy.priceListHistory.flatMap((item) => (isRecord(item) ? [priceFileToDoc(item)] : []))
  }
  if (isRecord(copy.priceSheet) && isRecord(copy.priceSheet.intestazione)) {
    const logo = copy.priceSheet.intestazione.logo
    if (typeof logo === 'string' && logo.startsWith('data:')) delete copy.priceSheet.intestazione.logo
  }
  delete copy.theme
  return copy
}

export function settingsFromDoc(data: Record<string, unknown>): SettingsMain {
  const copy = { ...data }
  delete copy.passwordHash
  const theme = copy.theme === 'light' || copy.theme === 'dark' || copy.theme === 'auto' ? copy.theme : 'auto'
  const updatedAt = typeof copy.updatedAt === 'string' ? copy.updatedAt : new Date().toISOString()
  const base = blankSettings(theme, updatedAt)
  const existing = copy as Partial<SettingsMain>
  const backup = { ...base.backup, ...(existing.backup ?? {}) }
  delete backup.snapshot
  return {
    ...base,
    ...existing,
    theme,
    updatedAt,
    fieldLabels: { ...base.fieldLabels, ...(existing.fieldLabels ?? {}) },
    business: { ...base.business, ...(existing.business ?? {}) },
    monthlyReminder: { ...base.monthlyReminder, ...(existing.monthlyReminder ?? {}) },
    backup,
    ageThresholds: { ...base.ageThresholds, ...(existing.ageThresholds ?? {}) },
    ui: { hideAmounts: existing.ui?.hideAmounts === true },
    recentDogIds: Array.isArray(existing.recentDogIds) ? existing.recentDogIds : base.recentDogIds,
    tagSuggestions: Array.isArray(existing.tagSuggestions) ? existing.tagSuggestions : base.tagSuggestions,
    toolSuggestions: Array.isArray(existing.toolSuggestions) ? existing.toolSuggestions : base.toolSuggestions,
    productSuggestions: Array.isArray(existing.productSuggestions) ? existing.productSuggestions : base.productSuggestions,
    priceListHistory: Array.isArray(existing.priceListHistory) ? existing.priceListHistory : base.priceListHistory,
    priceList: existing.priceList ?? base.priceList,
    priceSheet: existing.priceSheet ?? base.priceSheet,
  }
}
