import type { ThemeChoice } from '../../theme/theme'
import { readJson, storageKeys, writeJson } from './storage'

export interface SettingsMain {
  theme: ThemeChoice
  updatedAt: string
}

export function getSettings(uid: string): SettingsMain {
  const existing = readJson<SettingsMain>(storageKeys.settings(uid))
  if (existing) return existing
  const created: SettingsMain = { theme: 'auto', updatedAt: new Date().toISOString() }
  writeJson(storageKeys.settings(uid), created)
  return created
}

export function setTheme(uid: string, theme: ThemeChoice): SettingsMain {
  const next: SettingsMain = { theme, updatedAt: new Date().toISOString() }
  writeJson(storageKeys.settings(uid), next)
  return next
}
