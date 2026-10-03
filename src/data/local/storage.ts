import { AppError } from '../errors'

export const storageKeys = {
  auth: 'groomly.auth',
  session: 'groomly.session',
  settings: (uid: string) => `groomly.users.${uid}.settings`,
  services: (uid: string) => `groomly.users.${uid}.services`,
  dogs: (uid: string) => `groomly.users.${uid}.dogs`,
}

const JSON_KEY = /^groomly\.(auth|users\..+\.(settings|services|dogs))$/

export function readJson<T>(key: string): T | null {
  const raw = localStorage.getItem(key)
  if (raw == null) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new AppError('Dati locali illeggibili', 'storage_corrupt')
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
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
