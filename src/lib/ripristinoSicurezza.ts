import { readJson, writeJson } from '../data/local/storage'
import { buildBackup, readRestoreBundle, type BackupBundle } from './backupDoc'

const ERRORE = 'Copia di sicurezza non riuscita'

function chiave(uid: string): string {
  return `groomly.users.${uid}.ripristinoSicurezza`
}

export function salvaCopiaLocale(uid: string): void {
  writeJson(chiave(uid), buildBackup(uid))
}

export function leggiCopiaLocale(uid: string): BackupBundle | null {
  const raw = readJson<unknown>(chiave(uid))
  if (raw == null) return null
  const bundle = readRestoreBundle(raw)
  if (!bundle) throw new Error(ERRORE)
  return bundle
}

export function cancellaCopiaLocale(uid: string): void {
  localStorage.removeItem(chiave(uid))
}
