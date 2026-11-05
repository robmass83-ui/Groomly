// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetRiaccetta, RiaccettaDocumenti } from './RiaccettaDocumenti'

const m = vi.hoisted(() => ({
  account: { uid: 'u', email: 'a@b.it', salonId: 'u' } as Record<string, unknown>,
  replaceAccount: vi.fn(),
  logout: vi.fn(),
  chiama: vi.fn(async () => undefined),
  riletto: vi.fn(async () => ({ uid: 'u', email: 'a@b.it', termini: { accettati: true, at: 'x', versione: 2 } })),
}))

vi.mock('../../hooks/useSession', () => ({
  useSession: () => ({ gate: { kind: 'in', account: m.account }, replaceAccount: m.replaceAccount, logout: m.logout }),
}))
vi.mock('../../hooks/usePiano', () => ({ usePiano: () => ({ livelloNome: 'go' }) }))
vi.mock('../../data/firebase/client', () => ({ callRegistraAccettazione: m.chiama, accountRiletto: m.riletto }))
vi.mock('../../lib/openDocument', () => ({ apriEsterno: vi.fn(async () => undefined) }))

function apri(richiesta?: number, percorso = '/') {
  return render(
    <MemoryRouter initialEntries={[percorso]}>
      <RiaccettaDocumenti richiesta={richiesta}><p>app</p></RiaccettaDocumenti>
    </MemoryRouter>,
  )
}

describe('RiaccettaDocumenti', () => {
  beforeEach(() => {
    localStorage.setItem('groomly.lingua', 'it')
    __resetRiaccetta()
    m.account = { uid: 'u', email: 'a@b.it', salonId: 'u' }
    m.chiama.mockReset()
    m.chiama.mockResolvedValue(undefined)
    m.replaceAccount.mockClear()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('con la versione attuale non compare per nessuno', () => {
    apri()
    expect(screen.getByText('app')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Accetto' })).not.toBeInTheDocument()
  })

  it('con la versione 2 copre l’app e offre documenti, Esci ed Elimina', () => {
    apri(2)
    expect(screen.queryByText('app')).not.toBeInTheDocument()
    for (const nome of ['Accetto', 'Esci', 'Elimina account']) expect(screen.getByRole('button', { name: nome })).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(6)
  })

  it('un account protetto non vede Elimina account', () => {
    m.account = { uid: 'u', email: 'laura.masala@tiscali.it', salonId: 'shared' }
    apri(2)
    expect(screen.getByRole('button', { name: 'Accetto' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Elimina account' })).not.toBeInTheDocument()
  })

  it('accettare chiama il server e aggiorna l’account', async () => {
    const user = userEvent.setup()
    apri(2)
    await user.click(screen.getByRole('button', { name: 'Accetto' }))
    expect(m.chiama).toHaveBeenCalledTimes(1)
    expect(m.replaceAccount).toHaveBeenCalledWith(expect.objectContaining({ termini: expect.objectContaining({ versione: 2 }) }))
  })

  it('senza rete non chiude fuori nessuno', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    apri(2)
    expect(screen.getByText('app')).toBeInTheDocument()
  })

  it('se il server non è raggiungibile si entra lo stesso', async () => {
    m.chiama.mockRejectedValue({ code: 'functions/unavailable' })
    const user = userEvent.setup()
    apri(2)
    await user.click(screen.getByRole('button', { name: 'Accetto' }))
    expect(await screen.findByText('app')).toBeInTheDocument()
  })

  it('un altro errore resta sulla schermata con il messaggio', async () => {
    m.chiama.mockRejectedValue({ code: 'functions/internal' })
    const user = userEvent.setup()
    apri(2)
    await user.click(screen.getByRole('button', { name: 'Accetto' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText('app')).not.toBeInTheDocument()
  })

  it('la pagina di eliminazione resta raggiungibile', () => {
    apri(2, '/impostazioni/account/elimina')
    expect(screen.getByText('app')).toBeInTheDocument()
  })

  it('riprova in silenzio una sola volta se manca la prova sul server', async () => {
    m.account = { uid: 'u', email: 'a@b.it', salonId: 'u', termini: { accettati: true, at: 'x', versione: 1 } }
    apri().unmount()
    await vi.waitFor(() => expect(m.chiama).toHaveBeenCalledTimes(1))
    apri()
    await new Promise((ok) => setTimeout(ok, 10))
    expect(m.chiama).toHaveBeenCalledTimes(1)
  })
})
