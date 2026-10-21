import { format, isSameDay } from 'date-fns'
import { migrateMaps } from './migrate'
import JSZip from 'jszip'
import { AppError } from '../data/errors'
import { readJson, storageKeys, writeJson } from '../data/local/storage'
import { IT_DATE } from './format'

export interface BackupBundle {
  dogs: unknown
  appointments: unknown
  services: unknown
  settings: unknown
  closures?: unknown
}

export interface BackupPhoto {
  id: string
  dataUrl: string
}

const DAY_MS = 24 * 60 * 60 * 1000

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function countMap(value: unknown): number {
  return isRecord(value) ? Object.keys(value).length : 0
}

export function backupCounts(bundle: BackupBundle): { dogs: number; appointments: number; services: number } {
  return {
    dogs: countMap(bundle.dogs),
    appointments: countMap(bundle.appointments),
    services: countMap(bundle.services),
  }
}

export function isEmptyBackup(bundle: BackupBundle): boolean {
  return countMap(bundle.dogs) === 0
    && countMap(bundle.appointments) === 0
    && countMap(bundle.services) === 0
    && countMap(bundle.settings) === 0
    && countMap(bundle.closures) === 0
}

export function backupDay(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function dailyBackupDue(
  backup: { autoDaily?: boolean; lastAt?: unknown } | undefined,
  now = new Date(),
): boolean {
  if (!backup || backup.autoDaily !== true) return false
  const last = typeof backup.lastAt === 'string' ? Date.parse(backup.lastAt) : Number.NaN
  if (!Number.isNaN(last) && now.getTime() - last <= DAY_MS) return false
  return true
}

export function buildBackup(uid: string): BackupBundle {
  return {
    dogs: readJson(storageKeys.dogs(uid)) ?? {},
    appointments: readJson(storageKeys.appointments(uid)) ?? {},
    services: readJson(storageKeys.services(uid)) ?? {},
    settings: readJson(storageKeys.settings(uid)) ?? {},
    closures: readJson(storageKeys.closures(uid)) ?? {},
  }
}

export function readRestoreBundle(value: unknown): BackupBundle | null {
  if (!isRecord(value)) return null
  const dogs = value.dogs
  const appointments = value.appointments
  const services = value.services
  const settings = value.settings
  if (!isRecord(dogs) || !isRecord(appointments) || !isRecord(services) || !isRecord(settings)) return null
  const bundle: BackupBundle = { dogs, appointments, services, settings }
  if (isRecord(value.closures)) bundle.closures = value.closures
  return bundle
}

export function restoreBackup(uid: string, bundle: BackupBundle): void {
  const accepted = readRestoreBundle(bundle)
  if (!accepted) throw new AppError('Salvataggio non riuscito', 'storage_write')
  const migrated = migrateMaps(
    accepted.dogs as Record<string, unknown>,
    accepted.appointments as Record<string, unknown>,
  )
  writeJson(storageKeys.dogs(uid), migrated.dogs)
  writeJson(storageKeys.appointments(uid), migrated.appointments)
  writeJson(storageKeys.services(uid), accepted.services)
  writeJson(storageKeys.settings(uid), accepted.settings)
  if (isRecord(accepted.closures)) writeJson(storageKeys.closures(uid), accepted.closures)
}

export function backupStatusLabel(lastAt: string | undefined, now = new Date()): string {
  if (!lastAt) return 'Mai eseguito'
  const date = new Date(lastAt)
  if (Number.isNaN(date.getTime())) return 'Mai eseguito'
  if (isSameDay(date, now)) return `Oggi ${format(date, 'HH:mm', IT_DATE)} · completato`
  return format(date, 'd MMM yyyy', IT_DATE)
}

export function backupFilename(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `groomly-backup-${now.getFullYear()}-${month}-${day}.json`
}

export function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function withoutSnapshot(settings: unknown): unknown {
  if (!isRecord(settings)) return settings
  const copy = { ...settings }
  if (!isRecord(copy.backup)) return copy
  const backup = { ...copy.backup }
  delete backup.snapshot
  copy.backup = backup
  return copy
}

export function maybeDailyBackup(uid: string, now = new Date()): void {
  const raw = readJson<Record<string, unknown>>(storageKeys.settings(uid))
  if (!isRecord(raw) || !isRecord(raw.backup)) return
  if (!dailyBackupDue({ autoDaily: raw.backup.autoDaily === true, lastAt: raw.backup.lastAt }, now)) return
  const bundle = buildBackup(uid)
  const snapshot: BackupBundle = { ...bundle, settings: withoutSnapshot(bundle.settings) }
  writeJson(storageKeys.settings(uid), {
    ...raw,
    backup: { ...raw.backup, lastAt: now.toISOString(), snapshot },
  })
}

function dataUrl(value: unknown): string | null {
  return typeof value === 'string' && value.startsWith('data:') ? value : null
}

export function collectPhotoFiles(bundle: BackupBundle): BackupPhoto[] {
  const photos: BackupPhoto[] = []
  const seen = new Set<string>()
  function add(id: unknown, raw: unknown) {
    const url = dataUrl(raw)
    if (typeof id !== 'string' || id === '' || !url || seen.has(id)) return
    seen.add(id)
    photos.push({ id, dataUrl: url })
  }
  if (isRecord(bundle.dogs)) {
    for (const [key, dog] of Object.entries(bundle.dogs)) {
      if (!isRecord(dog)) continue
      add(typeof dog.id === 'string' ? dog.id : key, dog.photo)
      if (!Array.isArray(dog.gallery)) continue
      for (const item of dog.gallery) {
        if (!isRecord(item)) continue
        add(item.id, item.photo)
      }
    }
  }
  if (isRecord(bundle.appointments)) {
    for (const appointment of Object.values(bundle.appointments)) {
      if (!isRecord(appointment) || !Array.isArray(appointment.photos)) continue
      for (const item of appointment.photos) {
        if (!isRecord(item)) continue
        add(item.id, item.photo)
      }
    }
  }
  if (isRecord(bundle.settings)) {
    if (isRecord(bundle.settings.priceList)) add(bundle.settings.priceList.id, bundle.settings.priceList.dataUrl)
    if (Array.isArray(bundle.settings.priceListHistory)) {
      for (const item of bundle.settings.priceListHistory) {
        if (!isRecord(item)) continue
        add(item.id, item.dataUrl)
      }
    }
  }
  return photos
}

function dataUrlBytes(value: string): Uint8Array | null {
  const comma = value.indexOf(',')
  if (comma < 0) return null
  const meta = value.slice(0, comma)
  const body = value.slice(comma + 1)
  try {
    if (meta.includes(';base64')) {
      const binary = atob(body)
      const bytes = new Uint8Array(binary.length)
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
      return bytes
    }
    return new TextEncoder().encode(decodeURIComponent(body))
  } catch {
    return null
  }
}

export async function buildExportZip(bundle: BackupBundle): Promise<Blob> {
  const zip = new JSZip()
  zip.file('backup.json', JSON.stringify(bundle))
  for (const photo of collectPhotoFiles(bundle)) {
    const bytes = dataUrlBytes(photo.dataUrl)
    if (!bytes) continue
    zip.file(`foto/${photo.id}.jpg`, bytes)
  }
  return zip.generateAsync({ type: 'blob' })
}
