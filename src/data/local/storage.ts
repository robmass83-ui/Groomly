import { AppError } from '../errors'

export const storageKeys = {
  auth: 'groomly.auth',
  session: 'groomly.session',
  settings: (uid: string) => `groomly.users.${uid}.settings`,
  services: (uid: string) => `groomly.users.${uid}.services`,
  dogs: (uid: string) => `groomly.users.${uid}.dogs`,
  appointments: (uid: string) => `groomly.users.${uid}.appointments`,
}

const JSON_KEY = /^groomly\.(auth|deleted|users\..+\.(settings|services|dogs|appointments))$/

let isolated: Map<string, string> | null = null

export function withIsolatedJsonKey<T>(key: string, seed: unknown, run: () => T): T {
  const next = new Map<string, string>()
  next.set(key, JSON.stringify(seed))
  const previous = isolated
  isolated = next
  try {
    return run()
  } finally {
    isolated = previous
  }
}

export function readJson<T>(key: string): T | null {
  const raw = isolated?.has(key) ? isolated.get(key) ?? null : localStorage.getItem(key)
  if (raw == null) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new AppError('Dati locali illeggibili', 'storage_corrupt')
  }
}

export function writeJson(key: string, value: unknown): void {
  let json: string
  try {
    json = JSON.stringify(value)
  } catch {
    throw new AppError('Salvataggio non riuscito', 'storage_write')
  }
  if (isolated?.has(key)) {
    isolated.set(key, json)
    return
  }
  try {
    localStorage.setItem(key, json)
  } catch {
    throw new AppError('Salvataggio non riuscito', 'storage_write')
  }
}

export function findCorruptGroomlyKey(): string | null {
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key || !JSON_KEY.test(key)) continue
    const raw = localStorage.getItem(key)
    if (raw == null) continue
    try {
      JSON.parse(raw)
    } catch {
      return key
    }
  }
  return null
}
