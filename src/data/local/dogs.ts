import { storedSearchKey } from '../../lib/dogList'
import { ruoloDelProprietario } from '../../lib/ruoloProprietario'
import { migrateStored } from '../../lib/migrate'
import type { CustomField, Dog, DogContact, DogExtraNote, DogServicePrice, DogWrite, GalleryPhoto } from '../../types/models'
import { AppError } from '../errors'
import { readJson, storageKeys, writeJson } from './storage'

interface StoredGalleryPhoto {
  id: string
  photo: string
  takenAt: string
}

interface StoredExtraNote {
  id: string
  text: string
  createdAt: string
}

interface StoredDog {
  id: string
  name: string
  species: Dog['species']
  breed: string
  sex?: Dog['sex']
  ageCategory: Dog['ageCategory']
  size: Dog['size']
  temperament: Dog['temperament']
  clientType: Dog['clientType']
  photo?: string
  criticalNote?: string
  sourceDocId?: string
  notes?: string
  extraNotes?: StoredExtraNote[]
  noteVocali?: { id: string; dataUrl: string; createdAt: string }[]
  contact: Dog['contact']
  contacts?: DogContact[]
  birthYear?: number
  birthMonth?: number
  birthDay?: number
  isSenior?: boolean
  weightKg?: number
  tags?: string[]
  servicePrices?: DogServicePrice[]
  hiddenServiceIds?: string[]
  customFields?: CustomField[]
  gallery?: StoredGalleryPhoto[]
  removedPhotoIds?: string[]
  recurrenceWeeks?: number
  emailBloccata?: boolean
  status: Dog['status']
  archivedAt?: string
  searchKey: string
  createdAt: string
  updatedAt: string
}

function ownerOf(contact: { name: string; phone: string; email?: string }): { name: string; phone: string; email?: string } {
  const owner: { name: string; phone: string; email?: string } = { name: contact.name, phone: contact.phone }
  if (contact.email) owner.email = contact.email
  return owner
}

function copyContact(contact: DogContact): DogContact {
  return { id: contact.id, name: contact.name, role: contact.role, phone: contact.phone, isPrimary: contact.isPrimary }
}

function primaryFromOwner(contact: { name: string; phone: string }): DogContact {
  return { id: 'primary', name: contact.name, role: ruoloDelProprietario(contact.name), phone: contact.phone, isPrimary: true }
}

function contactsFromStored(stored: StoredDog): DogContact[] {
  if (!stored.contacts) return [primaryFromOwner(stored.contact)]
  return stored.contacts.map(copyContact)
}

function contactsFromWrite(input: DogWrite): DogContact[] {
  if (!input.contacts) return [primaryFromOwner(input.contact)]
  return input.contacts.map(copyContact)
}

function writtenOwner(contacts: DogContact[], fallback: { name: string; phone: string; email?: string }): { name: string; phone: string; email?: string } {
  const chosen = contacts.find((contact) => contact.isPrimary) ?? contacts[0]
  return ownerOf(chosen ? { name: chosen.name, phone: chosen.phone, email: fallback.email } : fallback)
}

function copyPrices(prices: DogServicePrice[] | undefined): DogServicePrice[] {
  return (prices ?? []).map((item) => ({ serviceId: item.serviceId, price: item.price, durationMin: item.durationMin }))
}

function copyFields(fields: CustomField[] | undefined): CustomField[] {
  return (fields ?? []).map((item) => ({ id: item.id, label: item.label, value: item.value }))
}

function galleryFromStored(gallery: StoredGalleryPhoto[] | undefined): GalleryPhoto[] {
  return (gallery ?? []).map((item) => ({ id: item.id, photo: item.photo, takenAt: new Date(item.takenAt) }))
}

function galleryFromWrite(gallery: GalleryPhoto[] | undefined): GalleryPhoto[] {
  return (gallery ?? []).map((item) => ({ id: item.id, photo: item.photo, takenAt: new Date(item.takenAt) }))
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
  return kept
}

function assignOptionals(dog: Dog, source: Pick<DogWrite, 'birthYear' | 'birthMonth' | 'birthDay' | 'isSenior' | 'weightKg' | 'recurrenceWeeks'>): void {
  if (source.birthYear !== undefined) dog.birthYear = source.birthYear
  if (source.birthMonth !== undefined) dog.birthMonth = source.birthMonth
  if (source.birthDay !== undefined) dog.birthDay = source.birthDay
  if (source.isSenior !== undefined) dog.isSenior = source.isSenior
  if (source.weightKg !== undefined) dog.weightKg = source.weightKg
  if (source.recurrenceWeeks !== undefined) dog.recurrenceWeeks = source.recurrenceWeeks
}

