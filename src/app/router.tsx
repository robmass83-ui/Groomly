import { useMemo, type ReactElement } from 'react'
import {
  Navigate,
  NavigationType,
  Outlet,
  UNSAFE_LocationContext,
  UNSAFE_RouteContext,
  useLocation,
  useRoutes,
  type RouteObject,
} from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { useDataRefresh } from '../lib/dataRefresh'
import { appointmentBackTarget, isSheetPath, readBackground, splitTarget, type BackgroundLocation } from '../lib/sheetRoute'
import { dogExistsFor } from './sheetHistory'
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
  if (gate.kind === 'pending') return null
  if (gate.kind !== 'in') return <Navigate to="/login" replace />
  return children
}

const NO_PARENT_ROUTE = { outlet: null, matches: [], isDataRoute: false }

function BackgroundRoutes({ routes }: { routes: RouteObject[] }) {
  return useRoutes(routes)
}

function BackgroundPage({ routes, background }: { routes: RouteObject[]; background: BackgroundLocation }) {
  const value = useMemo(() => ({
    location: { ...background, state: null, key: 'background' },
    navigationType: NavigationType.Pop,
  }), [background])
  return (
    <div aria-hidden="true" data-testid="sheet-background">
      <UNSAFE_LocationContext.Provider value={value}>
        <UNSAFE_RouteContext.Provider value={NO_PARENT_ROUTE}>
          <BackgroundRoutes routes={routes} />
        </UNSAFE_RouteContext.Provider>
      </UNSAFE_LocationContext.Provider>
    </div>
  )
}

function SheetLayer({ pageRoutes }: { pageRoutes: RouteObject[] }) {
  const location = useLocation()
  const stamp = useDataRefresh()
  const { gate } = useSession()
  const uid = gate.kind === 'in' ? gate.account.uid : null
  const sheet = isSheetPath(location.pathname)
  const fromState = readBackground(location.state)
  const fallbackTarget = sheet && !fromState ? appointmentBackTarget(location.search, dogExistsFor(uid)) : null
  const background = useMemo(
    () => fromState ?? (fallbackTarget ? splitTarget(fallbackTarget) : null),
    [fromState?.pathname, fromState?.search, fromState?.hash, fallbackTarget],
  )
  if (!sheet || !background) return <Outlet key={stamp} />
  return (
    <>
      <BackgroundPage routes={pageRoutes} background={background} />
      <Outlet />
    </>
  )
}

export function buildRoutes(isDev: boolean): RouteObject[] {
  const pageRoutes: RouteObject[] = [
    { path: '/login', element: <LoginSwitch /> },
    { path: '/', element: <Guard><HomePage /></Guard> },
    { path: '/animali', element: <Guard><DogsPage /></Guard> },
    { path: '/animali/nuovo', element: <Guard><DogPage /></Guard> },
    { path: '/animali/:id', element: <Guard><DogPage /></Guard> },
    { path: '/calendario', element: <Guard><CalendarPage /></Guard> },
    { path: '/mensili', element: <Guard><MonthlyPage /></Guard> },
    { path: '/listino', element: <Guard><ListinoPage /></Guard> },
    { path: '/listino/vedi', element: <Guard><PriceViewPage /></Guard> },
    { path: '/impostazioni', element: <Guard><SettingsPage /></Guard> },
    { path: '/impostazioni/servizi', element: <Guard><ServicesPage /></Guard> },
  ]
  if (isDev) pageRoutes.push({ path: '/dev/kit', element: <Guard><DevKitPage /></Guard> })
  const sheetRoutes: RouteObject[] = [
    { path: '/appuntamenti/nuovo', element: <Guard><AppointmentPage /></Guard> },
    { path: '/appuntamenti/:id', element: <Guard><AppointmentPage /></Guard> },
  ]
  const fallback: RouteObject = { path: '*', element: <Navigate to="/" replace /> }
  return [
    {
      element: <SheetLayer pageRoutes={[...pageRoutes, fallback]} />,
      children: [...pageRoutes, ...sheetRoutes, fallback],
    },
  ]
}

function LoginSwitch() {
  const { gate } = useSession()
  if (gate.kind === 'pending') return null
  if (gate.kind === 'in') return <Navigate to="/" replace />
  return <LoginPage />
}
