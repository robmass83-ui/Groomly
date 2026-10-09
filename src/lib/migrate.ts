import { phoneDigits, storedSearchKey } from './dogList'
import { readJson, storageKeys, writeJson } from '../data/local/storage'

const KNOWN_STATUS = new Set(['programmato', 'completato', 'disdetto', 'non_venuto'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function pushName(names: string[], value: unknown): void {
  if (isRecord(value) && typeof value.name === 'string') names.push(value.name)
}

function pushPhone(phones: string[], value: unknown): void {
  if (!isRecord(value) || typeof value.phone !== 'string') return
  if (phoneDigits(value.phone).length >= 3) phones.push(value.phone)
}

function nextSearchKey(dog: Record<string, unknown>): string | null {
  if (typeof dog.name !== 'string') return null
  const names: string[] = []
  pushName(names, dog.contact)
  if (Array.isArray(dog.contacts)) {
    for (const contact of dog.contacts) pushName(names, contact)
  }
  const phones: string[] = []
  pushPhone(phones, dog.contact)
  if (Array.isArray(dog.contacts)) {
    for (const contact of dog.contacts) pushPhone(phones, contact)
  }
  const breed = typeof dog.breed === 'string' ? dog.breed : ''
  return storedSearchKey(dog.name, breed, names, phones)
}

function migrateDog(value: unknown): { value: unknown; changed: boolean } {
  if (!isRecord(value)) return { value, changed: false }
  let next = value
  let changed = false
  const assign = (partial: Record<string, unknown>) => {
    next = { ...next, ...partial }
    changed = true
  }
  if (value.isSenior === true && value.ageCategory !== 'anziano') assign({ ageCategory: 'anziano' })
  if (value.clientType === 'mensile' && (typeof value.recurrenceWeeks !== 'number' || !Number.isFinite(value.recurrenceWeeks))) {
    assign({ recurrenceWeeks: 4 })
  }
  const searchKey = nextSearchKey(value)
  if (searchKey !== null && value.searchKey !== searchKey) assign({ searchKey })
  return { value: next, changed }
}

function migrateAppointment(value: unknown): { value: unknown; changed: boolean } {
  if (!isRecord(value) || typeof value.status !== 'string' || KNOWN_STATUS.has(value.status)) {
    return { value, changed: false }
  }
  return { value: { ...value, status: 'programmato' }, changed: true }
}

function migrateMap(
  map: Record<string, unknown>,
  migrate: (value: unknown) => { value: unknown; changed: boolean },
): { map: Record<string, unknown>; changed: boolean } {
  let changed = false
  const next: Record<string, unknown> = {}
  for (const [id, value] of Object.entries(map)) {
    const migrated = migrate(value)
    next[id] = migrated.value
    if (migrated.changed) changed = true
  }
  return { map: changed ? next : map, changed }
}

export function migrateMaps(
  dogs: Record<string, unknown>,
  appointments: Record<string, unknown>,
): { dogs: Record<string, unknown>; appointments: Record<string, unknown>; changed: boolean } {
  const dogResult = migrateMap(dogs, migrateDog)
  const appointmentResult = migrateMap(appointments, migrateAppointment)
  return {
    dogs: dogResult.map,
    appointments: appointmentResult.map,
    changed: dogResult.changed || appointmentResult.changed,
  }
}

export function migrateStored(uid: string): void {
  const dogsRaw = readJson<unknown>(storageKeys.dogs(uid))
  const appointmentsRaw = readJson<unknown>(storageKeys.appointments(uid))
  const dogs = isRecord(dogsRaw) ? dogsRaw : {}
  const appointments = isRecord(appointmentsRaw) ? appointmentsRaw : {}
  const result = migrateMaps(dogs, appointments)
  if (isRecord(dogsRaw) && result.dogs !== dogs) writeJson(storageKeys.dogs(uid), result.dogs)
  if (isRecord(appointmentsRaw) && result.appointments !== appointments) {
    writeJson(storageKeys.appointments(uid), result.appointments)
  }
}
