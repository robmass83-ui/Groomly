// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount, getAccount } from '../data/local/auth'
import { storageKeys, writeJson } from '../data/local/storage'

const desk = vi.hoisted(() => ({
  access: {
    enabled: false,
    members: [] as Array<{
      uid: string
      email: string
      role: 'titolare' | 'socio' | 'collaboratore'
      firstName: string
      lastName: string
      status: 'attivo' | 'revocato'
    }>,
    openInviteExpiries: [] as string[],
  },
  create: vi.fn(async (_email?: string, _role?: string) => undefined),
  revoke: vi.fn(async (_uid?: string) => undefined),
  change: vi.fn(async (_uid?: string, _role?: string) => undefined),
  setPro: vi.fn(async (_salonId?: string, _enabled?: boolean) => undefined),
}))

vi.mock('../data/firebase/client', () => ({
  watchSalonAccess: async (_salonId: string, onChange: (access: typeof desk.access) => void) => {
    onChange(desk.access)
    return () => undefined
  },
  callCreateInvite: (email: string, role: 'socio' | 'collaboratore') => desk.create(email, role),
  callRevokeMember: (uid: string) => desk.revoke(uid),
  callChangeMemberRole: (uid: string, role: 'socio' | 'collaboratore') => desk.change(uid, role),
  callSetSalonPro: (salonId: string, enabled: boolean) => desk.setPro(salonId, enabled),
}))

function remember(extra: { salonId?: string; role?: 'titolare' | 'socio' | 'collaboratore' }) {
  const account = getAccount()
  if (!account) throw new Error('account assente')
  writeJson(storageKeys.auth, { ...account, ...extra })
}

