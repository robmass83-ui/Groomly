import { closureRangeOk, closureReasonOk, type Closure } from '../../lib/closures'
import { readJson, storageKeys, writeJson } from './storage'

const DAY = /^\d{4}-\d{2}-\d{2}$/

interface StoredClosure {
  id: string
  reason: string
  startDay: string
  endDay: string
  createdAt: string
  updatedAt: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function acceptable(closure: Closure): boolean {
  return closure.id.length > 0
    && closureReasonOk(closure.reason)
    && DAY.test(closure.startDay)
    && DAY.test(closure.endDay)
    && closureRangeOk(closure.startDay, closure.endDay)
    && !Number.isNaN(closure.createdAt.getTime())
    && !Number.isNaN(closure.updatedAt.getTime())
}

function toStored(closure: Closure): StoredClosure {
  return {
    id: closure.id,
    reason: closure.reason.trim(),
    startDay: closure.startDay,
    endDay: closure.endDay,
    createdAt: closure.createdAt.toISOString(),
    updatedAt: closure.updatedAt.toISOString(),
  }
}

function parseStored(key: string, value: unknown): Closure | null {
  if (!isRecord(value)) return null
  const id = typeof value.id === 'string' && value.id ? value.id : key
  const reason = typeof value.reason === 'string' ? value.reason : ''
  const startDay = typeof value.startDay === 'string' ? value.startDay : ''
  const endDay = typeof value.endDay === 'string' ? value.endDay : ''
  const createdAt = typeof value.createdAt === 'string' ? new Date(value.createdAt) : new Date(NaN)
  const updatedAt = typeof value.updatedAt === 'string' ? new Date(value.updatedAt) : new Date(NaN)
  const closure: Closure = { id, reason, startDay, endDay, createdAt, updatedAt }
  if (!acceptable(closure)) return null
  return { ...closure, reason: reason.trim() }
}

function readMap(uid: string): Record<string, unknown> {
  const raw = readJson<unknown>(storageKeys.closures(uid))
  return isRecord(raw) ? raw : {}
}

function sortClosures(closures: Closure[]): Closure[] {
  return closures.sort((a, b) => a.startDay.localeCompare(b.startDay) || a.id.localeCompare(b.id))
}

export function closuresToLocalMap(closures: Closure[]): Record<string, unknown> {
  const map: Record<string, unknown> = {}
  for (const closure of closures) map[closure.id] = toStored(closure)
  return map
}

export function listClosures(uid: string): Closure[] {
  const closures: Closure[] = []
  for (const [key, value] of Object.entries(readMap(uid))) {
    const parsed = parseStored(key, value)
    if (parsed) closures.push(parsed)
  }
  return sortClosures(closures)
}

export function saveClosureLocal(uid: string, closure: Closure): boolean {
  if (!acceptable(closure)) return false
  const map = readMap(uid)
  map[closure.id] = toStored(closure)
  writeJson(storageKeys.closures(uid), map)
  return true
}

export function deleteClosureLocal(uid: string, id: string): void {
  const map = readMap(uid)
  if (!(id in map)) return
  const next = { ...map }
  delete next[id]
  writeJson(storageKeys.closures(uid), next)
}
