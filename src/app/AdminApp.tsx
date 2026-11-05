import { useMemo, type ReactElement } from 'react'
import { Navigate, RouterProvider, createBrowserRouter, type RouteObject } from 'react-router-dom'
import { ToastProvider } from '../components/layout/Toast'
import { SessionProvider, useSession } from '../hooks/useSession'
import { SettingsProvider } from '../hooks/useSettings'
import { LinguaProvider } from '../i18n/LinguaContext'
import { PERCORSO_ADMIN } from '../lib/percorsoAdmin'
import { AccessoRiservatoPage } from '../pages/admin/AccessoRiservatoPage'
import { AdminLoginPage } from '../pages/admin/AdminLoginPage'
import { adminRoutes } from './adminRoutes'

function GuardiaSito({ children }: { children: ReactElement }) {
  const { gate, entry } = useSession()
  if (gate.kind === 'pending') return null
  if (entry.kind === 'admin') return children
  if (gate.kind === 'in') return <AccessoRiservatoPage />
  return <Navigate to="/login" replace />
}

function IngressoSito() {
  const { gate, entry } = useSession()
  if (gate.kind === 'pending') return null
  if (entry.kind === 'admin') return <Navigate to={PERCORSO_ADMIN} replace />
  if (gate.kind === 'in') return <AccessoRiservatoPage />
  return <AdminLoginPage />
}

/** Il sito ha solo login e Console: ogni altro indirizzo porta in Console. */
export function rotteSitoAdmin(): RouteObject[] {
  return [
    { path: '/login', element: <IngressoSito /> },
    ...adminRoutes((pagina) => <GuardiaSito>{pagina}</GuardiaSito>),
    { path: '*', element: <Navigate to={PERCORSO_ADMIN} replace /> },
  ]
}

function Rotte() {
  const router = useMemo(() => createBrowserRouter(rotteSitoAdmin()), [])
  return <RouterProvider router={router} />
}

export function AdminApp() {
  return (
    <SessionProvider>
      <SettingsProvider>
        <LinguaProvider>
          <ToastProvider>
            <Rotte />
          </ToastProvider>
        </LinguaProvider>
      </SettingsProvider>
    </SessionProvider>
  )
}
