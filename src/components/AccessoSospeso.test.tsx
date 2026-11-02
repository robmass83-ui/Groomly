import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SalonAccess } from '../lib/salonRoster'

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  push: null as null | ((access: SalonAccess) => void),
  rileggi: vi.fn(),
  dopoCambio: vi.fn(),
}))

vi.mock('../hooks/useSession', () => ({
  useSession: () => ({
    gate: {
      kind: 'in',
      account: { uid: 'c1', role: 'collaboratore', salonId: 's1', email: 'c@salone.it', firstName: 'Ciro', lastName: 'Zeta', legacy: false },
    },
    entry: { kind: 'home' },
    logout: mocks.logout,
  }),
}))

vi.mock('../hooks/useLocalData', () => ({
  useLocalData: () => false,
}))

vi.mock('../hooks/useSettings', () => ({
  useSettings: () => ({ settings: { business: { salonName: 'iPelosetti', name: '' } } }),
}))

vi.mock('../data/firebase/client', () => ({
  watchSalonAccess: async (_salonId: string, onChange: (access: SalonAccess) => void) => {
    mocks.push = onChange
    return () => undefined
  },
  reloadSignedInAccount: () => mocks.rileggi(),
}))

vi.mock('../data/local/cambioSalone', () => ({
  dopoCambioSalone: (uid: string) => mocks.dopoCambio(uid),
}))

import { LinguaProvider } from '../i18n/LinguaContext'
import { StaffLock } from './AccessoSospeso'

const member = {
  uid: 'c1',
  email: 'c@salone.it',
  role: 'collaboratore' as const,
  firstName: 'Ciro',
  lastName: 'Zeta',
  status: 'attivo' as const,
}

