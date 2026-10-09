import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { getAccount } from '../data/local/auth'
import { blankSettings, getSettings, setTheme, type SettingsMain } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'
import { useSession } from './useSession'
import type { ThemeChoice } from '../theme/theme'
import { applyTheme, prefersDark, resolveTheme } from '../theme/theme'

type SettingsApi = {
  settings: SettingsMain
  choose: (theme: ThemeChoice) => boolean
  save: (next: SettingsMain) => boolean
  reload: () => void
}

const SettingsContext = createContext<SettingsApi | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { gate } = useSession()
  const uid = gate.kind === 'in' ? gate.account.uid : gate.kind === 'out' ? getAccount()?.uid ?? null : null
  const [settings, setSettings] = useState<SettingsMain>(() =>
    uid ? getSettings(uid) : blankSettings('auto', ''),
  )

  useEffect(() => {
    if (!uid) return
    setSettings(getSettings(uid))
  }, [uid])

  useEffect(() => {
    const apply = () => applyTheme(resolveTheme(settings.theme, prefersDark()))
    apply()
    if (settings.theme !== 'auto') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [settings.theme])

  const reload = useCallback(() => {
    if (!uid) return
    setSettings(getSettings(uid))
  }, [uid])

  const save = useCallback((next: SettingsMain): boolean => {
    if (!uid) return false
    try {
      writeJson(storageKeys.settings(uid), { ...next, updatedAt: new Date().toISOString() })
      setSettings(getSettings(uid))
      return true
    } catch {
      return false
    }
  }, [uid])

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

  return <SettingsContext.Provider value={{ settings, choose, save, reload }}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsApi {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings fuori da SettingsProvider')
  return ctx
}
