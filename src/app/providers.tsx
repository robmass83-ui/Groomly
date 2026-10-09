import { useEffect, type ReactNode } from 'react'
import { ToastProvider } from '../components/layout/Toast'
import { SessionProvider, useSession } from '../hooks/useSession'
import { SettingsProvider, useSettings } from '../hooks/useSettings'
import { maybeDailyBackup } from '../lib/backupDoc'

function DailyBackup() {
  const { gate } = useSession()
  const { reload } = useSettings()
  const uid = gate.kind === 'in' ? gate.account.uid : null
  useEffect(() => {
    if (!uid) return
    try {
      maybeDailyBackup(uid)
      reload()
    } catch {
      return
    }
  }, [uid, reload])
  return null
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SettingsProvider>
        <DailyBackup />
        <ToastProvider>{children}</ToastProvider>
      </SettingsProvider>
    </SessionProvider>
  )
}