describe('accesso sospeso in app', () => {
  beforeEach(() => {
    mocks.logout.mockReset()
    mocks.push = null
    mocks.rileggi.mockReset()
    mocks.dopoCambio.mockReset()
  })

  it('con il piano spento spiega e fa uscire', async () => {
    const user = userEvent.setup()
    render(<StaffLock><p>Agenda</p></StaffLock>)
    await vi.waitFor(() => expect(mocks.push).toBeTypeOf('function'))
    mocks.push?.({ enabled: false, members: [member], openInviteExpiries: [] })
    expect(await screen.findByText('Il tuo accesso a iPelosetti è sospeso')).toBeInTheDocument()
    expect(screen.queryByText('Agenda')).not.toBeInTheDocument()
    expect(screen.getByText('Il titolare ha spento il piano. I dati non sono persi.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Esci' }))
    expect(mocks.logout).toHaveBeenCalledOnce()
  })

  it('in inglese la schermata non resta in italiano', async () => {
    localStorage.setItem('groomly.lingua', 'en')
    render(<LinguaProvider><StaffLock><p>Agenda</p></StaffLock></LinguaProvider>)
    expect(screen.getByText('Loading the diary…')).toBeInTheDocument()
    await vi.waitFor(() => expect(mocks.push).toBeTypeOf('function'))
    mocks.push?.({ enabled: false, members: [member], openInviteExpiries: [] })
    expect(await screen.findByText('Your access to iPelosetti is suspended')).toBeInTheDocument()
    expect(screen.getByText('The owner turned off the plan. Your data is not lost.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    localStorage.removeItem('groomly.lingua')
  })

  const account = { uid: 'c1', role: 'titolare' as const, salonId: 'c1', email: 'c@salone.it', firstName: 'Ciro', lastName: 'Zeta', legacy: false }
  const revocato = { ...member, status: 'revocato' as const }

  it.each([false, true])('membro tolto (piano acceso: %s) e account riportato nel suo salone: riparte', async (enabled) => {
    mocks.rileggi.mockResolvedValue(account)
    render(<StaffLock><p>Agenda</p></StaffLock>)
    await vi.waitFor(() => expect(mocks.push).toBeTypeOf('function'))
    mocks.push?.({ enabled, members: [revocato], elencoNegato: true, openInviteExpiries: [] })
    await vi.waitFor(() => expect(mocks.dopoCambio).toHaveBeenCalledOnce())
    expect(mocks.dopoCambio).toHaveBeenCalledWith('c1')
    expect(screen.queryByText('Il titolare ha spento il piano. I dati non sono persi.')).not.toBeInTheDocument()
    expect(screen.queryByText('Agenda')).not.toBeInTheDocument()
  })

  it('piano spento con membro attivo: messaggio di oggi, nessuna rilettura', async () => {
    render(<StaffLock><p>Agenda</p></StaffLock>)
    await vi.waitFor(() => expect(mocks.push).toBeTypeOf('function'))
    mocks.push?.({ enabled: false, members: [member], openInviteExpiries: [] })
    expect(await screen.findByText('Il titolare ha spento il piano. I dati non sono persi.')).toBeInTheDocument()
    expect(mocks.rileggi).not.toHaveBeenCalled()
  })

  it('rilettura fallita: messaggio di oggi, una sola chiamata', async () => {
    mocks.rileggi.mockRejectedValue(new Error('rete'))
    render(<StaffLock><p>Agenda</p></StaffLock>)
    await vi.waitFor(() => expect(mocks.push).toBeTypeOf('function'))
    mocks.push?.({ enabled: false, members: [revocato], elencoNegato: true, openInviteExpiries: [] })
    expect(await screen.findByText('Il titolare ha spento il piano. I dati non sono persi.')).toBeInTheDocument()
    mocks.push?.({ enabled: false, members: [revocato], elencoNegato: true, openInviteExpiries: [] })
    mocks.push?.({ enabled: false, members: [{ ...revocato, lastName: 'Y' }], elencoNegato: true, openInviteExpiries: [] })
    await new Promise((r) => setTimeout(r, 20))
    expect(mocks.rileggi).toHaveBeenCalledOnce()
    expect(mocks.dopoCambio).not.toHaveBeenCalled()
  })

  it('account riletto ancora nello stesso salone: messaggio di oggi, nessun riavvio', async () => {
    mocks.rileggi.mockResolvedValue({ ...account, role: 'collaboratore', salonId: 's1' })
    render(<StaffLock><p>Agenda</p></StaffLock>)
    await vi.waitFor(() => expect(mocks.push).toBeTypeOf('function'))
    mocks.push?.({ enabled: false, members: [revocato], elencoNegato: true, openInviteExpiries: [] })
    expect(await screen.findByText('Il titolare ha spento il piano. I dati non sono persi.')).toBeInTheDocument()
    expect(mocks.rileggi).toHaveBeenCalledOnce()
    expect(mocks.dopoCambio).not.toHaveBeenCalled()
  })

  it('elenco senza il proprio membro (non ancora caricato): nessuna rilettura; poi revoca vera: una rilettura e riparte', async () => {
    mocks.rileggi.mockResolvedValue(account)
    render(<StaffLock><p>Agenda</p></StaffLock>)
    await vi.waitFor(() => expect(mocks.push).toBeTypeOf('function'))
    mocks.push?.({ enabled: true, members: [], openInviteExpiries: [] })
    expect(await screen.findByText('Agenda')).toBeInTheDocument()
    expect(mocks.rileggi).not.toHaveBeenCalled()
    mocks.push?.({ enabled: true, members: [member], openInviteExpiries: [] })
    await new Promise((r) => setTimeout(r, 20))
    expect(mocks.rileggi).not.toHaveBeenCalled()
    mocks.push?.({ enabled: true, members: [revocato], openInviteExpiries: [] })
    await vi.waitFor(() => expect(mocks.dopoCambio).toHaveBeenCalledOnce())
    expect(mocks.rileggi).toHaveBeenCalledOnce()
  })

  it('piano spento, proprio membro revocato in elenco completo, stesso salone: comportamento di oggi', async () => {
    mocks.rileggi.mockResolvedValue({ ...account, role: 'collaboratore', salonId: 's1' })
    render(<StaffLock><p>Agenda</p></StaffLock>)
    await vi.waitFor(() => expect(mocks.push).toBeTypeOf('function'))
    mocks.push?.({ enabled: false, members: [revocato, { ...member, uid: 'x9' }], openInviteExpiries: [] })
    await vi.waitFor(() => expect(mocks.rileggi).toHaveBeenCalledOnce())
    expect(await screen.findByText('Agenda')).toBeInTheDocument()
    expect(mocks.dopoCambio).not.toHaveBeenCalled()
  })

  it('caricamento del cambio salone fallito: niente attesa infinita', async () => {
    mocks.rileggi.mockResolvedValue(account)
    mocks.dopoCambio.mockImplementation(() => { throw new Error('chunk') })
    render(<StaffLock><p>Agenda</p></StaffLock>)
    await vi.waitFor(() => expect(mocks.push).toBeTypeOf('function'))
    mocks.push?.({ enabled: true, members: [revocato], openInviteExpiries: [] })
    expect(await screen.findByText('Agenda')).toBeInTheDocument()
  })
})
