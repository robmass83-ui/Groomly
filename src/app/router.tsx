import { Fragment, useEffect, useMemo, useRef, type ReactElement } from 'react'
import {
  Navigate,
  useLocation,
  useRoutes,
  type RouteObject,
} from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { useDataRefresh } from '../lib/dataRefresh'
import { appointmentBackTarget, isSheetPath, readBackground, splitTarget } from '../lib/sheetRoute'
import { dogExistsFor } from './sheetHistory'
import { PushHost } from './PushHost'
import { SystemBack } from './SystemBack'
import { StaffLock } from '../components/AccessoSospeso'
import { AppointmentPage } from '../pages/AppointmentPage'
import { ClosurePage } from '../pages/ClosurePage'
import { PersonalAppointmentPage } from '../pages/PersonalAppointmentPage'
import { CalendarPage } from '../pages/CalendarPage'
import { DogPage } from '../pages/DogPage'
import { DogsPage } from '../pages/DogsPage'
import { DevKitPage } from '../pages/DevKitPage'
import { EarningsPage } from '../pages/EarningsPage'
import { EarningsReportPage } from '../pages/EarningsReportPage'
import { HomePage } from '../pages/HomePage'
import { InvitePage } from '../pages/InvitePage'
import { LoginPage } from '../pages/LoginPage'
import { MonthlyPage } from '../pages/MonthlyPage'
import { ListinoPage } from '../pages/ListinoPage'
import { PriceSheetExportPage } from '../pages/PriceSheetExportPage'
import { PriceSheetManagePage } from '../pages/PriceSheetManagePage'
import { PriceSheetPricesPage } from '../pages/PriceSheetPricesPage'
import { PriceViewPage } from '../pages/PriceViewPage'
import { ArchivePage } from '../pages/ArchivePage'
import { ProPage } from '../pages/ProPage'
import { NotificationsPage } from '../pages/NotificationsPage'
import { ReleaseHistoryPage } from '../pages/ReleaseHistoryPage'
import { ServicesPage } from '../pages/ServicesPage'
import { SettingsPage } from '../pages/SettingsPage'
import { UsersPage } from '../pages/UsersPage'

function Guard({ children }: { children: ReactElement }) {
  const { gate, entry } = useSession()
  if (gate.kind === 'pending') return null
  if (gate.kind !== 'in' || entry.kind !== 'home') return <Navigate to="/login" replace />
  return <StaffLock>{children}</StaffLock>
}

function StaffSettings({ children }: { children: ReactElement }) {
  const { gate } = useSession()
  if (gate.kind === 'in' && gate.account.role === 'collaboratore') return <Navigate to="/impostazioni" replace />
  return children
}

function SheetRoutes({ routes }: { routes: RouteObject[] }) {
  return useRoutes(routes)
}

function SheetLayer({ pageRoutes, sheetRoutes }: { pageRoutes: RouteObject[]; sheetRoutes: RouteObject[] }) {
  const location = useLocation()
  const stamp = useDataRefresh()
  const { gate, entry } = useSession()
  const uid = gate.kind === 'in' ? gate.account.uid : null
  const sheet = isSheetPath(location.pathname)
  const fromState = readBackground(location.state)
  const fallbackTarget = sheet && !fromState ? appointmentBackTarget(location.search, dogExistsFor(uid)) : null
  const background = useMemo(
    () => fromState ?? (fallbackTarget ? splitTarget(fallbackTarget) : null),
    [fromState?.pathname, fromState?.search, fromState?.hash, fallbackTarget],
  )
  const covered = sheet && background !== null
  const pageRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = pageRef.current
    if (!node) return
    node.inert = covered
  }, [covered])
  // Un solo albero di pagine: sotto il foglio mostra la pagina di partenza,
  // altrimenti quella dell'indirizzo. Resta nella stessa posizione, quindi non si rimonta.
  const page = useRoutes(pageRoutes, covered ? background : location)
  return (
    <>
      {gate.kind === 'in' && entry.kind === 'home' ? <PushHost /> : null}
      <SystemBack />
      <div ref={pageRef} data-testid="page-layer" aria-hidden={covered ? 'true' : undefined} style={{ display: 'contents' }}>
        <Fragment key={stamp}>{page}</Fragment>
      </div>
      {covered ? <SheetRoutes routes={sheetRoutes} /> : null}
    </>
  )
}

