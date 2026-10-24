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
}))

vi.mock('../data/firebase/client', () => ({
  watchSalonAccess: async (_salonId: string, onChange: (access: typeof desk.access) => void) => {
    onChange(desk.access)
    return () => undefined
  },
  callCreateInvite: (email: string, role: 'socio' | 'collaboratore') => desk.create(email, role),
  callRevokeMember: (uid: string) => desk.revoke(uid),
  callChangeMemberRole: (uid: string, role: 'socio' | 'collaboratore') => desk.change(uid, role),
}))

function remember(extra: { salonId?: string; role?: 'titolare' | 'socio' | 'collaboratore' }) {
  const account = getAccount()
  if (!account) throw new Error('account assente')
  writeJson(storageKeys.auth, { ...account, ...extra })
}

describe('Funzioni Pro', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    desk.access = { enabled: false, members: [], openInviteExpiries: [] }
    desk.create.mockClear()
    desk.revoke.mockClear()
    desk.change.mockClear()
  })

  it('Pro spento o salone shared mostra Non attivo e non Invita', async () => {
    desk.access = { enabled: true, members: [], openInviteExpiries: [] }
    await createAccount('laura.masala@tiscali.it', 'segretissimo')
    const laura = render(<App memory isDev={false} initialPath="/impostazioni/pro" />)
    expect(await screen.findByRole('heading', { name: 'Funzioni Pro' })).toBeInTheDocument()
    expect(await screen.findByText('Non attivo')).toBeInTheDocument()
    expect(screen.queryByText('Invita')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Invia' })).not.toBeInTheDocument()
    laura.unmount()

    localStorage.clear()
    desk.access = { enabled: false, members: [], openInviteExpiries: [] }
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/impostazioni/pro" />)
    expect(await screen.findByRole('heading', { name: 'Funzioni Pro' })).toBeInTheDocument()
    expect(await screen.findByText('Non attivo')).toBeInTheDocument()
    expect(screen.queryByText('Invita')).not.toBeInTheDocument()
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
    expect(await screen.findByRole('heading', { name: 'Funzioni Pro' })).toBeInTheDocument()
    expect(await screen.findByText('2 di 3 posti')).toBeInTheDocument()
    expect(screen.getByText('Invita')).toBeInTheDocument()
    expect(screen.getByText('Ciro Zeta')).toBeInTheDocument()
    expect(screen.getByText('c@salone.it')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Revoca Ada Neri' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Ruolo di Ada Neri' })).not.toBeInTheDocument()
    const ruolo = screen.getByRole('group', { name: 'Ruolo di Ciro Zeta' })
    expect(within(ruolo).getByRole('button', { name: 'Socio' })).toHaveAttribute('aria-pressed', 'false')
    expect(within(ruolo).getByRole('button', { name: 'Collaboratore' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Revoca Ciro Zeta' }))
    expect(desk.revoke).toHaveBeenCalledWith('c1')
    await user.click(within(ruolo).getByRole('button', { name: 'Socio' }))
    expect(desk.change).toHaveBeenCalledWith('c1', 'socio')
  })

  it('Pro: Invia con email vuota mostra Inserisci un’email valida e non chiama', async () => {
    desk.access = { enabled: true, members: [], openInviteExpiries: [] }
    const account = await createAccount('maria@salone.it', 'segretissimo')
    remember({ salonId: account.uid, role: 'titolare' })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni/pro" />)
    await screen.findByRole('button', { name: 'Invia' })
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
    const form = await screen.findByRole('form', { name: 'Invita' })
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
    expect(screen.queryByRole('heading', { name: 'Funzioni Pro' })).not.toBeInTheDocument()
    expect(screen.queryByText('Invita')).not.toBeInTheDocument()
    expect(account.uid).not.toBe('')
  })
})
