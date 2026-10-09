import { useEffect, type ReactNode } from 'react'
import { ToastProvider, useToast } from '../components/layout/Toast'
import { firebaseEnabled, notifySaveFailed, readsLocal, subscribeSaveFailed } from '../data/firebase/enabled'
import { readJson, storageKeys } from '../data/local/storage'
import { SessionProvider, useSession } from '../hooks/useSession'
import { SettingsProvider, useSettings } from '../hooks/useSettings'
import { backupDay, buildBackup, isEmptyBackup, maybeDailyBackup } from '../lib/backupDoc'

function DailyBackup() {
  const { gate } = useSession()
  const { reload } = useSettings()
  const uid = gate.kind === 'in' ? gate.account.uid : null
  useEffect(() => {
    if (!uid) return
    if (firebaseEnabled() && !readsLocal()) {
      void import('../data/firebase/client').then((mod) => mod.runCloudDailyBackup(uid)).catch(() => notifySaveFailed())
      return
    }
    try {
      const before = readJson<{ backup?: { lastAt?: string } }>(storageKeys.settings(uid))?.backup?.lastAt
      maybeDailyBackup(uid)
      reload()
      if (!firebaseEnabled()) return
      const after = readJson<{ backup?: { lastAt?: string } }>(storageKeys.settings(uid))?.backup?.lastAt
      if (!after || after === before) return
      const bundle = buildBackup(uid)
      if (isEmptyBackup(bundle)) return
      void import('../data/firebase/client').then((mod) => {
        mod.enqueueBackup(backupDay(new Date()), JSON.stringify(bundle))
      })
    } catch {
      return
    }
  }, [uid, reload])
  return null
}

function SaveFailedToast() {
  const toast = useToast()
  useEffect(() => subscribeSaveFailed(() => toast.show('Salvataggio non riuscito', 'plain')), [toast])
  return null
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SettingsProvider>
        <DailyBackup />
        <ToastProvider>
          <SaveFailedToast />
          {children}
        </ToastProvider>
      </SettingsProvider>
    </SessionProvider>
  )
}
