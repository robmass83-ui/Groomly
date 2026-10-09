import { useEffect, type ReactNode } from 'react'
import { ToastProvider, useToast } from '../components/layout/Toast'
import { firebaseEnabled, subscribeSaveFailed } from '../data/firebase/enabled'
import { readJson, storageKeys } from '../data/local/storage'
import { SessionProvider, useSession } from '../hooks/useSession'
import { SettingsProvider, useSettings } from '../hooks/useSettings'
import { buildBackup, maybeDailyBackup } from '../lib/backupDoc'

function backupDay(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function DailyBackup() {
  const { gate } = useSession()
  const { reload } = useSettings()
  const uid = gate.kind === 'in' ? gate.account.uid : null
  useEffect(() => {
    if (!uid) return
    try {
      const before = readJson<{ backup?: { lastAt?: string } }>(storageKeys.settings(uid))?.backup?.lastAt
      maybeDailyBackup(uid)
      reload()
      if (!firebaseEnabled()) return
      const after = readJson<{ backup?: { lastAt?: string } }>(storageKeys.settings(uid))?.backup?.lastAt
      if (!after || after === before) return
      const json = JSON.stringify(buildBackup(uid))
      void import('../data/firebase/client').then((mod) => {
        mod.enqueueBackup(backupDay(new Date()), json)
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
