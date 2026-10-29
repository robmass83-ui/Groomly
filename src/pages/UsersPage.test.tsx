// @vitest-environment happy-dom
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { AppError } from '../data/errors'
import { createAccount } from '../data/local/auth'
import type { SuggerimentoArrivato } from '../data/firebase/client'

const directory = vi.hoisted(() => ({
  load: vi.fn(),
  setPro: vi.fn(async (_salonId?: string, _enabled?: boolean) => undefined),
  imposta: vi.fn(async (_salonId?: string, _azione?: string, _testo?: string) => ({ ok: true as const, emailStato: null as 'inviata' | 'non_inviata' | null })),
  elenco: vi.fn(async () => [] as SuggerimentoArrivato[]),
}))
vi.mock('../data/firebase/client', async () => {
  const actual = await vi.importActual<typeof import('../data/firebase/client')>('../data/firebase/client')
  return {
    ...actual,
    listSalonDirectory: (...args: unknown[]) => directory.load(...args),
    callSetSalonPro: (salonId: string, enabled: boolean) => directory.setPro(salonId, enabled),
    callImpostaPiano: (salonId: string, azione: string, testo?: string) => (
      testo === undefined ? directory.imposta(salonId, azione) : directory.imposta(salonId, azione, testo)
    ),
    elencoSuggerimenti: () => directory.elenco(),
  }
})

const NOTE: SuggerimentoArrivato[] = [
  { id: '1', email: 'a@a.it', categoria: 'agenda', testo: 'Orari più tardi', salonId: 'ada', creato: Date.parse('2026-10-27T10:00:00') },
  { id: '2', email: 'b@b.it', categoria: 'agenda', testo: '  orari   più   tardi ', salonId: 'leo', creato: Date.parse('2026-10-26T10:00:00') },
  { id: '3', email: 'c@c.it', categoria: 'bug', testo: 'Si blocca', salonId: 'ada', creato: Date.parse('2026-10-25T10:00:00') },
]

