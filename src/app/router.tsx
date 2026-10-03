import type { ReactElement } from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'
import { PlaceholderPage } from '../pages/PlaceholderPage'
import { SettingsPage } from '../pages/SettingsPage'
import { DevKitPage } from '../pages/DevKitPage'
import { ServicesPage } from '../pages/ServicesPage'

function Guard({ children }: { children: ReactElement }) {
  const { gate } = useSession()
  if (gate.kind !== 'in') return <Navigate to="/login" replace />
  return children
}

export function buildRoutes(isDev: boolean): RouteObject[] {
  const routes: RouteObject[] = [
    { path: '/login', element: <LoginSwitch /> },
    { path: '/', element: <Guard><HomePage /></Guard> },
    { path: '/animali', element: <Guard><PlaceholderPage title="Animali" /></Guard> },
    { path: '/calendario', element: <Guard><PlaceholderPage title="Calendario" /></Guard> },
    { path: '/listino', element: <Guard><PlaceholderPage title="Listino" /></Guard> },
    { path: '/impostazioni', element: <Guard><SettingsPage /></Guard> },
    { path: '/impostazioni/servizi', element: <Guard><ServicesPage /></Guard> },
  ]
  if (isDev) routes.push({ path: '/dev/kit', element: <Guard><DevKitPage /></Guard> })
  routes.push({ path: '*', element: <Navigate to="/" replace /> })
  return routes
}

function LoginSwitch() {
  const { gate } = useSession()
  if (gate.kind === 'in') return <Navigate to="/" replace />
  return <LoginPage />
}
