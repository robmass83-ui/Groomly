import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SalonAccess } from '../lib/salonRoster'

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  push: null as null | ((access: SalonAccess) => void),
  rileggi: vi.fn(),
  dopoCambio: vi.fn(),
  torna: vi.fn(),
  sostituisci: vi.fn(),
  ruolo: 'collaboratore' as 'collaboratore' | 'socio',
}))

vi.mock('../hooks/useSession', () => ({
  useSession: () => ({
    gate: {
      kind: 'in',
      account: { uid: 'c1', role: mocks.ruolo, salonId: 's1', email: 'c@salone.it', firstName: 'Ciro', lastName: 'Zeta', legacy: false },
    },
    entry: { kind: 'home' },
    logout: mocks.logout,
    replaceAccount: mocks.sostituisci,
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
  callTornaAlMioSalone: () => mocks.torna(),
}))

vi.mock('../data/local/cambioSalone', () => ({
  dopoCambioSalone: (uid: string) => mocks.dopoCambio(uid),
}))

import { LinguaProvider } from '../i18n/LinguaContext'
import { StaffLock, navigazione } from './AccessoSospeso'

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
    mocks.torna.mockReset().mockResolvedValue(undefined)
    mocks.sostituisci.mockReset()
    mocks.ruolo = 'collaboratore'
  })

  it('con il piano spento spiega e fa uscire', async () => {
    const user = userEvent.setup()
    render(<StaffLock><p>Agenda</p></StaffLock>)
    await vi.waitFor(() => expect(mocks.push).toBeTypeOf('function'))
    mocks.push?.({ enabled: false, members: [member], openInviteExpiries: [] })
    expect(await screen.findByText('Il tuo accesso a iPelosetti è sospeso')).toBeInTheDocument()
    expect(screen.queryByText('Agenda')).not.toBeInTheDocument()
    expect(screen.getByText('Il piano Salon di iPelosetti non è attivo. I dati del salone non sono persi.')).toBeInTheDocument()
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
    expect(screen.getByText('The Salon plan of iPelosetti is not active. The salon data is not lost.')).toBeInTheDocument()
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
    expect(screen.queryByText('Il piano Salon di iPelosetti non è attivo. I dati del salone non sono persi.')).not.toBeInTheDocument()
    expect(screen.queryByText('Agenda')).not.toBeInTheDocument()
  })

  it('piano spento con membro attivo: messaggio di oggi, nessuna rilettura', async () => {
    render(<StaffLock><p>Agenda</p></StaffLock>)
    await vi.waitFor(() => expect(mocks.push).toBeTypeOf('function'))
    mocks.push?.({ enabled: false, members: [member], openInviteExpiries: [] })
    expect(await screen.findByText('Il piano Salon di iPelosetti non è attivo. I dati del salone non sono persi.')).toBeInTheDocument()
    expect(mocks.rileggi).not.toHaveBeenCalled()
  })

  it('rilettura fallita: messaggio di oggi, una sola chiamata', async () => {
    mocks.rileggi.mockRejectedValue(new Error('rete'))
    render(<StaffLock><p>Agenda</p></StaffLock>)
    await vi.waitFor(() => expect(mocks.push).toBeTypeOf('function'))
    mocks.push?.({ enabled: false, members: [revocato], elencoNegato: true, openInviteExpiries: [] })
    expect(await screen.findByText('Il piano Salon di iPelosetti non è attivo. I dati del salone non sono persi.')).toBeInTheDocument()
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
    expect(await screen.findByText('Il piano Salon di iPelosetti non è attivo. I dati del salone non sono persi.')).toBeInTheDocument()
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
    const riapri = vi.spyOn(navigazione, 'riapri').mockImplementation(() => undefined)
    mocks.push?.({ enabled: true, members: [revocato], openInviteExpiries: [] })
    await vi.waitFor(() => expect(riapri).toHaveBeenCalledOnce())
    expect(screen.queryByText('Agenda')).not.toBeInTheDocument()
    expect(screen.queryByText('Il piano Salon di iPelosetti non è attivo. I dati del salone non sono persi.')).not.toBeInTheDocument()
    expect(screen.getByText("Carico l'agenda…", { exact: false })).toBeInTheDocument()
    riapri.mockRestore()
  })

  it('revoca reale: elenco negato con il proprio membro ancora attivo in cache: una rilettura e riparte', async () => {
    mocks.rileggi.mockResolvedValue(account)
    render(<StaffLock><p>Agenda</p></StaffLock>)
    await vi.waitFor(() => expect(mocks.push).toBeTypeOf('function'))
    mocks.push?.({ enabled: true, members: [member], openInviteExpiries: [] })
    expect(await screen.findByText('Agenda')).toBeInTheDocument()
    expect(mocks.rileggi).not.toHaveBeenCalled()
    mocks.push?.({ enabled: false, members: [member], elencoNegato: true, openInviteExpiries: [] })
    await vi.waitFor(() => expect(mocks.dopoCambio).toHaveBeenCalledOnce())
    expect(mocks.dopoCambio).toHaveBeenCalledWith('c1')
    expect(mocks.rileggi).toHaveBeenCalledOnce()
  })

  it('Torna al mio salone: conferma, torna e riparte', async () => {
    const user = userEvent.setup()
    render(<StaffLock><p>Agenda</p></StaffLock>)
    await vi.waitFor(() => expect(mocks.push).toBeTypeOf('function'))
    mocks.push?.({ enabled: false, members: [member], openInviteExpiries: [] })
    await user.click(await screen.findByRole('button', { name: 'Torna al mio salone' }))
    expect(mocks.torna).not.toHaveBeenCalled()
    expect(screen.getByText('Lascerai il salone iPelosetti. Potrai rientrarci solo con un nuovo invito.')).toBeInTheDocument()
    const dialogo = screen.getByRole('dialog')
    await user.click(within(dialogo).getByRole('button', { name: 'Torna al mio salone' }))
    await vi.waitFor(() => expect(mocks.dopoCambio).toHaveBeenCalledWith('c1'))
    expect(mocks.torna).toHaveBeenCalledOnce()
  })

  it('Torna al mio salone fallito: errore nel dialogo, nessun riavvio', async () => {
    const user = userEvent.setup()
    mocks.torna.mockRejectedValue(new Error('rete'))
    render(<StaffLock><p>Agenda</p></StaffLock>)
    await vi.waitFor(() => expect(mocks.push).toBeTypeOf('function'))
    mocks.push?.({ enabled: false, members: [member], openInviteExpiries: [] })
    await user.click(await screen.findByRole('button', { name: 'Torna al mio salone' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Torna al mio salone' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(mocks.dopoCambio).not.toHaveBeenCalled()
  })

  it('ruolo cambiato dal titolare: rilegge account una volta e lo sostituisce', async () => {
    mocks.ruolo = 'socio'
    const nuovo = { uid: 'c1', role: 'collaboratore' as const, salonId: 's1', email: 'c@salone.it', firstName: 'Ciro', lastName: 'Zeta', legacy: false }
    mocks.rileggi.mockResolvedValue(nuovo)
    render(<StaffLock><p>Agenda</p></StaffLock>)
    await vi.waitFor(() => expect(mocks.push).toBeTypeOf('function'))
    mocks.push?.({ enabled: true, members: [member], openInviteExpiries: [] })
    await vi.waitFor(() => expect(mocks.sostituisci).toHaveBeenCalledWith(nuovo))
    mocks.push?.({ enabled: true, members: [{ ...member, lastName: 'Y' }], openInviteExpiries: [] })
    await Promise.resolve()
    expect(mocks.rileggi).toHaveBeenCalledOnce()
  })
})
