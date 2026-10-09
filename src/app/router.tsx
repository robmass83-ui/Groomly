import type { ReactElement } from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { AppointmentPage } from '../pages/AppointmentPage'
import { CalendarPage } from '../pages/CalendarPage'
import { DogPage } from '../pages/DogPage'
import { DogsPage } from '../pages/DogsPage'
import { DevKitPage } from '../pages/DevKitPage'
import { HomePage } from '../pages/HomePage'
import { LoginPage } from '../pages/LoginPage'
import { MonthlyPage } from '../pages/MonthlyPage'
import { ListinoPage } from '../pages/ListinoPage'
import { PriceViewPage } from '../pages/PriceViewPage'
import { ServicesPage } from '../pages/ServicesPage'
import { SettingsPage } from '../pages/SettingsPage'

function Guard({ children }: { children: ReactElement }) {
  const { gate } = useSession()
  if (gate.kind !== 'in') return <Navigate to="/login" replace />
  return children
}

export function buildRoutes(isDev: boolean): RouteObject[] {
  const routes: RouteObject[] = [
    { path: '/login', element: <LoginSwitch /> },
    { path: '/', element: <Guard><HomePage /></Guard> },
    { path: '/animali', element: <Guard><DogsPage /></Guard> },
    { path: '/animali/nuovo', element: <Guard><DogPage /></Guard> },
    { path: '/animali/:id', element: <Guard><DogPage /></Guard> },
    { path: '/calendario', element: <Guard><CalendarPage /></Guard> },
    { path: '/appuntamenti/nuovo', element: <Guard><AppointmentPage /></Guard> },
    { path: '/appuntamenti/:id', element: <Guard><AppointmentPage /></Guard> },
    { path: '/mensili', element: <Guard><MonthlyPage /></Guard> },
    { path: '/listino', element: <Guard><ListinoPage /></Guard> },
    { path: '/listino/vedi', element: <Guard><PriceViewPage /></Guard> },
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
