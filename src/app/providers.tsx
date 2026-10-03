import type { ReactNode } from 'react'
import { ToastProvider } from '../components/layout/Toast'
import { SessionProvider } from '../hooks/useSession'
import { SettingsProvider } from '../hooks/useSettings'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SettingsProvider>
        <ToastProvider>{children}</ToastProvider>
      </SettingsProvider>
    </SessionProvider>
  )
}
