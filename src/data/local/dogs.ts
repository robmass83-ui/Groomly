import { buildSearchKey } from '../../lib/dogList'
import type { Dog, DogWrite } from '../../types/models'
import { AppError } from '../errors'
import { readJson, storageKeys, writeJson } from './storage'

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
  notes?: string
  contact: Dog['contact']
  status: Dog['status']
  archivedAt?: string
  searchKey: string
  createdAt: string
  updatedAt: string
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
    contact: { name: stored.contact.name, phone: stored.contact.phone },
    status: stored.status,
    searchKey: stored.searchKey,
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
  }
  if (stored.sex) dog.sex = stored.sex
  if (stored.photo) dog.photo = stored.photo
  if (stored.criticalNote) dog.criticalNote = stored.criticalNote
  if (stored.notes) dog.notes = stored.notes
  if (stored.archivedAt) dog.archivedAt = new Date(stored.archivedAt)
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
    contact: { name: dog.contact.name, phone: dog.contact.phone },
    status: dog.status,
    searchKey: dog.searchKey,
    createdAt: dog.createdAt.toISOString(),
    updatedAt: dog.updatedAt.toISOString(),
  }
  if (dog.sex) stored.sex = dog.sex
  if (dog.photo) stored.photo = dog.photo
  if (dog.criticalNote) stored.criticalNote = dog.criticalNote
  if (dog.notes) stored.notes = dog.notes
  if (dog.archivedAt) stored.archivedAt = dog.archivedAt.toISOString()
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
  const map = readMap(uid) ?? {}
  return sortDogs(Object.values(map).map(toDomain))
}

function dogFromWrite(input: DogWrite, id: string, status: Dog['status'], createdAt: Date, archivedAt: Date | undefined, previousPhoto: string | undefined): Dog {
  const dog: Dog = {
    id,
    name: input.name,
    species: input.species,
    breed: input.breed,
    ageCategory: input.ageCategory,
    size: input.size,
    temperament: input.temperament,
    clientType: input.clientType,
    contact: { name: input.contact.name, phone: input.contact.phone },
    status,
    searchKey: buildSearchKey(input.name, input.breed, input.contact.name),
    createdAt,
    updatedAt: new Date(),
  }
  if (input.sex) dog.sex = input.sex
  if (input.notes) dog.notes = input.notes
  if (input.criticalNote) dog.criticalNote = input.criticalNote
  if (input.photo) dog.photo = input.photo
  else if (previousPhoto) dog.photo = previousPhoto
  if (archivedAt) dog.archivedAt = archivedAt
  return dog
}

export function createDog(uid: string, input: DogWrite): Dog {
  const map = readMap(uid) ?? {}
  const now = new Date()
  const dog = dogFromWrite(input, crypto.randomUUID(), 'attivo', now, undefined, undefined)
  map[dog.id] = toStored(dog)
  writeMap(uid, map)
  return dog
}

export function updateDog(uid: string, id: string, input: DogWrite): Dog {
  const map = readMap(uid) ?? {}
  const current = map[id]
  if (!current) throw new AppError('Cane assente', 'dog_missing')
  const previous = toDomain(current)
  const dog = dogFromWrite(input, id, previous.status, previous.createdAt, previous.archivedAt, previous.photo)
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
