import type { Appointment, Dog, DogContact, Service } from '../../types/models'
import { withIsolatedJsonKey } from '../local/storage'

export function withLocalKey<T>(key: string, seed: unknown, run: () => T): T {
  return withIsolatedJsonKey(key, seed, run)
}

function writtenOwner(contacts: DogContact[], fallback: { name: string; phone: string }): { name: string; phone: string } {
  const chosen = contacts.find((contact) => contact.isPrimary) ?? contacts[0]
  if (!chosen) return { name: fallback.name, phone: fallback.phone }
  return { name: chosen.name, phone: chosen.phone }
}

function dogToLocal(dog: Dog): Record<string, unknown> {
  const stored: Record<string, unknown> = {
    id: dog.id,
    name: dog.name,
    species: dog.species,
    breed: dog.breed,
    ageCategory: dog.ageCategory,
    size: dog.size,
    temperament: dog.temperament,
    clientType: dog.clientType,
    contact: writtenOwner(dog.contacts, dog.contact),
    contacts: dog.contacts.map((item) => ({ ...item })),
    tags: [...dog.tags],
    servicePrices: dog.servicePrices.map((item) => ({ ...item })),
    hiddenServiceIds: [...dog.hiddenServiceIds],
    customFields: dog.customFields.map((item) => ({ ...item })),
    gallery: dog.gallery.map((item) => ({
      id: item.id,
      photo: item.photo,
      takenAt: item.takenAt.toISOString(),
    })),
    status: dog.status,
    searchKey: dog.searchKey,
    createdAt: dog.createdAt.toISOString(),
    updatedAt: dog.updatedAt.toISOString(),
  }
  if (dog.birthYear !== undefined) stored.birthYear = dog.birthYear
  if (dog.isSenior !== undefined) stored.isSenior = dog.isSenior
  if (dog.weightKg !== undefined) stored.weightKg = dog.weightKg
  if (dog.recurrenceWeeks !== undefined) stored.recurrenceWeeks = dog.recurrenceWeeks
  if (dog.sex) stored.sex = dog.sex
  if (dog.photo) stored.photo = dog.photo
  if (dog.criticalNote) stored.criticalNote = dog.criticalNote
  if (dog.notes) stored.notes = dog.notes
  if (dog.archivedAt) stored.archivedAt = dog.archivedAt.toISOString()
  if (dog.removedPhotoIds?.length) stored.removedPhotoIds = [...dog.removedPhotoIds]
  return stored
}

export function dogsToLocalMap(dogs: Dog[]): Record<string, unknown> {
  const map: Record<string, unknown> = {}
  for (const dog of dogs) map[dog.id] = dogToLocal(dog)
  return map
}

function appointmentToLocal(appointment: Appointment): Record<string, unknown> {
  const stored: Record<string, unknown> = {
    id: appointment.id,
    dogId: appointment.dogId,
    start: appointment.start.toISOString(),
    services: appointment.services.map((line) => ({ ...line })),
    status: appointment.status,
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
  }
  if (appointment.cancelReason) stored.cancelReason = appointment.cancelReason
  if (typeof appointment.total === 'number') stored.total = appointment.total
  if (typeof appointment.actualDurationMin === 'number') stored.actualDurationMin = appointment.actualDurationMin
  const note = appointment.adjustmentNote?.trim()
  if (note) stored.adjustmentNote = note
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

export function appointmentsToLocalMap(appointments: Appointment[]): Record<string, unknown> {
  const map: Record<string, unknown> = {}
  for (const appointment of appointments) map[appointment.id] = appointmentToLocal(appointment)
  return map
}

export function servicesToLocalMap(services: Service[]): Record<string, unknown> {
  const map: Record<string, unknown> = {}
  for (const service of services) {
    map[service.id] = {
      id: service.id,
      name: service.name,
      iconKey: service.iconKey,
      kind: service.kind,
      durationMin: { ...service.durationMin },
      price: { ...service.price },
      order: service.order,
      active: service.active,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
    }
  }
  return map
}
