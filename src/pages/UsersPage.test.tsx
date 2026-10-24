// @vitest-environment happy-dom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { AppError } from '../data/errors'
import { createAccount } from '../data/local/auth'

const directory = vi.hoisted(() => ({
  load: vi.fn(),
  setPro: vi.fn(async (_salonId?: string, _enabled?: boolean) => undefined),
}))
vi.mock('../data/firebase/client', async () => {
  const actual = await vi.importActual<typeof import('../data/firebase/client')>('../data/firebase/client')
  return {
    ...actual,
    listSalonDirectory: (...args: unknown[]) => directory.load(...args),
    callSetSalonPro: (salonId: string, enabled: boolean) => directory.setPro(salonId, enabled),
  }
})

function salonCard(name: string): HTMLElement {
  const card = screen.getByText(name).parentElement?.parentElement
  if (!card) throw new Error('card assente')
  return card
}

function withinCardButton(salonName: string, label: string): HTMLElement {
  const button = salonCard(salonName).querySelector('button')
  if (!button || button.textContent !== label) throw new Error(`${label} assente`)
  return button
}

describe('utenti', () => {
  beforeEach(() => {
    localStorage.clear()
    directory.load.mockReset()
    directory.setPro.mockReset()
    directory.setPro.mockResolvedValue(undefined)
  })

  it('nasconde Utenti e rimanda un non operatore alle impostazioni senza caricare la directory', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const view = render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    expect(screen.queryByRole('link', { name: 'Utenti' })).not.toBeInTheDocument()

    view.unmount()
    render(<App memory isDev={false} initialPath="/impostazioni/utenti" />)
    expect(await screen.findByRole('heading', { name: 'Impostazioni' })).toBeInTheDocument()
    expect(directory.load).not.toHaveBeenCalled()
  })

  it('mostra Utenti all’operatrice e segnala che l’elenco non è disponibile', async () => {
    await createAccount('laura.masala@tiscali.it', 'segretissimo')
    directory.load.mockRejectedValue(new AppError('Connessione assente', 'auth_offline'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })

    await user.click(screen.getByRole('link', { name: 'Utenti' }))
    expect(await screen.findByText('Elenco non disponibile')).toBeInTheDocument()
    expect(screen.queryByText('Connessione assente')).not.toBeInTheDocument()
  })

  it('mostra il riepilogo e le toelettature senza rendere cliccabili i titolari', async () => {
    await createAccount('laura.masala@tiscali.it', 'segretissimo')
    directory.load.mockResolvedValue({
      accountCount: 2,
      salonCount: 1,
      entries: [{ uid: 'a', ownerName: 'Ada Neri', salonName: 'Bauci' }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })

    await user.click(screen.getByRole('link', { name: 'Utenti' }))
    expect(await screen.findByText('2 account creati')).toBeInTheDocument()
    expect(screen.getByText('1 toelettatura creata')).toBeInTheDocument()
    expect(screen.getByText('Ada Neri')).toBeInTheDocument()
    expect(screen.getByText('Bauci')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Ada Neri/ })).not.toBeInTheDocument()
  })

  it('cerca per titolare o salone senza troncare i nomi', async () => {
    await createAccount('laura.masala@tiscali.it', 'segretissimo')
    directory.load.mockResolvedValue({
      accountCount: 2,
      salonCount: 2,
      entries: [
        { uid: 'a', ownerName: 'Ada Neri', salonName: 'Bauci' },
        { uid: 'b', ownerName: 'Leo Verdi', salonName: 'Pelo Lungo Quattro Parole' },
      ],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    await user.click(screen.getByRole('link', { name: 'Utenti' }))
    const search = await screen.findByRole('textbox', { name: 'Cerca' })
    const salon = screen.getByText('Pelo Lungo Quattro Parole')
    expect(salon.getAttribute('style') ?? '').toContain('overflow-wrap: anywhere')
    expect(salon.getAttribute('style') ?? '').not.toContain('ellipsis')
    expect(salon.getAttribute('style') ?? '').not.toContain('nowrap')
    expect(screen.getByText('Leo Verdi').getAttribute('style') ?? '').toContain('overflow-wrap: anywhere')
    await user.type(search, 'ADA')
    expect(screen.getByText('Ada Neri')).toBeInTheDocument()
    expect(screen.queryByText('Leo Verdi')).not.toBeInTheDocument()
    await user.clear(search)
    await user.type(search, 'quattro')
    expect(screen.queryByText('Ada Neri')).not.toBeInTheDocument()
    expect(screen.getByText('Pelo Lungo Quattro Parole')).toBeInTheDocument()
  })

  it('accende Pro sul salone e non sul shared', async () => {
    await createAccount('laura.masala@tiscali.it', 'segretissimo')
    directory.load.mockResolvedValue({
      accountCount: 3,
      salonCount: 3,
      entries: [
        { uid: 'laura', ownerName: 'Laura Masala', salonName: 'Shared' },
        { uid: 'ada', ownerName: 'Ada Neri', salonName: 'Bauci' },
        { uid: 'leo', ownerName: 'Leo Verdi', salonName: 'Pelo' },
      ],
      pro: [
        { uid: 'laura', salonId: 'shared', enabled: false },
        { uid: 'ada', salonId: 'ada', enabled: false },
        { uid: 'leo', salonId: 'leo', enabled: true },
      ],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    await user.click(screen.getByRole('link', { name: 'Utenti' }))
    expect(await screen.findByText('Shared')).toBeInTheDocument()

    const shared = salonCard('Shared')
    expect(shared.querySelector('button')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Attiva Pro' })).toBeInTheDocument()
    const activate = withinCardButton('Bauci', 'Attiva Pro')
    const height = Number(/min-height:\s*(\d+)px/.exec(activate.getAttribute('style') ?? '')?.[1] ?? '0')
    expect(height).toBeGreaterThanOrEqual(44)
    expect(withinCardButton('Pelo', 'Spegni Pro')).toBeInTheDocument()

    await user.click(activate)
    expect(directory.setPro).toHaveBeenCalledWith('ada', true)
    await waitFor(() => {
      expect(withinCardButton('Bauci', 'Spegni Pro')).toBeInTheDocument()
    })

    await user.click(withinCardButton('Pelo', 'Spegni Pro'))
    expect(directory.setPro).toHaveBeenCalledWith('leo', false)
  })

  it('mostra Accesso negato sotto la card se Pro non si accende', async () => {
    await createAccount('laura.masala@tiscali.it', 'segretissimo')
    directory.load.mockResolvedValue({
      accountCount: 2,
      salonCount: 2,
      entries: [
        { uid: 'laura', ownerName: 'Laura Masala', salonName: 'Shared' },
        { uid: 'ada', ownerName: 'Ada Neri', salonName: 'Bauci' },
      ],
      pro: [
        { uid: 'laura', salonId: 'shared', enabled: false },
        { uid: 'ada', salonId: 'ada', enabled: false },
      ],
    })
    directory.setPro.mockRejectedValueOnce(new Error('Accesso negato'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    await user.click(screen.getByRole('link', { name: 'Utenti' }))
    const activate = await screen.findByRole('button', { name: 'Attiva Pro' })
    await user.click(activate)
    const denied = await screen.findByText('Accesso negato')
    const card = salonCard('Bauci')
    expect(card.contains(denied)).toBe(false)
    expect(card.nextElementSibling).toBe(denied)
    expect(salonCard('Shared').nextElementSibling).not.toBe(denied)
  })

  it('tiene la stessa etichetta Pro su titolare e socio dello stesso salone', async () => {
    await createAccount('laura.masala@tiscali.it', 'segretissimo')
    directory.load.mockResolvedValue({
      accountCount: 2,
      salonCount: 1,
      entries: [
        { uid: 'ada', ownerName: 'Ada Neri', salonName: 'Bauci' },
        { uid: 'socio', ownerName: 'Leo Verdi', salonName: 'Bauci' },
      ],
      pro: [
        { uid: 'ada', salonId: 'bauci', enabled: false },
        { uid: 'socio', salonId: 'bauci', enabled: false },
      ],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    await user.click(screen.getByRole('link', { name: 'Utenti' }))
    await screen.findByText('Leo Verdi')

    const ada = withinCardButton('Ada Neri', 'Attiva Pro')
    expect(withinCardButton('Leo Verdi', 'Attiva Pro')).toBeInTheDocument()

    await user.click(ada)
    expect(directory.setPro).toHaveBeenCalledWith('bauci', true)
    await waitFor(() => {
      expect(withinCardButton('Ada Neri', 'Spegni Pro')).toBeInTheDocument()
    })
    expect(withinCardButton('Leo Verdi', 'Spegni Pro')).toBeInTheDocument()

    await user.click(withinCardButton('Leo Verdi', 'Spegni Pro'))
    expect(directory.setPro).toHaveBeenCalledWith('bauci', false)
    await waitFor(() => {
      expect(withinCardButton('Ada Neri', 'Attiva Pro')).toBeInTheDocument()
    })
    expect(withinCardButton('Leo Verdi', 'Attiva Pro')).toBeInTheDocument()
  })
})