describe('utenti', () => {
  beforeEach(() => {
    localStorage.clear()
    directory.load.mockReset()
    directory.setPro.mockReset()
    directory.setPro.mockResolvedValue(undefined)
    directory.imposta.mockReset()
    directory.imposta.mockResolvedValue({ ok: true, emailStato: null })
    directory.elenco.mockReset()
    directory.elenco.mockResolvedValue([])
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
    await user.click(screen.getByRole('button', { name: /Toelettature/ }))
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
    await screen.findByText(/account creat/)
    await user.click(screen.getByRole('button', { name: /Toelettature/ }))
    expect(screen.queryByText('Shared')).not.toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'Servizio Salone per Laura Masala' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salone omaggio per Laura Masala' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Bauci, Ada Neri' }))
    const activate = await screen.findByRole('switch', { name: 'Servizio Salone per Ada Neri' })
    expect(activate).toHaveAttribute('aria-checked', 'false')
    expect(Number(/height:\s*(\d+)px/.exec(activate.getAttribute('style') ?? '')?.[1] ?? '0')).toBeGreaterThanOrEqual(44)
    await user.click(activate)
    expect(directory.imposta).not.toHaveBeenCalled()
    const scelta = screen.getByRole('dialog')
    const pro = within(scelta).getByRole('button', { name: 'Pro' })
    expect(pro.getAttribute('style') ?? '').toContain('width: fit-content')
    expect(pro.getAttribute('style') ?? '').not.toContain('min-height')
    expect(within(scelta).getByRole('button', { name: 'Salone' })).toBeInTheDocument()
    await user.click(within(scelta).getByRole('button', { name: 'Annulla' }))
    expect(directory.imposta).not.toHaveBeenCalled()
    expect(activate).toHaveAttribute('aria-checked', 'false')

    await user.click(activate)
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salone' }))
    expect(directory.imposta).toHaveBeenCalledWith('ada', 'bypass-salone')
    await waitFor(() => {
      expect(screen.getByRole('switch', { name: 'Servizio Salone per Ada Neri' })).toHaveAttribute('aria-checked', 'true')
    })

    await user.click(screen.getByRole('button', { name: 'Indietro' }))
    await user.click(screen.getByRole('button', { name: 'Pelo, Leo Verdi' }))
    expect(screen.getByRole('switch', { name: 'Servizio Salone per Leo Verdi' })).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByRole('switch', { name: 'Servizio Salone per Leo Verdi' }))
    expect(directory.imposta).toHaveBeenCalledWith('leo', 'spegni')
    await waitFor(() => {
      expect(screen.getByRole('switch', { name: 'Servizio Salone per Leo Verdi' })).toHaveAttribute('aria-checked', 'false')
    })
    expect(screen.queryByRole('button', { name: 'Pro omaggio per Leo Verdi' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Torna a Base per Leo Verdi' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Prova 30 giorni per Leo Verdi' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salone omaggio per Leo Verdi' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Indietro' }))
    await user.click(screen.getByRole('button', { name: 'Bauci, Ada Neri' }))
    const prima = directory.imposta.mock.calls.length
    await user.click(screen.getByRole('button', { name: 'Salone omaggio per Ada Neri' }))
    expect(screen.getByRole('dialog', { name: 'Salone omaggio' })).toBeInTheDocument()
    expect(screen.getByText('Salone omaggio per Bauci, di Ada Neri.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    expect(directory.imposta.mock.calls.length).toBe(prima)
    await user.click(screen.getByRole('button', { name: 'Salone omaggio per Ada Neri' }))
    await user.click(screen.getByRole('button', { name: 'Conferma' }))
    expect(directory.imposta).toHaveBeenCalledWith('ada', 'salone')
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
    await screen.findByText(/account creat/)
    await user.click(screen.getByRole('button', { name: /Toelettature/ }))
    await user.click(screen.getByRole('button', { name: 'Bauci, Ada Neri' }))
    const activate = await screen.findByRole('switch', { name: 'Servizio Salone per Ada Neri' })
    await user.click(activate)
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Pro' }))
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
    await screen.findByText(/account creat/)
    await user.click(screen.getByRole('button', { name: /Toelettature/ }))
    await user.click(screen.getByRole('button', { name: 'Bauci, Ada Neri' }))
    const toggle = await screen.findByRole('switch', { name: 'Servizio Salone per Ada Neri' })
    expect(screen.getAllByRole('switch')).toHaveLength(1)
    expect(screen.queryByRole('switch', { name: 'Servizio Salone per Leo Verdi' })).not.toBeInTheDocument()
    expect(screen.getByText('Bauci')).toBeInTheDocument()

    await user.click(toggle)
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salone' }))
    expect(directory.imposta).toHaveBeenCalledWith('bauci', 'bypass-salone')
    await waitFor(() => {
      expect(screen.getByRole('switch', { name: 'Servizio Salone per Ada Neri' })).toHaveAttribute('aria-checked', 'true')
    })
    expect(screen.getAllByText('Salone').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('switch', { name: 'Servizio Salone per Ada Neri' }))
    expect(directory.imposta).toHaveBeenCalledWith('bauci', 'spegni')
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
    expect(await screen.findByText('4 account creati · 2 toelettature create')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Toelettature/ }))
    expect(screen.getByText('Laura')).toBeInTheDocument()

    expect(screen.queryByLabelText('Cerca')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Servizio Pro' })).not.toBeInTheDocument()
    expect(screen.getByText('Salone')).toBeInTheDocument()
    expect(screen.getByText('Gratis')).toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Spegni Pro' })).not.toBeInTheDocument()
    expect(screen.queryByText('shared')).not.toBeInTheDocument()
    expect(screen.getByText('Salone').getAttribute('style') ?? '').toContain('color: var(--tea)')
    expect(screen.getByText('Gratis').getAttribute('style') ?? '').toContain('color: var(--tx2)')
    expect(screen.queryByRole('button', { name: /Roberto/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'I Pelosetti, Laura' }))
    expect(screen.getByRole('heading', { name: 'Servizio Pro' })).toBeInTheDocument()
    expect(screen.getAllByRole('switch')).toHaveLength(1)
    expect(screen.getByRole('switch', { name: 'Servizio Salone per Laura' })).toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'Servizio Salone per Roberto' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Indietro' }))
    await user.click(screen.getByRole('button', { name: 'Troddioni, Troddioni' }))
    expect(screen.getByRole('switch', { name: 'Servizio Salone per Troddioni' })).toBeInTheDocument()
    expect(screen.getAllByRole('switch')).toHaveLength(1)
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
    await screen.findByText(/account creat/)
    await user.click(screen.getByRole('button', { name: /Toelettature/ }))
    expect(screen.queryByText('Senza nome')).not.toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'I Pelosetti, Laura' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Troddioni, Troddioni' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'I Pelosetti, Laura' }))
    await user.click(screen.getByRole('switch', { name: 'Servizio Salone per Laura' }))
    await user.click(screen.getByRole('button', { name: 'Indietro' }))
    await user.click(screen.getByRole('button', { name: 'Troddioni, Troddioni' }))
    await user.click(screen.getByRole('switch', { name: 'Servizio Salone per Troddioni' }))
    const emptyCalls = directory.setPro.mock.calls.filter(([salonId]) => typeof salonId !== 'string' || salonId.trim() === '')
    expect(emptyCalls).toEqual([])
  })

  it('non spegne un piano VIP e mostra la forzatura a mano', async () => {
    await createAccount('laura.masala@tiscali.it', 'segretissimo')
    directory.load.mockResolvedValue({
      accountCount: 1,
      salonCount: 1,
      entries: [{ uid: 'ada', ownerName: 'Ada Neri', salonName: 'Bauci' }],
      pro: [{ uid: 'ada', salonId: 'ada', enabled: true, livello: 'vip', funzioni: { prenotazioni: false } }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    await user.click(screen.getByRole('link', { name: 'Utenti Groomly' }))
    await screen.findByText(/account creat/)
    await user.click(screen.getByRole('button', { name: /Toelettature/ }))
    expect(screen.getByText('VIP').getAttribute('style') ?? '').toContain('color: var(--sen)')
    await user.click(screen.getByRole('button', { name: 'Bauci, Ada Neri' }))
    await user.click(screen.getByRole('switch', { name: 'Servizio Salone per Ada Neri' }))
    expect(await screen.findByText('Il piano VIP resta attivo')).toBeInTheDocument()
    expect(directory.imposta).not.toHaveBeenCalled()
    expect(screen.getByRole('switch', { name: 'Servizio Salone per Ada Neri' })).toHaveAttribute('aria-checked', 'true')

    await user.click(screen.getByRole('button', { name: 'Funzioni' }))
    expect(screen.getByText(/spenta a mano/)).toBeInTheDocument()
    expect(screen.getByText('Da sviluppare')).toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'WhatsApp automatico' })).not.toBeInTheDocument()
  })

  const NOTA_PLAY = 'Groomly spegne il piano nell’app. L’addebito su Play, se c’è, continua finché il titolare non lo disdice nello store.'

  async function apriScheda(
    user: ReturnType<typeof userEvent.setup>,
    voce: { uid: string; salonId: string; enabled: boolean; livello?: string; piano?: string; fonte?: string; stato?: string; scadeIl?: string | null },
    pulsante: string,
  ) {
    await createAccount('laura.masala@tiscali.it', 'segretissimo')
    directory.load.mockResolvedValue({
      accountCount: 1,
      salonCount: 1,
      entries: [{ uid: voce.uid, ownerName: 'Ada Neri', salonName: 'Bauci' }],
      pro: [voce],
    })
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    await user.click(screen.getByRole('link', { name: 'Utenti Groomly' }))
    await screen.findByText(/account creat/)
    await user.click(screen.getByRole('button', { name: /Toelettature/ }))
    await user.click(screen.getByRole('button', { name: pulsante }))
  }

  it('da Base mostra Pro e Salone e chiama bypass-pro solo dopo la conferma', async () => {
    const user = userEvent.setup()
    await apriScheda(user, { uid: 'ada', salonId: 'ada', enabled: false }, 'Bauci, Ada Neri')
    const interruttore = await screen.findByRole('switch', { name: 'Servizio Salone per Ada Neri' })
    expect(interruttore).toHaveAttribute('aria-checked', 'false')
    await user.click(interruttore)
    expect(directory.imposta).not.toHaveBeenCalled()
    const dialogo = screen.getByRole('dialog')
    expect(within(dialogo).getByRole('button', { name: 'Pro' })).toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Salone' })).toBeInTheDocument()
    await user.click(within(dialogo).getByRole('button', { name: 'Annulla' }))
    expect(directory.imposta).not.toHaveBeenCalled()
    expect(interruttore).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(interruttore)
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Pro' }))
    expect(directory.imposta).toHaveBeenCalledWith('ada', 'bypass-pro')
    await waitFor(() => {
      expect(interruttore).toHaveAttribute('aria-checked', 'true')
    })
    expect(screen.getByRole('button', { name: 'Pro' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pro omaggio per Ada Neri' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Torna a Base per Ada Neri' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Prova 30 giorni per Ada Neri' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salone omaggio per Ada Neri' })).toBeInTheDocument()
  })

  it('un Play acceso resta acceso finché non si scrive il testo e poi chiama spegni', async () => {
    const user = userEvent.setup()
    await apriScheda(user, {
      uid: 'ada', salonId: 'ada', enabled: true, livello: 'salone', piano: 'salone', fonte: 'play', stato: 'attivo', scadeIl: null,
    }, 'Bauci, Ada Neri')
    const interruttore = await screen.findByRole('switch', { name: 'Servizio Salone per Ada Neri' })
    expect(interruttore).toHaveAttribute('aria-checked', 'true')
    await user.click(interruttore)
    expect(directory.imposta).not.toHaveBeenCalled()
    expect(interruttore).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText(NOTA_PLAY)).toBeInTheDocument()
    const conferma = screen.getByRole('button', { name: 'Conferma' })
    expect(conferma).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    expect(directory.imposta).not.toHaveBeenCalled()
    expect(interruttore).toHaveAttribute('aria-checked', 'true')

    await user.click(interruttore)
    await user.type(screen.getByRole('textbox'), 'Chiuso')
    await user.click(screen.getByRole('button', { name: 'Conferma' }))
    expect(directory.imposta).toHaveBeenCalledWith('ada', 'spegni', 'Chiuso')
    await waitFor(() => {
      expect(interruttore).toHaveAttribute('aria-checked', 'false')
    })
  })

  it('un Salone pagato chiede il testo prima di bypass-pro e Salone da un Pro pagato no', async () => {
    const user = userEvent.setup()
    await apriScheda(user, {
      uid: 'ada', salonId: 'ada', enabled: true, livello: 'salone', piano: 'salone', fonte: 'play', stato: 'attivo', scadeIl: null,
    }, 'Bauci, Ada Neri')
    await screen.findByRole('switch', { name: 'Servizio Salone per Ada Neri' })
    await user.click(screen.getByRole('button', { name: 'Salone' }))
    const scelta = screen.getByRole('dialog')
    expect(directory.imposta).not.toHaveBeenCalled()
    await user.click(within(scelta).getByRole('button', { name: 'Pro' }))
    expect(directory.imposta).not.toHaveBeenCalled()
    expect(screen.getByText(NOTA_PLAY)).toBeInTheDocument()
    const campo = screen.getByRole('textbox')
    const conferma = screen.getByRole('button', { name: 'Conferma' })
    expect(conferma).toBeDisabled()
    await user.type(campo, '   ')
    expect(conferma).toBeDisabled()
    await user.clear(campo)
    await user.type(campo, 'a'.repeat(401))
    expect(conferma).toBeDisabled()
    expect(directory.imposta).not.toHaveBeenCalled()
    await user.clear(campo)
    await user.type(campo, 'Scendi a Pro')
    expect(conferma).toBeEnabled()
    await user.click(conferma)
    expect(directory.imposta).toHaveBeenCalledWith('ada', 'bypass-pro', 'Scendi a Pro')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Pro' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Pro' }))
    const su = screen.getByRole('dialog')
    expect(within(su).queryByRole('textbox')).not.toBeInTheDocument()
    await user.click(within(su).getByRole('button', { name: 'Salone' }))
    expect(directory.imposta).toHaveBeenLastCalledWith('ada', 'bypass-salone')
  }, 40_000)

  it('un omaggio chiede conferma e poi chiama spegni-omaggio', async () => {
    const user = userEvent.setup()
    await apriScheda(user, {
      uid: 'ada', salonId: 'ada', enabled: true, livello: 'vip', piano: 'salone', fonte: 'omaggio', stato: 'attivo', scadeIl: null,
    }, 'Bauci, Ada Neri')
    const interruttore = await screen.findByRole('switch', { name: 'Servizio Salone per Ada Neri' })
    await user.click(interruttore)
    expect(directory.imposta).not.toHaveBeenCalled()
    expect(screen.getByText('Questo salone è un omaggio. Spegnere?')).toBeInTheDocument()
    expect(interruttore).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    expect(directory.imposta).not.toHaveBeenCalled()
    await user.click(interruttore)
    await user.click(screen.getByRole('button', { name: 'Conferma' }))
    expect(directory.imposta).toHaveBeenCalledWith('ada', 'spegni-omaggio')
    await waitFor(() => {
      expect(interruttore).toHaveAttribute('aria-checked', 'false')
    })
  })

  it('un manuale cambia piano senza testo e si spegne con spegni', async () => {
    const user = userEvent.setup()
    await apriScheda(user, {
      uid: 'ada', salonId: 'ada', enabled: true, livello: 'salone', piano: 'salone', fonte: 'manuale', stato: 'attivo', scadeIl: null,
    }, 'Bauci, Ada Neri')
    const interruttore = await screen.findByRole('switch', { name: 'Servizio Salone per Ada Neri' })
    await user.click(screen.getByRole('button', { name: 'Salone' }))
    const scelta = screen.getByRole('dialog')
    expect(within(scelta).queryByRole('textbox')).not.toBeInTheDocument()
    await user.click(within(scelta).getByRole('button', { name: 'Pro' }))
    expect(directory.imposta).toHaveBeenCalledWith('ada', 'bypass-pro')
    await user.click(interruttore)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(directory.imposta).toHaveBeenLastCalledWith('ada', 'spegni')
  })

  it('se la mail non parte avvisa e lascia il piano aggiornato', async () => {
    const user = userEvent.setup()
    directory.imposta.mockResolvedValueOnce({ ok: true, emailStato: 'non_inviata' })
    await apriScheda(user, { uid: 'ada', salonId: 'ada', enabled: false }, 'Bauci, Ada Neri')
    const interruttore = await screen.findByRole('switch', { name: 'Servizio Salone per Ada Neri' })
    await user.click(interruttore)
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Pro' }))
    expect(await screen.findByText('La mail non è partita. Il piano è comunque aggiornato.')).toBeInTheDocument()
    await waitFor(() => {
      expect(interruttore).toHaveAttribute('aria-checked', 'true')
    })
  })

  it('raggruppa i suggerimenti, li segna e li tiene tra i visti', async () => {
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
        { uid: 'leo', salonId: 'leo', enabled: false },
      ],
    })
    directory.elenco.mockResolvedValue(NOTE)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    await user.click(screen.getByRole('link', { name: 'Utenti Groomly' }))
    expect(await screen.findByText('3 arrivati')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Suggerimenti/ }))
    const agenda = screen.getByRole('button', { name: 'Agenda, orari o appuntamenti, 2' })
    expect(agenda).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '2' })).not.toBeInTheDocument()
    expect(agenda.compareDocumentPosition(screen.getByRole('button', { name: 'Qualcosa non funziona, 1' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const etichetta = within(agenda).getByText('Agenda, orari o appuntamenti')
    expect(etichetta.getAttribute('style') ?? '').toContain('overflow-wrap: anywhere')

    await user.click(agenda)
    expect(screen.getAllByRole('button', { name: /Orari più tardi/ })).toHaveLength(1)
    expect(await screen.findByText(/2 toelettature/)).toBeInTheDocument()
    expect(screen.getByText(/Bauci e altri 1/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Orari più tardi/ }))
    expect(screen.getByText(/a@a.it · Bauci/)).toBeInTheDocument()
    expect(screen.getByText(/b@b.it · Pelo/)).toBeInTheDocument()

    const dialogo = screen.getByRole('button', { name: 'Esporta' })
    await user.click(dialogo)
    const finestra = screen.getByRole('dialog', { name: 'Esporta' })
    expect(within(finestra).getByRole('radio', { name: 'Tutti, anche i visti' })).toBeInTheDocument()
    expect(within(finestra).getByRole('radio', { name: 'Excel' })).toBeInTheDocument()
    expect(within(finestra).getByText('2 persone')).toBeInTheDocument()
    expect(within(finestra).getByText(/Excel ha una riga per ogni persona/)).toBeInTheDocument()
    await user.click(within(finestra).getByRole('button', { name: 'Annulla' }))

    await user.click(screen.getByRole('button', { name: 'Segna come interessante' }))
    expect(screen.getByText('Niente da vedere')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /Interessanti/ }))
    expect(screen.getByText('Orari più tardi')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Togli il segno' }))
    await user.click(screen.getByRole('radio', { name: /Da vedere/ }))
    expect(screen.getByText('Orari più tardi')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Indietro' }))
    await user.click(screen.getByRole('button', { name: 'Qualcosa non funziona, 1' }))
    await user.click(screen.getByRole('button', { name: 'Visto' }))
    expect(screen.getByText('Niente da vedere')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /Visti/ }))
    expect(screen.getByText('Si blocca')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Segna come interessante' }))
    await user.click(screen.getByRole('radio', { name: /Interessanti/ }))
    expect(screen.getByText('Si blocca')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /Visti/ }))
    expect(screen.queryByText('Si blocca')).not.toBeInTheDocument()
    expect(screen.getByText('Nessuno visto')).toBeInTheDocument()
  })
})
