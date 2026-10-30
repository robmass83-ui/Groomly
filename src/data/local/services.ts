import type { Service, ServiceInput, ServicePatch } from '../../types/models'
import { AppError } from '../errors'
import { SERVICE_SEED } from '../seed/services'
import { permuteOrders } from '../../lib/serviceOrder'
import { readJson, storageKeys, writeJson } from './storage'

interface StoredService {
  id: string
  name: string
  iconKey?: Service['iconKey']
  kind: Service['kind']
  durationMin: Service['durationMin']
  price: Service['price']
  order: number
  active: boolean
  createdAt: string
  updatedAt: string
}

function toDomain(stored: StoredService): Service {
  return { ...stored, createdAt: new Date(stored.createdAt), updatedAt: new Date(stored.updatedAt) }
}

function toStored(service: Service): StoredService {
  return { ...service, createdAt: service.createdAt.toISOString(), updatedAt: service.updatedAt.toISOString() }
}

function readMap(uid: string): Record<string, StoredService> | null {
  return readJson<Record<string, StoredService>>(storageKeys.services(uid))
}

function writeMap(uid: string, map: Record<string, StoredService>): Service[] {
  writeJson(storageKeys.services(uid), map)
  return Object.values(map).map(toDomain).sort((a, b) => a.order - b.order)
}

export function listServices(uid: string): Service[] {
  const map = readMap(uid) ?? {}
  return Object.values(map).map(toDomain).sort((a, b) => a.order - b.order)
}

export function ensureServiceSeed(uid: string): Service[] {
  const map = readMap(uid)
  if (map && Object.keys(map).length > 0) return listServices(uid)
  const now = new Date().toISOString()
  const seeded: Record<string, StoredService> = {}
  for (const service of SERVICE_SEED) {
    seeded[service.id] = { ...service, createdAt: now, updatedAt: now }
  }
  return writeMap(uid, seeded)
}

export function createService(uid: string, input: ServiceInput): Service {
  const map = readMap(uid) ?? {}
  const orders = Object.values(map).map((service) => service.order)
  const now = new Date()
  const service: Service = {
    ...input,
    id: crypto.randomUUID(),
    order: orders.length === 0 ? 0 : Math.max(...orders) + 1,
    createdAt: now,
    updatedAt: now,
  }
  map[service.id] = toStored(service)
  writeMap(uid, map)
  return service
}

export function updateService(uid: string, id: string, patch: ServicePatch): Service {
  const map = readMap(uid) ?? {}
  const current = map[id]
  if (!current) throw new AppError('Servizio assente', 'service_missing')
  const next = toDomain({ ...current, ...patch, id, kind: current.kind, iconKey: current.iconKey, updatedAt: new Date().toISOString() })
  map[id] = toStored(next)
  writeMap(uid, map)
  return next
}

export function removeService(uid: string, id: string): Service[] {
  const map = readMap(uid) ?? {}
  if (!map[id]) throw new AppError('Servizio assente', 'service_missing')
  delete map[id]
  return writeMap(uid, map)
}

export function moveService(uid: string, id: string, direction: 'up' | 'down'): Service[] {
  const map = readMap(uid) ?? {}
  const ordered = Object.values(map).sort((a, b) => a.order - b.order)
  const index = ordered.findIndex((service) => service.id === id)
  if (index < 0) throw new AppError('Servizio assente', 'service_missing')
  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= ordered.length) throw new AppError('Estremo della lista', 'service_boundary')
  const currentOrder = ordered[index].order
  ordered[index].order = ordered[target].order
  ordered[target].order = currentOrder
  map[ordered[index].id] = ordered[index]
  map[ordered[target].id] = ordered[target]
  return writeMap(uid, map)
}

export function reorderKind(uid: string, id: string, toIndex: number): Service[] {
  const map = readMap(uid) ?? {}
  const current = map[id]
  if (!current) throw new AppError('Servizio assente', 'service_missing')
  const group = Object.values(map)
    .filter((service) => service.kind === current.kind)
    .sort((a, b) => a.order - b.order)
  const fromIndex = group.findIndex((service) => service.id === id)
  if (toIndex < 0 || toIndex >= group.length || toIndex === fromIndex) {
    return listServices(uid)
  }
  const permuted = permuteOrders(
    group.map((service) => service.id),
    group.map((service) => service.order),
    fromIndex,
    toIndex,
  )
  for (const { id: serviceId, order } of permuted) {
    map[serviceId].order = order
  }
  return writeMap(uid, map)
}