function toDomain(stored: StoredDog): Dog {
  const dog: Dog = {
    id: stored.id,
    name: stored.name,
    species: stored.species,
    breed: stored.breed,
    ageCategory: stored.ageCategory,
    size: stored.size,
    temperament: stored.temperament,
    clientType: stored.clientType,
    contact: ownerOf(stored.contact),
    contacts: contactsFromStored(stored),
    tags: stored.tags ? [...stored.tags] : [],
    servicePrices: copyPrices(stored.servicePrices),
    hiddenServiceIds: stored.hiddenServiceIds ? [...stored.hiddenServiceIds] : [],
    customFields: copyFields(stored.customFields),
    gallery: galleryFromStored(stored.gallery),
    status: stored.status,
    searchKey: stored.searchKey,
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
  }
  assignOptionals(dog, stored)
  if (stored.sex) dog.sex = stored.sex
  if (stored.photo) dog.photo = stored.photo
  if (stored.criticalNote) dog.criticalNote = stored.criticalNote
  if (typeof stored.sourceDocId === 'string' && stored.sourceDocId) dog.sourceDocId = stored.sourceDocId
  if (stored.notes) dog.notes = stored.notes
  if (stored.noteVocali?.length) dog.noteVocali = stored.noteVocali.map((item) => ({ ...item }))
  const extraNotes = extraNotesFromStored(stored.extraNotes)
  if (extraNotes) dog.extraNotes = extraNotes
  if (stored.archivedAt) dog.archivedAt = new Date(stored.archivedAt)
  if (stored.removedPhotoIds?.length) dog.removedPhotoIds = [...stored.removedPhotoIds]
  if (stored.emailBloccata === true) dog.emailBloccata = true
  return dog
}

function toStored(dog: Dog): StoredDog {
  const stored: StoredDog = {
    id: dog.id,
    name: dog.name,
    species: dog.species,
    breed: dog.breed,
    ageCategory: dog.ageCategory,
    size: dog.size,
    temperament: dog.temperament,
    clientType: dog.clientType,
    contact: writtenOwner(dog.contacts, dog.contact),
    contacts: dog.contacts.map(copyContact),
    tags: [...dog.tags],
    servicePrices: copyPrices(dog.servicePrices),
    hiddenServiceIds: [...dog.hiddenServiceIds],
    customFields: copyFields(dog.customFields),
    gallery: dog.gallery.map((item) => ({ id: item.id, photo: item.photo, takenAt: item.takenAt.toISOString() })),
    status: dog.status,
    searchKey: dog.searchKey,
    createdAt: dog.createdAt.toISOString(),
    updatedAt: dog.updatedAt.toISOString(),
  }
  if (dog.birthYear !== undefined) stored.birthYear = dog.birthYear
  if (dog.birthMonth !== undefined) stored.birthMonth = dog.birthMonth
  if (dog.birthDay !== undefined) stored.birthDay = dog.birthDay
  if (dog.isSenior !== undefined) stored.isSenior = dog.isSenior
  if (dog.weightKg !== undefined) stored.weightKg = dog.weightKg
  if (dog.recurrenceWeeks !== undefined) stored.recurrenceWeeks = dog.recurrenceWeeks
  if (dog.sex) stored.sex = dog.sex
  if (dog.photo) stored.photo = dog.photo
  if (dog.criticalNote) stored.criticalNote = dog.criticalNote
  if (typeof dog.sourceDocId === 'string' && dog.sourceDocId) stored.sourceDocId = dog.sourceDocId
  if (dog.notes) stored.notes = dog.notes
  if (dog.noteVocali?.length) stored.noteVocali = dog.noteVocali.map((item) => ({ ...item }))
  if (dog.extraNotes) {
    stored.extraNotes = dog.extraNotes.map((item) => ({
      id: item.id,
      text: item.text,
      createdAt: item.createdAt.toISOString(),
    }))
  }
  if (dog.archivedAt) stored.archivedAt = dog.archivedAt.toISOString()
  if (dog.removedPhotoIds?.length) stored.removedPhotoIds = [...dog.removedPhotoIds]
  if (dog.emailBloccata === true) stored.emailBloccata = true
  return stored
}

function readMap(uid: string): Record<string, StoredDog> | null {
  return readJson<Record<string, StoredDog>>(storageKeys.dogs(uid))
}

function writeMap(uid: string, map: Record<string, StoredDog>): void {
  writeJson(storageKeys.dogs(uid), map)
}

function sortDogs(dogs: Dog[]): Dog[] {
  return dogs.sort((a, b) => a.name.localeCompare(b.name, 'it') || a.id.localeCompare(b.id))
}

export function listDogs(uid: string): Dog[] {
  migrateStored(uid)
  const map = readMap(uid) ?? {}
  return sortDogs(Object.values(map).map(toDomain))
}

