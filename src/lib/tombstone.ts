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
