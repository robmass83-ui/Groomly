import { useState } from 'react'
import { getSettings, setTheme, type SettingsMain } from '../data/local/settings'
import type { ThemeChoice } from '../theme/theme'
import { applyTheme, prefersDark, resolveTheme } from '../theme/theme'

export function useSettings(uid: string | null) {
  const [settings, setSettings] = useState<SettingsMain>(() =>
    uid ? getSettings(uid) : { theme: 'auto', updatedAt: '' },
  )

  function choose(theme: ThemeChoice): boolean {
    if (!uid) return false
    const previous = settings.theme
    applyTheme(resolveTheme(theme, prefersDark()))
    try {
      setSettings(setTheme(uid, theme))
      return true
    } catch {
      applyTheme(resolveTheme(previous, prefersDark()))
      return false
    }
  }

  return { settings, choose }
}