function dogFromWrite(input: DogWrite, id: string, status: Dog['status'], createdAt: Date, archivedAt: Date | undefined, previousPhoto: string | undefined): Dog {
  const contacts = contactsFromWrite(input)
  const dog: Dog = {
    id,
    name: input.name,
    species: input.species,
    breed: input.breed,
    ageCategory: input.ageCategory,
    size: input.size,
    temperament: input.temperament,
    clientType: input.clientType,
    contact: writtenOwner(contacts, input.contact),
    contacts,
    tags: input.tags ? [...input.tags] : [],
    servicePrices: copyPrices(input.servicePrices),
    hiddenServiceIds: input.hiddenServiceIds ? [...input.hiddenServiceIds] : [],
    customFields: copyFields(input.customFields),
    gallery: galleryFromWrite(input.gallery),
    status,
    searchKey: storedSearchKey(input.name, input.breed, contacts.map((contact) => contact.name), contacts.map((contact) => contact.phone)),
    createdAt,
    updatedAt: new Date(),
  }
  assignOptionals(dog, input)
  if (input.sex) dog.sex = input.sex
  if (input.notes) dog.notes = input.notes
  if (input.noteVocali?.length) dog.noteVocali = input.noteVocali.map((item) => ({ ...item }))
  if (input.criticalNote) dog.criticalNote = input.criticalNote
  if (Array.isArray(input.extraNotes)) dog.extraNotes = copyExtraNotes(input.extraNotes)
  if (input.photo) dog.photo = input.photo
  else if (previousPhoto) dog.photo = previousPhoto
  else {
    const fromGallery = dog.gallery.find((item) => item.photo)?.photo
    if (fromGallery) dog.photo = fromGallery
  }
  if (archivedAt) dog.archivedAt = archivedAt
  return dog
}

export function createDog(uid: string, input: DogWrite): Dog {
  const map = readMap(uid) ?? {}
  const now = new Date()
  const dog = dogFromWrite(input, crypto.randomUUID(), 'attivo', now, undefined, undefined)
  if (input.emailBloccata === true) dog.emailBloccata = true
  map[dog.id] = toStored(dog)
  writeMap(uid, map)
  return dog
}

export function updateDog(uid: string, id: string, input: DogWrite): Dog {
  const map = readMap(uid) ?? {}
  const current = map[id]
  if (!current) throw new AppError('Cane assente', 'dog_missing')
  const previous = toDomain(current)
  const removedPhotoIds = [...new Set([...(previous.removedPhotoIds ?? []), ...(input.removedPhotoIds ?? [])])]
  const write = input.extraNotes === undefined
    ? { ...input, extraNotes: copyExtraNotes(previous.extraNotes) }
    : input
  if (write.noteVocali === undefined && previous.noteVocali) write.noteVocali = previous.noteVocali.map((item) => ({ ...item }))
  const dog = dogFromWrite(write, id, previous.status, previous.createdAt, previous.archivedAt, previous.photo)
  if (removedPhotoIds.length > 0) dog.removedPhotoIds = removedPhotoIds
  if (input.emailBloccata === true || (input.emailBloccata !== false && previous.emailBloccata === true)) {
    dog.emailBloccata = true
  }
  map[id] = toStored(dog)
  writeMap(uid, map)
  return dog
}

export function archiveDog(uid: string, id: string, status: 'non_in_cura' | 'deceduto'): Dog {
  const map = readMap(uid) ?? {}
  const current = map[id]
  if (!current) throw new AppError('Cane assente', 'dog_missing')
  const dog = toDomain(current)
  dog.status = status
  dog.archivedAt = new Date()
  dog.updatedAt = new Date()
  map[id] = toStored(dog)
  writeMap(uid, map)
  return dog
}

export function deleteDog(uid: string, id: string): void {
  const map = readMap(uid) ?? {}
  if (!map[id]) throw new AppError('Cane assente', 'dog_missing')
  const next = { ...map }
  delete next[id]
  writeMap(uid, next)
}

export function forgetLocalDog(id: string): void {
  if (typeof localStorage === 'undefined' || !id) return
  const keys: string[] = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key?.startsWith('groomly.users.') && key.endsWith('.dogs')) keys.push(key)
  }
  for (const key of keys) {
    const raw = localStorage.getItem(key)
    if (!raw) continue
    try {
      const map = JSON.parse(raw) as Record<string, unknown>
      if (!map || typeof map !== 'object' || Array.isArray(map) || !(id in map)) continue
      delete map[id]
      localStorage.setItem(key, JSON.stringify(map))
    } catch {
      continue
    }
  }
}

export function restoreDog(uid: string, id: string): Dog {
  const map = readMap(uid) ?? {}
  const current = map[id]
  if (!current) throw new AppError('Cane assente', 'dog_missing')
  const dog = toDomain(current)
  dog.status = 'attivo'
  delete dog.archivedAt
  dog.updatedAt = new Date()
  map[id] = toStored(dog)
  writeMap(uid, map)
  return dog
}
