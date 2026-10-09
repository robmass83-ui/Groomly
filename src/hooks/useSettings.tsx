import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { firebaseEnabled, notifySaveFailed, readsLocal } from '../data/firebase/enabled'
import { getAccount } from '../data/local/auth'
import { blankSettings, getSettings, setTheme, type SettingsMain } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'
import { useSession } from './useSession'
import type { ThemeChoice } from '../theme/theme'
import { applyTheme, prefersDark, resolveTheme } from '../theme/theme'
import { mergePendingSettings } from '../lib/pendingPhoto'
import { useLocalData } from './useLocalData'

type SettingsApi = {
  settings: SettingsMain
  choose: (theme: ThemeChoice) => boolean
  save: (next: SettingsMain) => boolean
  reload: () => void
}

const SettingsContext = createContext<SettingsApi | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { gate } = useSession()
  const local = useLocalData()
  const uid = gate.kind === 'in' ? gate.account.uid : gate.kind === 'out' ? getAccount()?.uid ?? null : null
  const [settings, setSettings] = useState<SettingsMain>(() => {
    if (!uid) return blankSettings('auto', '')
    if (firebaseEnabled() && !readsLocal()) return blankSettings('auto', '')
    return getSettings(uid)
  })

  useEffect(() => {
    if (!uid) return
    if (!firebaseEnabled() || readsLocal()) {
      setSettings(getSettings(uid))
      return
    }
    let cancelled = false
    let stop = () => {}
    void import('../data/firebase/client').then((mod) => mod.listenSettings(uid, (next) => {
      if (!cancelled) setSettings((current) => mergePendingSettings(next, current))
    })).then((unsub) => {
      if (cancelled) unsub()
      else stop = unsub
    }).catch(() => notifySaveFailed())
    return () => {
      cancelled = true
      stop()
    }
  }, [uid, local])

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
    if (firebaseEnabled() && !readsLocal()) return
    setSettings(getSettings(uid))
  }, [uid])

  const save = useCallback((next: SettingsMain): boolean => {
    if (!uid) return false
    if (!firebaseEnabled() || readsLocal()) {
      try {
        writeJson(storageKeys.settings(uid), { ...next, updatedAt: new Date().toISOString() })
        setSettings(getSettings(uid))
        return true
      } catch {
        return false
      }
    }
    const stamped = { ...next, updatedAt: new Date().toISOString() }
    setSettings(stamped)
    void import('../data/firebase/client').then((mod) => mod.saveSettings(uid, stamped)).catch(() => notifySaveFailed())
    return true
  }, [uid])

  function choose(theme: ThemeChoice): boolean {
    if (!uid) return false
    const previous = settings.theme
    applyTheme(resolveTheme(theme, prefersDark()))
    if (!firebaseEnabled() || readsLocal()) {
      try {
        setSettings(setTheme(uid, theme))
        return true
      } catch {
        applyTheme(resolveTheme(previous, prefersDark()))
        return false
      }
    }
    const next = { ...settings, theme, updatedAt: new Date().toISOString() }
    setSettings(next)
    void import('../data/firebase/client').then((mod) => mod.saveSettings(uid, next)).catch(() => {
      applyTheme(resolveTheme(previous, prefersDark()))
      setSettings((current) => ({ ...current, theme: previous }))
      notifySaveFailed()
    })
    return true
  }

  return <SettingsContext.Provider value={{ settings, choose, save, reload }}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsApi {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings fuori da SettingsProvider')
  return ctx
}
