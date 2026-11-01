import type { ReactElement } from 'react'
import { Navigate } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { vedeIncassi } from '../lib/salonAccess'

export function SoloIncassi({ children }: { children: ReactElement }): ReactElement {
  const { gate } = useSession()
  const role = gate.kind === 'in' ? gate.account.role : undefined
  if (!vedeIncassi(role)) return <Navigate to="/" replace />
  return children
}
