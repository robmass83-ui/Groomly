import { Fragment, useEffect, useMemo, useRef, type ReactElement } from 'react'
import {
  Navigate,
  useLocation,
  useRoutes,
  type RouteObject,
} from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { useDataRefresh } from '../lib/dataRefresh'
import { aggiornamentiApkAttivi } from '../lib/distribuzione'
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
import { StatistichePage } from '../pages/StatistichePage'
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
import { AccountPage } from '../pages/AccountPage'
import { InfoGroomlyPage } from '../pages/InfoGroomlyPage'
import { LegalePage } from '../pages/LegalePage'
import { LicenzePage } from '../pages/LicenzePage'
import { SettingsPage } from '../pages/SettingsPage'
import { SuggerimentiPage } from '../pages/SuggerimentiPage'
import { PrivacyPage } from '../pages/PrivacyPage'
import { EliminaAccountPage } from '../pages/EliminaAccountPage'
import { PianoPage, StrumentiPage } from '../pages/PianoPagine'
import { usePiano } from '../hooks/usePiano'
import { haAccesso } from '../lib/piano'
import { useFrasi } from '../i18n/LinguaContext'
import { UsersPage } from '../pages/UsersPage'

function Guard({ children }: { children: ReactElement }) {
  const { gate, entry } = useSession()
  if (gate.kind === 'pending') return null
  if (gate.kind !== 'in' || entry.kind !== 'home') return <Navigate to="/login" replace />
  return <StaffLock>{children}</StaffLock>
}

function ProOTeam() {
  const piano = usePiano()
  if (haAccesso(piano.stato, 'team')) return <Navigate to="/impostazioni/team" replace />
  if (piano.mostraPiani) return <Navigate to="/impostazioni" replace />
  return <ProPage />
}

function TeamRoute() {
  const frasi = useFrasi()
  const piano = usePiano()
  if (!haAccesso(piano.stato, 'team')) return <Navigate to="/impostazioni/pro" replace />
  return <ProPage titolo={frasi.team} />
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

function StoricoAggiornamenti() {
  if (!aggiornamentiApkAttivi()) return <Navigate to="/impostazioni" replace />
  return <ReleaseHistoryPage />
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
    { path: '/incassi/statistiche', element: <Guard><StatistichePage /></Guard> },
    { path: '/listino', element: <Guard><ListinoPage /></Guard> },
    { path: '/listino/vedi', element: <Guard><PriceViewPage /></Guard> },
    { path: '/listino/prezzi', element: <Guard><StaffSettings><PriceSheetPricesPage /></StaffSettings></Guard> },
    { path: '/listino/gestione', element: <Guard><StaffSettings><PriceSheetManagePage /></StaffSettings></Guard> },
    { path: '/listino/stampa', element: <Guard><PriceSheetExportPage /></Guard> },
    { path: '/impostazioni', element: <Guard><SettingsPage /></Guard> },
    { path: '/impostazioni/account', element: <Guard><AccountPage /></Guard> },
    { path: '/impostazioni/suggerimenti', element: <Guard><SuggerimentiPage /></Guard> },
    { path: '/impostazioni/legale', element: <Guard><LegalePage /></Guard> },
    { path: '/impostazioni/licenze', element: <Guard><LicenzePage /></Guard> },
    { path: '/impostazioni/info', element: <Guard><InfoGroomlyPage /></Guard> },
    { path: '/impostazioni/servizi', element: <Guard><StaffSettings><ServicesPage /></StaffSettings></Guard> },
    { path: '/impostazioni/archivio', element: <Guard><StaffSettings><ArchivePage /></StaffSettings></Guard> },
    { path: '/impostazioni/pro', element: <Guard><StaffSettings><ProOTeam /></StaffSettings></Guard> },
    { path: '/impostazioni/piano', element: <Guard><StaffSettings><PianoPage /></StaffSettings></Guard> },
    { path: '/impostazioni/team', element: <Guard><StaffSettings><TeamRoute /></StaffSettings></Guard> },
    { path: '/impostazioni/messaggi', element: <Navigate to="/impostazioni/info" replace /> },
    { path: '/impostazioni/strumenti', element: <Guard><StaffSettings><StrumentiPage /></StaffSettings></Guard> },
    { path: '/impostazioni/notifiche', element: <Guard><NotificationsPage /></Guard> },
    { path: '/impostazioni/aggiornamenti', element: <Guard><StoricoAggiornamenti /></Guard> },
    { path: '/impostazioni/utenti', element: <Guard><UsersPage /></Guard> },
    { path: '/impostazioni/privacy', element: <Guard><PrivacyPage /></Guard> },
    { path: '/impostazioni/account/elimina', element: <Guard><EliminaAccountPage /></Guard> },
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