export function buildRoutes(isDev: boolean): RouteObject[] {
  const pageRoutes: RouteObject[] = [
    { path: '/login', element: <LoginSwitch /> },
    { path: '/invito/:token', element: <InvitePage /> },
    { path: '/', element: <Guard><HomePage /></Guard> },
    { path: '/animali', element: <Guard><DogsPage /></Guard> },
    { path: '/animali/nuovo', element: <Guard><DogPage /></Guard> },
    { path: '/animali/:id', element: <Guard><DogPage /></Guard> },
    { path: '/calendario', element: <Guard><CalendarPage /></Guard> },
    { path: '/mensili', element: <Guard><MonthlyPage /></Guard> },
    { path: '/incassi', element: <Guard><EarningsPage /></Guard> },
    { path: '/incassi/report', element: <Guard><EarningsReportPage /></Guard> },
    { path: '/listino', element: <Guard><ListinoPage /></Guard> },
    { path: '/listino/vedi', element: <Guard><PriceViewPage /></Guard> },
    { path: '/listino/prezzi', element: <Guard><StaffSettings><PriceSheetPricesPage /></StaffSettings></Guard> },
    { path: '/listino/gestione', element: <Guard><StaffSettings><PriceSheetManagePage /></StaffSettings></Guard> },
    { path: '/listino/stampa', element: <Guard><PriceSheetExportPage /></Guard> },
    { path: '/impostazioni', element: <Guard><SettingsPage /></Guard> },
    { path: '/impostazioni/servizi', element: <Guard><StaffSettings><ServicesPage /></StaffSettings></Guard> },
    { path: '/impostazioni/archivio', element: <Guard><StaffSettings><ArchivePage /></StaffSettings></Guard> },
    { path: '/impostazioni/pro', element: <Guard><StaffSettings><ProPage /></StaffSettings></Guard> },
    { path: '/impostazioni/notifiche', element: <Guard><NotificationsPage /></Guard> },
    { path: '/impostazioni/aggiornamenti', element: <Guard><ReleaseHistoryPage /></Guard> },
    { path: '/impostazioni/utenti', element: <Guard><UsersPage /></Guard> },
  ]
  if (isDev) pageRoutes.push({ path: '/dev/kit', element: <Guard><DevKitPage /></Guard> })
  const sheetRoutes: RouteObject[] = [
    { path: '/appuntamenti/nuovo', element: <Guard><AppointmentPage /></Guard> },
    { path: '/appuntamenti/personale/nuovo', element: <Guard><PersonalAppointmentPage /></Guard> },
    { path: '/appuntamenti/personale/:id', element: <Guard><PersonalAppointmentPage /></Guard> },
    { path: '/appuntamenti/:id', element: <Guard><AppointmentPage /></Guard> },
    { path: '/chiusure/nuovo', element: <Guard><ClosurePage /></Guard> },
    { path: '/chiusure/:id', element: <Guard><ClosurePage /></Guard> },
  ]
  const fallback: RouteObject = { path: '*', element: <Navigate to="/" replace /> }
  return [
    {
      path: '*',
      element: <SheetLayer pageRoutes={[...pageRoutes, fallback]} sheetRoutes={sheetRoutes} />,
    },
  ]
}

function LoginSwitch() {
  const { gate, entry } = useSession()
  if (gate.kind === 'pending') return null
  // Chi è entrato ma deve confermare l'email o riparare il salone resta qui, anche se autenticato.
  if (gate.kind === 'in' && entry.kind === 'home') return <Navigate to="/" replace />
  return <LoginPage />
}
