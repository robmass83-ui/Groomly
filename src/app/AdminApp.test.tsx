// @vitest-environment happy-dom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LinguaProvider } from '../i18n/LinguaContext'
import { rotteSitoAdmin } from './AdminApp'

type Stato = { gate: { kind: string; account?: unknown }; entry: { kind: string } }

const s = vi.hoisted(() => ({
  valore: null as Stato | null,
  login: vi.fn(async (_email: string, _password: string) => undefined),
  sendReset: vi.fn(async (_email: string) => undefined),
  esci: vi.fn(),
}))

vi.mock('../hooks/useSettings', () => ({ useSettings: () => ({ theme: 'light' }) }))
vi.mock('../hooks/useSession', async (original) => ({
  ...await original<typeof import('../hooks/useSession')>(),
  useSession: () => ({ ...s.valore, login: s.login, sendReset: s.sendReset }),
}))
vi.mock('../hooks/useEsci', () => ({ useEsci: () => ({ esci: s.esci, foglio: null, occupato: false }) }))
vi.mock('../pages/admin/PanoramicaPage', () => ({ PanoramicaPage: () => <p>console</p> }))
vi.mock('../components/admin/AdminDati', () => ({ AdminDatiProvider: ({ children }: { children: ReactElement }) => children }))
vi.mock('../components/admin/AdminLayout', async () => {
  const { Outlet } = await import('react-router-dom')
  return { AdminLayout: () => <Outlet /> }
})

const FUORI: Stato = { gate: { kind: 'out' }, entry: { kind: 'home' } }
const ADMIN: Stato = { gate: { kind: 'in', account: { uid: 'a' } }, entry: { kind: 'admin' } }
const SALONE: Stato = { gate: { kind: 'in', account: { uid: 'b' } }, entry: { kind: 'home' } }

function Pagine() {
  return useRoutes(rotteSitoAdmin())
}

function apri(indirizzo: string, stato: Stato) {
  s.valore = stato
  render(<LinguaProvider><MemoryRouter initialEntries={[indirizzo]}><Pagine /></MemoryRouter></LinguaProvider>)
}

beforeEach(() => {
  s.login.mockClear()
  s.sendReset.mockClear()
  s.esci.mockClear()
})

describe('sito admin', () => {
  it('chi non è entrato vede il login, senza registrazione', () => {
    apri('/admin', FUORI)
    expect(screen.getByRole('button', { name: 'Entra' })).toBeInTheDocument()
    expect(screen.queryByText(/Registrati|Crea un account/i)).not.toBeInTheDocument()
  })

  it('il login passa email e password alla sessione', async () => {
    const user = userEvent.setup()
    apri('/login', FUORI)
    await user.type(screen.getByLabelText('Email'), 'Admin@Groomly.it')
    await user.type(screen.getByLabelText('Password'), 'segreta123')
    await user.click(screen.getByRole('button', { name: 'Entra' }))
    await waitFor(() => expect(s.login).toHaveBeenCalledWith('admin@groomly.it', 'segreta123'))
  })

  it('un login fallito lo dice e resta lì', async () => {
    s.login.mockRejectedValueOnce(new Error('no'))
    const user = userEvent.setup()
    apri('/login', FUORI)
    await user.type(screen.getByLabelText('Email'), 'a@b.it')
    await user.type(screen.getByLabelText('Password'), 'x')
    await user.click(screen.getByRole('button', { name: 'Entra' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('il recupero password chiede l’email e non dice se esiste', async () => {
    const user = userEvent.setup()
    apri('/login', FUORI)
    await user.type(screen.getByLabelText('Email'), 'a@b.it')
    await user.click(screen.getByRole('button', { name: 'Password dimenticata' }))
    await waitFor(() => expect(s.sendReset).toHaveBeenCalledWith('a@b.it'))
    expect(await screen.findByText(/Se l’indirizzo è registrato/)).toBeInTheDocument()
  })

  it('l’admin dal login va in Console', () => {
    apri('/login', ADMIN)
    expect(screen.getByText('console')).toBeInTheDocument()
  })

  it.each(['/admin', '/login', '/admin/saloni'])('senza claim su %s: Accesso riservato ed Esci', async (indirizzo) => {
    const user = userEvent.setup()
    apri(indirizzo, SALONE)
    expect(screen.getByRole('heading', { name: 'Accesso riservato' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Esci' }))
    expect(s.esci).toHaveBeenCalled()
  })

  it.each(['/', '/animali', '/impostazioni'])('%s porta in Console: le pagine del salone qui non esistono', (indirizzo) => {
    apri(indirizzo, ADMIN)
    expect(screen.getByText('console')).toBeInTheDocument()
  })

  it('mentre la sessione carica non mostra nulla', () => {
    apri('/admin', { gate: { kind: 'pending' }, entry: { kind: 'home' } })
    expect(screen.queryByRole('button', { name: 'Entra' })).not.toBeInTheDocument()
    expect(screen.queryByText('console')).not.toBeInTheDocument()
  })
})
