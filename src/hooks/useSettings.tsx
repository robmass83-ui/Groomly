import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { firebaseEnabled, markSalonMirror, notifySaveFailed, readsLocal } from '../data/firebase/enabled'
import { getAccount } from '../data/local/auth'
import { blankSettings, getSettings, type SettingsMain } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'
import { readDeviceTheme, writeDeviceTheme } from '../lib/deviceTheme'
import { useSession } from './useSession'
import type { ThemeChoice } from '../theme/theme'
import { applyTheme, prefersDark, resolveTheme } from '../theme/theme'
import { mergePendingSettings } from '../lib/pendingPhoto'
import { useLocalData } from './useLocalData'

type SettingsApi = {
  settings: SettingsMain
  theme: ThemeChoice
  ready: boolean
  choose: (theme: ThemeChoice) => boolean
  save: (next: SettingsMain) => boolean
  reload: () => void
}

const SettingsContext = createContext<SettingsApi | null>(null)

function waitsForRemoteSettings(uid: string | null): boolean {
  return Boolean(uid) && firebaseEnabled() && !readsLocal()
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { gate, entry } = useSession()
  const local = useLocalData()
  // Con l'email da confermare o il salone da riparare non si ascolta nulla: il salone può non essere agganciato.
  const uid = gate.kind === 'in' ? (entry.kind === 'home' ? gate.account.uid : null) : gate.kind === 'out' ? getAccount()?.uid ?? null : null
  const [settings, setSettings] = useState<SettingsMain>(() => (uid ? getSettings(uid) : blankSettings('auto', '')))
  const [ready, setReady] = useState(() => !waitsForRemoteSettings(uid))
  const [theme, setTheme] = useState<ThemeChoice>(() => readDeviceTheme())

  useEffect(() => {
    if (!uid) {
      setReady(!firebaseEnabled() || readsLocal())
      return
    }
    if (!firebaseEnabled() || readsLocal()) {
      setSettings(getSettings(uid))
      setReady(true)
      return
    }
    let cancelled = false
    let stop = () => {}
    void import('../data/firebase/client').then((mod) => mod.listenSettings(uid, (next) => {
      if (!cancelled) {
        writeJson(storageKeys.settings(uid), next)
        markSalonMirror(uid)
        setSettings((current) => mergePendingSettings(next, current))
        setReady(true)
      }
    })).then((unsub) => {
      if (cancelled) unsub()
      else stop = unsub
    }).catch(() => {
      if (!cancelled) setReady(true)
      notifySaveFailed()
    })
    return () => {
      cancelled = true
      stop()
    }
  }, [uid, local])

  useLayoutEffect(() => {
    setReady(!waitsForRemoteSettings(uid))
  }, [uid])

  useLayoutEffect(() => {
    const apply = () => applyTheme(resolveTheme(theme, prefersDark()))
    apply()
    if (theme !== 'auto') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

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

  function choose(next: ThemeChoice): boolean {
    if (!uid) return false
    const previous = theme
    applyTheme(resolveTheme(next, prefersDark()))
    try {
      writeDeviceTheme(next)
      setTheme(next)
      return true
    } catch {
      applyTheme(resolveTheme(previous, prefersDark()))
      return false
    }
  }

  return <SettingsContext.Provider value={{ settings, theme, ready, choose, save, reload }}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsApi {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings fuori da SettingsProvider')
  return ctx
}
