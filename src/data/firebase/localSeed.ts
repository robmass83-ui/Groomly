import type { Appointment, Dog, DogContact, Service } from '../../types/models'
import { appointmentToStored } from '../local/appointments'
import { withIsolatedJsonKey } from '../local/storage'

export function withLocalKey<T>(key: string, seed: unknown, run: () => T): T {
  return withIsolatedJsonKey(key, seed, run)
}

function writtenOwner(contacts: DogContact[], fallback: { name: string; phone: string; email?: string }): { name: string; phone: string; email?: string } {
  const chosen = contacts.find((contact) => contact.isPrimary) ?? contacts[0]
  const owner: { name: string; phone: string; email?: string } = chosen
    ? { name: chosen.name, phone: chosen.phone }
    : { name: fallback.name, phone: fallback.phone }
  if (fallback.email) owner.email = fallback.email
  return owner
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
  if (typeof dog.sourceDocId === 'string' && dog.sourceDocId) stored.sourceDocId = dog.sourceDocId
  if (dog.notes) stored.notes = dog.notes
  if (dog.extraNotes) {
    stored.extraNotes = dog.extraNotes.map((item) => ({
      id: item.id,
      text: item.text,
      createdAt: item.createdAt.toISOString(),
    }))
  }
  if (dog.daRevisionare === true) stored.daRevisionare = true
  if (dog.lingua) stored.lingua = dog.lingua
  if (dog.archivedAt) stored.archivedAt = dog.archivedAt.toISOString()
  if (dog.removedPhotoIds?.length) stored.removedPhotoIds = [...dog.removedPhotoIds]
  if (dog.emailBloccata === true) stored.emailBloccata = true
  return stored
}

export function dogsToLocalMap(dogs: Dog[]): Record<string, unknown> {
  const map: Record<string, unknown> = {}
  for (const dog of dogs) map[dog.id] = dogToLocal(dog)
  return map
}

export function appointmentsToLocalMap(appointments: Appointment[]): Record<string, unknown> {
  const map: Record<string, unknown> = {}
  for (const appointment of appointments) map[appointment.id] = appointmentToStored(appointment)
  return map
}

export function servicesToLocalMap(services: Service[]): Record<string, unknown> {
  const map: Record<string, unknown> = {}
  for (const service of services) {
    const stored: Record<string, unknown> = {
      id: service.id,
      name: service.name,
      kind: service.kind,
      durationMin: { ...service.durationMin },
      price: { ...service.price },
      order: service.order,
      active: service.active,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
    }
    if (service.iconKey) stored.iconKey = service.iconKey
    map[service.id] = stored
  }
  return map
}