describe('Funzioni Plus', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    desk.access = { enabled: false, members: [], openInviteExpiries: [] }
    desk.create.mockClear()
    desk.revoke.mockClear()
    desk.change.mockClear()
    desk.setPro.mockClear()
  })

  it('Pro spento mostra Non attivo; acceso, anche per Laura, mostra Invita', async () => {
    desk.access = { enabled: true, members: [], openInviteExpiries: [] }
    await createAccount('laura.masala@tiscali.it', 'segretissimo')
    const laura = render(<App memory isDev={false} initialPath="/impostazioni/pro" />)
    expect(await screen.findByRole('heading', { name: 'Funzioni Plus' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Invita nuovo collaboratore' })).toBeInTheDocument()
    expect(screen.getByText('Il socio ha il pieno controllo del salone. Il collaboratore gestisce cani e appuntamenti e vede solo i propri incassi.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Piano Plus' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Attivo')).toBeInTheDocument()
    expect(screen.queryByText('Non attivo')).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Invita nuovo collaboratore' }))
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Invia' })).toBeInTheDocument()
    laura.unmount()

    localStorage.clear()
    desk.access = { enabled: false, members: [], openInviteExpiries: [] }
    await createAccount('laura.masala@tiscali.it', 'segretissimo')
    const off = render(<App memory isDev={false} initialPath="/impostazioni/pro" />)
    expect(await screen.findByText('Non attivo')).toBeInTheDocument()
    expect(screen.getByText(/Accendi il piano per invitare/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Invita nuovo collaboratore' })).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('switch', { name: 'Piano Plus' }))
    expect(desk.setPro).toHaveBeenCalledWith('shared', true)
    expect(await screen.findByRole('button', { name: 'Invita nuovo collaboratore' })).toBeInTheDocument()
    off.unmount()

    localStorage.clear()
    desk.access = { enabled: false, members: [], openInviteExpiries: [] }
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/impostazioni/pro" />)
    expect(await screen.findByRole('heading', { name: 'Funzioni Plus' })).toBeInTheDocument()
    expect(await screen.findByText('Non attivo')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Invita nuovo collaboratore' })).not.toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'Piano Plus' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Invia' })).not.toBeInTheDocument()
  })

  it('Pro acceso: un collaboratore e un invito aperto mostrano 2 di 3 posti', async () => {
    desk.access = {
      enabled: true,
      members: [
        { uid: 'owner', email: 'maria@salone.it', role: 'titolare', firstName: 'Ada', lastName: 'Neri', status: 'attivo' },
        { uid: 'c1', email: 'c@salone.it', role: 'collaboratore', firstName: 'Ciro', lastName: 'Zeta', status: 'attivo' },
      ],
      openInviteExpiries: ['2099-01-01T00:00:00.000Z'],
    }
    const account = await createAccount('maria@salone.it', 'segretissimo')
    remember({ salonId: account.uid, role: 'titolare' })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni/pro" />)
    expect(await screen.findByRole('heading', { name: 'Funzioni Plus' })).toBeInTheDocument()
    expect(await screen.findByText('2 di 3 posti')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Invita nuovo collaboratore' })).toBeInTheDocument()
    expect(screen.getByText('Ciro Zeta')).toBeInTheDocument()
    expect(screen.getByText('c@salone.it')).toBeInTheDocument()
    expect(screen.getByText('Collaboratore')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Socio' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Revoca Ada Neri' })).not.toBeInTheDocument()
    expect(screen.queryByText('Socio')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Revoca Ciro Zeta' }))
    expect(desk.revoke).toHaveBeenCalledWith('c1')
  })

  it('Pro: Invia con email vuota mostra Inserisci un’email valida e non chiama', async () => {
    desk.access = { enabled: true, members: [], openInviteExpiries: [] }
    const account = await createAccount('maria@salone.it', 'segretissimo')
    remember({ salonId: account.uid, role: 'titolare' })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni/pro" />)
    await user.click(await screen.findByRole('button', { name: 'Invita nuovo collaboratore' }))
    await user.click(screen.getByRole('button', { name: 'Invia' }))
    expect(screen.getByText('Inserisci un’email valida')).toBeInTheDocument()
    expect(desk.create).not.toHaveBeenCalled()
  })

  it('Pro: a 3 posti Invia non chiama e mostra Posti esauriti', async () => {
    desk.access = {
      enabled: true,
      members: [],
      openInviteExpiries: ['2099-01-01T00:00:00.000Z', '2099-01-01T00:00:00.000Z', '2099-01-01T00:00:00.000Z'],
    }
    const account = await createAccount('maria@salone.it', 'segretissimo')
    remember({ salonId: account.uid, role: 'titolare' })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni/pro" />)
    expect(await screen.findByText('3 di 3 posti')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Invita nuovo collaboratore' }))
    await user.type(screen.getByLabelText('Email'), 'nuova@salone.it')
    await user.click(screen.getByRole('button', { name: 'Invia' }))
    expect(screen.getByText('Posti esauriti')).toBeInTheDocument()
    expect(desk.create).not.toHaveBeenCalled()
  })

  it('Pro: Invia spedisce l’invito e mostra l’email normalizzata', async () => {
    desk.access = { enabled: true, members: [], openInviteExpiries: [] }
    const account = await createAccount('maria@salone.it', 'segretissimo')
    remember({ salonId: account.uid, role: 'titolare' })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni/pro" />)
    await user.click(await screen.findByRole('button', { name: 'Invita nuovo collaboratore' }))
    const form = screen.getByRole('form', { name: 'Invita' })
    await user.type(within(form).getByLabelText('Email'), ' Nuova@Salone.it ')
    await user.click(within(form).getByRole('button', { name: 'Socio' }))
    expect(within(form).getByRole('button', { name: 'Socio' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(form).getByRole('button', { name: 'Collaboratore' })).toHaveAttribute('aria-pressed', 'false')
    await user.click(within(form).getByRole('button', { name: 'Invia' }))
    expect(desk.create).toHaveBeenCalledWith('nuova@salone.it', 'socio')
    expect(await screen.findByText('Invito spedito a nuova@salone.it')).toBeInTheDocument()
  })

  it('Pro: un collaboratore che apre Funzioni Pro torna alle Impostazioni', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    remember({ salonId: 'titolare-uid', role: 'collaboratore' })
    render(<App memory isDev={false} initialPath="/impostazioni/pro" />)
    expect(await screen.findByRole('heading', { name: 'Impostazioni' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Funzioni Plus' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Invita nuovo collaboratore' })).not.toBeInTheDocument()
    expect(account.uid).not.toBe('')
  })

  it('un socio non vede Revoca sulla propria riga', async () => {
    const account = await createAccount('ada@salone.it', 'segretissimo')
    remember({ salonId: account.uid, role: 'socio' })
    desk.access = {
      enabled: true,
      members: [
        { uid: account.uid, email: 'ada@salone.it', role: 'socio', firstName: 'Ada', lastName: 'Neri', status: 'attivo' },
        { uid: 'c1', email: 'c@salone.it', role: 'collaboratore', firstName: 'Ciro', lastName: 'Zeta', status: 'attivo' },
      ],
      openInviteExpiries: [],
    }
    render(<App memory isDev={false} initialPath="/impostazioni/pro" />)
    expect(await screen.findByText('Ada Neri')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Revoca Ada Neri' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Revoca Ciro Zeta' })).toBeInTheDocument()
  })

  it('Laura e un errore 500 non passano come email del salone', async () => {
    desk.access = { enabled: true, members: [], openInviteExpiries: [] }
    const account = await createAccount('maria@salone.it', 'segretissimo')
    remember({ salonId: account.uid, role: 'titolare' })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni/pro" />)
    await user.click(await screen.findByRole('button', { name: 'Invita nuovo collaboratore' }))
    const form = screen.getByRole('form', { name: 'Invita' })
    expect(form).toHaveProperty('noValidate', true)
    await user.type(within(form).getByLabelText('Email'), 'laura.masala@tiscali.it')
    await user.click(within(form).getByRole('button', { name: 'Invia' }))
    expect(screen.getByText('Questa email non si può invitare')).toBeInTheDocument()
    expect(desk.create).not.toHaveBeenCalled()
    desk.create.mockRejectedValueOnce(new Error('functions/internal: [500]'))
    const email = within(form).getByRole('textbox')
    await user.clear(email)
    await user.type(email, 'nuova@salone.it')
    await user.click(within(form).getByRole('button', { name: 'Invia' }))
    expect(await screen.findByText('Invio non riuscito. Riprova.')).toBeInTheDocument()
    expect(screen.queryByText(/\[500\]/)).not.toBeInTheDocument()
  })
})
