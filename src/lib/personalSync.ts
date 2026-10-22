import type { Appointment } from '../types/models'
import { appointmentKind } from './personal'

export function mergePersonalAppointments(
  previous: readonly Appointment[],
  incoming: readonly Appointment[],
  deletedIds: readonly string[],
): Appointment[] {
  const gone = new Set(deletedIds.filter((id) => id.length > 0))
  const byId = new Map<string, Appointment>()
  for (const item of previous) {
    if (appointmentKind(item) !== 'personale' || item.id.length === 0 || gone.has(item.id)) continue
    byId.set(item.id, item)
  }
  for (const item of incoming) {
    if (appointmentKind(item) !== 'personale' || item.id.length === 0 || gone.has(item.id)) continue
    const current = byId.get(item.id)
    if (!current || item.updatedAt.getTime() >= current.updatedAt.getTime()) byId.set(item.id, item)
  }
  return [...byId.values()].sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id))
}

export function appointmentMatchedByDeletedDog(
  data: { kind?: unknown; dogId?: unknown },
  deletedDogIds: readonly string[],
): boolean {
  if (data.kind === 'personale') return false
  return typeof data.dogId === 'string' && data.dogId.length > 0 && deletedDogIds.includes(data.dogId)
}

export function appointmentRemovedWithDog(
  docId: string,
  data: { kind?: unknown; dogId?: unknown },
  deletedDogId: string,
  explicitAppointmentIds: readonly string[],
): boolean {
  if (data.kind === 'personale') return false
  return explicitAppointmentIds.includes(docId) || data.dogId === deletedDogId
}
