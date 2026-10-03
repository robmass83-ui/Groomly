import type { ReactNode } from 'react'
import { ToastProvider } from '../components/layout/Toast'
import { SessionProvider } from '../hooks/useSession'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  )
}
