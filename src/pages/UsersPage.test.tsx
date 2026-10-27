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
  imposta: vi.fn(async (_salonId?: string, _azione?: string) => undefined),
}))
vi.mock('../data/firebase/client', async () => {
  const actual = await vi.importActual<typeof import('../data/firebase/client')>('../data/firebase/client')
  return {
    ...actual,
    listSalonDirectory: (...args: unknown[]) => directory.load(...args),
    callSetSalonPro: (salonId: string, enabled: boolean) => directory.setPro(salonId, enabled),
    callImpostaPiano: (salonId: string, azione: 'prova' | 'pro' | 'salone' | 'base') => directory.imposta(salonId, azione),
  }
})

describe('utenti', () => {
  beforeEach(() => {
    localStorage.clear()
    directory.load.mockReset()
    directory.setPro.mockReset()
    directory.setPro.mockResolvedValue(undefined)
    directory.imposta.mockReset()
    directory.imposta.mockResolvedValue(undefined)
  })

  it('nasconde Utenti e rimanda un non operatore alle impostazioni senza caricare la directory', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const view = render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    expect(screen.queryByRole('link', { name: 'Utenti Groomly' })).not.toBeInTheDocument()

    view.unmount()
    render(<App memory isDev={false} initialPath="/impostazioni/utenti" />)
    expect(await screen.findByRole('heading', { name: 'Impostazioni' })).toBeInTheDocument()
    expect(directory.load).not.toHaveBeenCalled()
  })

  it('mostra Utenti Groomly a Roberto senza il campione delle email', async () => {
    await createAccount('masala.roberto@hotmail.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    expect(screen.getByRole('link', { name: 'Utenti Groomly' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Spedisci il campione delle email' })).not.toBeInTheDocument()
    expect(screen.queryByText('Spedisci il campione delle email')).not.toBeInTheDocument()
  })

  it('mostra Utenti all’operatrice e segnala che l’elenco non è disponibile', async () => {
    await createAccount('laura.masala@tiscali.it', 'segretissimo')
    directory.load.mockRejectedValue(new AppError('Connessione assente', 'auth_offline'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    expect(screen.queryByText('Spedisci il campione delle email')).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Utenti Groomly' }))
    expect(await screen.findByRole('heading', { name: 'Utenti Groomly' })).toBeInTheDocument()
    expect(await screen.findByText('Elenco non disponibile')).toBeInTheDocument()
    expect(screen.queryByText('Connessione assente')).not.toBeInTheDocument()
  })

  it('mostra il riepilogo e le toelettature senza rendere cliccabili i titolari', async () => {
    await createAccount('laura.masala@tiscali.it', 'segretissimo')
    directory.load.mockResolvedValue({
      accountCount: 2,
      salonCount: 1,
      entries: [{ uid: 'a', ownerName: 'Ada Neri', salonName: 'Pelo Lungo Quattro Parole' }],
      pro: [{ uid: 'a', salonId: 'a', enabled: false }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })

    await user.click(screen.getByRole('link', { name: 'Utenti Groomly' }))
    expect(await screen.findByText('2 account creati · 1 toelettatura creata')).toBeInTheDocument()
    expect(screen.getByText('Ada Neri')).toBeInTheDocument()
    expect(screen.getByText('Pelo Lungo Quattro Parole')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Ada Neri/ })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Cerca')).not.toBeInTheDocument()
    const salon = screen.getByText('Pelo Lungo Quattro Parole')
    expect(salon.getAttribute('style') ?? '').toContain('overflow-wrap: anywhere')
    expect(salon.getAttribute('style') ?? '').not.toContain('ellipsis')
    expect(salon.getAttribute('style') ?? '').not.toContain('nowrap')
    expect(screen.getByText('Ada Neri').getAttribute('style') ?? '').toContain('overflow-wrap: anywhere')
  })

  it('accende e spegne Pro sul salone e non mostra shared', async () => {
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
    await user.click(screen.getByRole('link', { name: 'Utenti Groomly' }))
    const activate = await screen.findByRole('switch', { name: 'Servizio Salone per Ada Neri' })
    expect(screen.queryByText('Shared')).not.toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'Servizio Salone per Laura Masala' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salone omaggio per Laura Masala' })).not.toBeInTheDocument()
    expect(activate).toHaveAttribute('aria-checked', 'false')
    expect(Number(/height:\s*(\d+)px/.exec(activate.getAttribute('style') ?? '')?.[1] ?? '0')).toBeGreaterThanOrEqual(44)
    expect(screen.getByRole('switch', { name: 'Servizio Salone per Leo Verdi' })).toHaveAttribute('aria-checked', 'true')

    await user.click(activate)
    expect(directory.imposta).toHaveBeenCalledWith('ada', 'salone')
    await waitFor(() => {
      expect(screen.getByRole('switch', { name: 'Servizio Salone per Ada Neri' })).toHaveAttribute('aria-checked', 'true')
    })

    await user.click(screen.getByRole('switch', { name: 'Servizio Salone per Leo Verdi' }))
    expect(directory.imposta).toHaveBeenCalledWith('leo', 'base')
    await waitFor(() => {
      expect(screen.getByRole('switch', { name: 'Servizio Salone per Leo Verdi' })).toHaveAttribute('aria-checked', 'false')
    })

    await user.click(screen.getByRole('button', { name: 'Salone omaggio per Ada Neri' }))
    expect(directory.imposta).toHaveBeenCalledWith('ada', 'salone')
    await user.click(screen.getByRole('button', { name: 'Torna a Base per Leo Verdi' }))
    expect(directory.imposta).toHaveBeenCalledWith('leo', 'base')
  })

  it('mostra Accesso negato sotto la riga se Pro non si accende', async () => {
    await createAccount('laura.masala@tiscali.it', 'segretissimo')
    directory.load.mockResolvedValue({
      accountCount: 2,
      salonCount: 2,
      entries: [
        { uid: 'ada', ownerName: 'Ada Neri', salonName: 'Bauci' },
        { uid: 'leo', ownerName: 'Leo Verdi', salonName: 'Pelo' },
      ],
      pro: [
        { uid: 'ada', salonId: 'ada', enabled: false },
        { uid: 'leo', salonId: 'leo', enabled: true },
      ],
    })
    directory.imposta.mockRejectedValueOnce(new Error('Accesso negato'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    await user.click(screen.getByRole('link', { name: 'Utenti Groomly' }))
    const activate = await screen.findByRole('switch', { name: 'Servizio Salone per Ada Neri' })
    await user.click(activate)
    const denied = await screen.findByText('Accesso negato')
    expect(denied.textContent).toBe('Accesso negato')
    expect(denied.previousElementSibling?.textContent).toContain('Ada Neri')
    expect(denied.previousElementSibling?.textContent).not.toContain('Leo Verdi')
    expect(screen.getByRole('switch', { name: 'Servizio Salone per Ada Neri' })).toHaveAttribute('aria-checked', 'false')
  })

  it('tiene un solo interruttore per titolare e socio dello stesso salone', async () => {
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
    await user.click(screen.getByRole('link', { name: 'Utenti Groomly' }))
    const toggle = await screen.findByRole('switch', { name: 'Servizio Salone per Ada Neri' })
    expect(screen.getAllByRole('switch')).toHaveLength(1)
    expect(screen.queryByRole('switch', { name: 'Servizio Salone per Leo Verdi' })).not.toBeInTheDocument()
    expect(screen.getByText('Bauci')).toBeInTheDocument()

    await user.click(toggle)
    expect(directory.imposta).toHaveBeenCalledWith('bauci', 'salone')
    await waitFor(() => {
      expect(screen.getByRole('switch', { name: 'Servizio Salone per Ada Neri' })).toHaveAttribute('aria-checked', 'true')
    })
    expect(screen.getAllByText('Salone').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('switch', { name: 'Servizio Salone per Ada Neri' }))
    expect(directory.imposta).toHaveBeenCalledWith('bauci', 'base')
    await waitFor(() => {
      expect(screen.getByRole('switch', { name: 'Servizio Salone per Ada Neri' })).toHaveAttribute('aria-checked', 'false')
    })
    expect(screen.getAllByRole('switch')).toHaveLength(1)
  })

  it('raggruppa il servizio Pro in un interruttore per salone', async () => {
    await createAccount('laura.masala@tiscali.it', 'segretissimo')
    directory.load.mockResolvedValue({
      accountCount: 4,
      salonCount: 2,
      entries: [
        { uid: 'roberto', ownerName: 'Roberto', salonName: 'I Pelosetti' },
        { uid: 'laura', ownerName: 'Laura', salonName: 'I Pelosetti' },
        { uid: 't1', ownerName: 'Troddioni', salonName: 'Troddioni' },
        { uid: 'ops', ownerName: 'Operatore', salonName: 'Sala comune' },
      ],
      pro: [
        { uid: 'roberto', salonId: 'laura', enabled: true },
        { uid: 'laura', salonId: 'laura', enabled: true },
        { uid: 't1', salonId: 't1', enabled: false },
        { uid: 'ops', salonId: 'shared', enabled: false },
        { uid: 'bad', salonId: 'salone/altro', enabled: true },
      ],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    await user.click(screen.getByRole('link', { name: 'Utenti Groomly' }))
    expect(await screen.findByText('Laura')).toBeInTheDocument()

    expect(screen.queryByLabelText('Cerca')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Servizio Pro' })).toBeInTheDocument()
    expect(screen.getByText('Salone')).toBeInTheDocument()
    expect(screen.getByText('Gratis')).toBeInTheDocument()
    expect(screen.getAllByRole('switch')).toHaveLength(2)
    expect(screen.getByRole('switch', { name: 'Servizio Salone per Laura' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Spegni Pro' })).not.toBeInTheDocument()
    expect(screen.queryByText('shared')).not.toBeInTheDocument()
    expect(screen.getByText('4 account creati · 2 toelettature create')).toBeInTheDocument()
    expect(screen.getByText('Salone').getAttribute('style') ?? '').toContain('color: var(--ok)')
    expect(screen.getByText('Gratis').getAttribute('style') ?? '').toContain('color: var(--tx3)')
    expect(screen.queryByRole('switch', { name: 'Servizio Salone per Roberto' })).not.toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Servizio Salone per Troddioni' })).toBeInTheDocument()
  })

  it('un salone vuoto non ha interruttore', async () => {
    await createAccount('laura.masala@tiscali.it', 'segretissimo')
    directory.load.mockResolvedValue({
      accountCount: 4,
      salonCount: 2,
      entries: [
        { uid: 'roberto', ownerName: 'Roberto', salonName: 'I Pelosetti' },
        { uid: 'laura', ownerName: 'Laura', salonName: 'I Pelosetti' },
        { uid: 't1', ownerName: 'Troddioni', salonName: 'Troddioni' },
        { uid: 'ops', ownerName: 'Operatore', salonName: 'Sala comune' },
      ],
      pro: [
        { uid: 'roberto', salonId: 'laura', enabled: true },
        { uid: 'laura', salonId: 'laura', enabled: true },
        { uid: 't1', salonId: 't1', enabled: false },
        { uid: 'vuoto', salonId: '', enabled: true },
        { uid: 'spazi', salonId: '   ', enabled: true },
        { uid: 'ops', salonId: 'shared', enabled: false },
        { uid: 'bad', salonId: 'salone/altro', enabled: true },
      ],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    await user.click(screen.getByRole('link', { name: 'Utenti Groomly' }))
    expect(await screen.findByRole('switch', { name: 'Servizio Salone per Laura' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Servizio Salone per Troddioni' })).toBeInTheDocument()

    expect(screen.getAllByRole('switch')).toHaveLength(2)
    expect(screen.queryByText('Senza nome')).not.toBeInTheDocument()
    for (const control of screen.getAllByRole('switch')) await user.click(control)
    const emptyCalls = directory.setPro.mock.calls.filter(([salonId]) => typeof salonId !== 'string' || salonId.trim() === '')
    expect(emptyCalls).toEqual([])
  })
})
