// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, useLocation, useRoutes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetDopoAccesso, ricordaDestinazione } from '../data/local/dopoAccesso'
import { buildRoutes } from './router'

type Stato = { gate: unknown; entry: { kind: string }; admin: boolean; ruoloCaricato: boolean }

const sessione = vi.hoisted(() => ({ valore: null as Stato | null, salone: vi.fn() }))

vi.mock('../hooks/useSession', async (importOriginal) => ({
  ...await importOriginal<typeof import('../hooks/useSession')>(),
  useSession: () => sessione.valore,
}))
vi.mock('../pages/admin/PanoramicaPage', () => ({ PanoramicaPage: () => <p>manager</p> }))
vi.mock('../pages/admin/ComunicazioniPage', () => ({ ComunicazioniPage: () => <p>comunicazioni</p> }))
vi.mock('../pages/admin/SaloniPage', () => ({ SaloniPage: () => <p>saloni</p> }))
vi.mock('../components/admin/AdminDati', () => ({ AdminDatiProvider: ({ children }: { children: ReactElement }) => children }))
vi.mock('../components/admin/AdminLayout', async () => {
  const { Outlet } = await import('react-router-dom')
  return { AdminLayout: () => <Outlet /> }
})
vi.mock('../pages/HomePage', () => ({
  HomePage: () => {
    sessione.salone()
    return <p>home del salone</p>
  },
}))
vi.mock('../pages/LoginPage', () => ({ LoginPage: () => <p>login</p> }))
vi.mock('../components/AccessoSospeso', () => ({ StaffLock: ({ children }: { children: ReactElement }) => children }))
vi.mock('./PushHost', () => ({ PushHost: () => null }))
vi.mock('./TourAvvio', () => ({ TourAvvio: () => null }))
vi.mock('./RimandoInvito', () => ({ RimandoInvito: () => null }))
vi.mock('../components/beta/AperturaFineBeta', () => ({ AperturaFineBeta: () => null }))
vi.mock('../hooks/usePiano', async (importOriginal) => ({
  ...await importOriginal<typeof import('../hooks/usePiano')>(),
  PaywallPiano: () => null,
}))

const ACCOUNT = { uid: 'u1', email: 'x@y.it', salonId: 'u1' }
const ADMIN: Stato = { gate: { kind: 'in', account: { ...ACCOUNT, salonId: '', admin: true } }, entry: { kind: 'admin' }, admin: true, ruoloCaricato: true }
const SALONE: Stato = { gate: { kind: 'in', account: ACCOUNT }, entry: { kind: 'home' }, admin: false, ruoloCaricato: true }
const FUORI: Stato = { gate: { kind: 'out' }, entry: { kind: 'home' }, admin: false, ruoloCaricato: true }

function Pagine() {
  const pagina = useRoutes(buildRoutes(false))
  const { pathname, search } = useLocation()
  return <>{pagina}<output data-testid="indirizzo">{pathname + search}</output></>
}

function apri(indirizzo: string, stato: Stato) {
  sessione.valore = stato
  render(<MemoryRouter initialEntries={[indirizzo]}><Pagine /></MemoryRouter>)
  return screen.getByTestId('indirizzo').textContent
}

describe('rotte admin', () => {
  beforeEach(() => {
    sessionStorage.clear()
    __resetDopoAccesso()
    sessione.salone.mockClear()
  })
  afterEach(cleanup)

  it.each(['/', '/animali', '/impostazioni', '/calendario'])('l’admin su %s finisce in /admin', (indirizzo) => {
    expect(apri(indirizzo, ADMIN)).toBe('/admin')
    expect(screen.getByText('manager')).toBeInTheDocument()
    expect(sessione.salone).not.toHaveBeenCalled()
  })

  it('l’admin dal login va in /admin, anche con una pagina del salone ricordata', () => {
    ricordaDestinazione('/animali')
    expect(apri('/login', ADMIN)).toBe('/admin')
  })

  it('dal login l’admin torna alla pagina admin ricordata', () => {
    ricordaDestinazione('/admin/saloni')
    expect(apri('/login', ADMIN)).toBe('/admin/saloni')
  })

  it('i vecchi avvisi admin portano a Comunicazioni', () => {
    expect(apri('/admin/avvisi', ADMIN)).toBe('/admin/comunicazioni')
    expect(screen.getByText('comunicazioni')).toBeInTheDocument()
  })

  it('un indirizzo admin sconosciuto porta alla Panoramica', () => {
    expect(apri('/admin/metriche', ADMIN)).toBe('/admin')
  })

  it.each(['/admin', '/admin/avvisi', '/admin/saloni'])('chi ha un salone su %s torna alla Home', (indirizzo) => {
    expect(apri(indirizzo, SALONE)).toBe('/')
    expect(screen.getByText('home del salone')).toBeInTheDocument()
  })

  it('chi non è entrato su /admin va al login', () => {
    expect(apri('/admin', FUORI)).toBe('/login')
  })

  it('i vecchi link conservano i parametri', () => {
    expect(apri('/impostazioni/admin-manager?tab=saloni', ADMIN)).toBe('/admin/saloni')
    cleanup()
    expect(apri('/admin?tab=saloni', ADMIN)).toBe('/admin/saloni')
  })

  it('un vecchio link aperto da un salone torna alla Home', () => {
    expect(apri('/impostazioni/admin-manager?tab=saloni', SALONE)).toBe('/')
  })
})
