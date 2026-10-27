import type { SettingsMain } from '../data/local/settings'

export function backupImpostato(settings: Pick<SettingsMain, 'backup'>): boolean {
  return settings.backup.impostato === true
}

/** Segna il passo del profilo. Ritorna lo stesso oggetto se non c'è niente da scrivere. */
export function conBackupImpostato(current: SettingsMain, acceso: boolean): SettingsMain {
  if ((current.backup.impostato === true) === acceso) return current
  const backup = { ...current.backup }
  if (acceso) backup.impostato = true
  else delete backup.impostato
  return { ...current, backup }
}
