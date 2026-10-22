import { appointmentKind } from './personal'

export const TOMBSTONE_KEY = 'groomly.deleted'

export type Tombstone = { ids: string[]; appointmentIds: string[] }

export function emptyTombstone(): Tombstone {
  return { ids: [], appointmentIds: [] }
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

export function readTombstone(raw: unknown): Tombstone {
  if (!raw || typeof raw !== 'object') return emptyTombstone()
  const record = raw as { ids?: unknown; appointmentIds?: unknown }
  return { ids: strings(record.ids), appointmentIds: strings(record.appointmentIds) }
}

function union(left: string[], right: string[]): string[] {
  return [...new Set([...left, ...right])]
}

export function mergeTombstone(left: Tombstone, right: Tombstone): Tombstone {
  return {
    ids: union(left.ids, right.ids),
    appointmentIds: union(left.appointmentIds, right.appointmentIds),
  }
}

export function tombstoneRejectsDog(stone: Tombstone, id: string): boolean {
  return stone.ids.includes(id)
}

export function tombstoneRejectsAppointment(stone: Tombstone, id: string, dogId: string, personal = false): boolean {
  if (personal) return stone.appointmentIds.includes(id)
  return stone.appointmentIds.includes(id) || stone.ids.includes(dogId)
}

export function filterDogs<T extends { id: string }>(dogs: T[], stone: Tombstone): T[] {
  return dogs.filter((dog) => !tombstoneRejectsDog(stone, dog.id))
}

export function filterAppointments<T extends { id: string; dogId: string; kind?: 'pelosetto' | 'personale' }>(items: T[], stone: Tombstone): T[] {
  return items.filter((item) => !tombstoneRejectsAppointment(stone, item.id, item.dogId, appointmentKind(item) === 'personale'))
}

export function readDeletion(): Tombstone {
  try {
    const raw = localStorage.getItem(TOMBSTONE_KEY)
    return raw ? readTombstone(JSON.parse(raw) as unknown) : emptyTombstone()
  } catch {
    return emptyTombstone()
  }
}

export function rememberDeletion(patch: Partial<Tombstone>): Tombstone {
  const next = mergeTombstone(readDeletion(), {
    ids: patch.ids ?? [],
    appointmentIds: patch.appointmentIds ?? [],
  })
  localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(next))
  return next
}

// Vive solo nella sessione di pagina. Roberto non filtra la pietra storica del telefono,
// ma una cancellazione appena fatta non deve rientrare dal prossimo snapshot.
const sessionAppointmentIds = new Set<string>()

export function noteSessionAppointmentDeletion(ids: Iterable<string>): void {
  for (const id of ids) if (id) sessionAppointmentIds.add(id)
}

export function sessionHidesAppointment(id: string): boolean {
  return sessionAppointmentIds.has(id)
}

export function sessionDeletedAppointmentIds(): string[] {
  return [...sessionAppointmentIds]
}

export function resetSessionAppointmentDeletions(): void {
  sessionAppointmentIds.clear()
}

export const PENDING_DELETE_KEY = 'groomly.deleted.pending'

const sessionDogIds = new Set<string>()

export function noteSessionDogDeletion(id: string): void {
  if (id) sessionDogIds.add(id)
}

export function sessionHidesDog(id: string): boolean {
  return sessionDogIds.has(id)
}

export function resetSessionDogDeletions(): void {
  sessionDogIds.clear()
}

function readPendingIds(): string[] {
  try {
    const raw = localStorage.getItem(PENDING_DELETE_KEY)
    const parsed = raw ? JSON.parse(raw) as unknown : []
    return strings(parsed)
  } catch {
    return []
  }
}

export function readPendingDogDeletions(): string[] {
  return readPendingIds()
}

export function rememberPendingDogDeletion(id: string): void {
  if (!id) return
  const next = [...new Set([...readPendingIds(), id])]
  localStorage.setItem(PENDING_DELETE_KEY, JSON.stringify(next))
}

export function forgetPendingDogDeletion(id: string): void {
  const next = readPendingIds().filter((item) => item !== id)
  if (next.length === 0) localStorage.removeItem(PENDING_DELETE_KEY)
  else localStorage.setItem(PENDING_DELETE_KEY, JSON.stringify(next))
}

export function dogHiddenNow(id: string): boolean {
  return id.length > 0 && (sessionDogIds.has(id) || readPendingIds().includes(id))
}
