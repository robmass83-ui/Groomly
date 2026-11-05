// @vitest-environment happy-dom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DomandaStatistiche } from './DomandaStatistiche'
import { __resetRiaccetta, RiaccettaDocumenti } from './RiaccettaDocumenti'
import { StatisticheRiga } from './StatisticheRiga'

const m = vi.hoisted(() => ({
  account: {} as Record<string, unknown>,
  livelloNome: 'base',
  caricatoPer: 'u' as string | undefined,
  riletto: vi.fn(),
  replaceAccount: vi.fn(),
  imposta: vi.fn(async (attivo: boolean, fonte: string) => ({ attivo, fonte, at: 'x', versione: 1 })),
}))

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock('../../hooks/useSession', () => ({
  useSession: () => ({ gate: { kind: 'in', account: m.account }, admin: false, replaceAccount: m.replaceAccount, logout: vi.fn() }),
}))
vi.mock('../../hooks/usePiano', () => ({ usePiano: () => ({ livelloNome: m.livelloNome, pianoCaricatoPer: m.caricatoPer }) }))
vi.mock('../../data/firebase/enabled', () => ({ firebaseEnabled: () => true }))
vi.mock('../../data/firebase/client', () => ({ callImpostaConsensoMetriche: m.imposta, callRegistraAccettazione: vi.fn(async () => undefined), accountRiletto: m.riletto }))
vi.mock('../../lib/openDocument', () => ({ apriEsterno: vi.fn(async () => undefined) }))
vi.mock('../layout/Toast', () => ({ useToast: () => ({ show: vi.fn() }) }))

const TITOLARE = { uid: 'u', email: 'a@b.it', salonId: 'u', role: 'titolare', termini: { accettati: true, at: 'x', versione: 2, suServer: true } }

function apri(percorso = '/') {
  return render(
    <MemoryRouter initialEntries={[percorso]}>
      <RiaccettaDocumenti><p>app</p></RiaccettaDocumenti>
    </MemoryRouter>,
  )
}

describe('domanda sulle statistiche', () => {
  beforeEach(() => {
    localStorage.setItem('groomly.lingua', 'it')
    __resetRiaccetta()
    m.account = { ...TITOLARE }
    m.livelloNome = 'base'
    m.caricatoPer = 'u'
    m.replaceAccount.mockReset()
    m.imposta.mockClear()
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-12-02T10:00:00.000Z') })
  })
  afterEach(() => { vi.useRealTimers() })

  it('Sì e No hanno lo stesso peso', () => {
    render(<DomandaStatistiche fonte="tour" onFatto={vi.fn()} />)
    const si = screen.getByRole('button', { name: 'Sì, va bene' })
    const no = screen.getByRole('button', { name: 'No, grazie' })
    expect(si.className).toBe(no.className)
    expect(si.getAttribute('style')).toBe(no.getAttribute('style'))
  })

  it('il no si salva, così la domanda non torna', async () => {
    const onFatto = vi.fn()
    render(<DomandaStatistiche fonte="riaccettazione" onFatto={onFatto} />)
    await userEvent.click(screen.getByRole('button', { name: 'No, grazie' }))
    await waitFor(() => { expect(onFatto).toHaveBeenCalled() })
    expect(m.imposta).toHaveBeenCalledWith(false, 'riaccettazione')
    expect(m.replaceAccount).toHaveBeenCalledWith(expect.objectContaining({ consensoMetriche: expect.objectContaining({ attivo: false }) }))
  })

  it('senza rete non blocca', async () => {
    m.imposta.mockRejectedValueOnce(new Error('rete'))
    const onFatto = vi.fn()
    render(<DomandaStatistiche fonte="riaccettazione" onFatto={onFatto} />)
    await userEvent.click(screen.getByRole('button', { name: 'Sì, va bene' }))
    await waitFor(() => { expect(onFatto).toHaveBeenCalled() })
    expect(m.replaceAccount).not.toHaveBeenCalled()
  })

  it('il titolare la vede subito dopo aver riaccettato', async () => {
    m.account = { ...TITOLARE, termini: { accettati: true, at: 'x', versione: 1, suServer: true } }
    m.riletto.mockResolvedValue({ ...TITOLARE })
    m.replaceAccount.mockImplementation((account: Record<string, unknown>) => { m.account = account })
    apri()
    await userEvent.click(screen.getByRole('button', { name: 'Accetto' }))
    expect(await screen.findByRole('button', { name: 'Sì, va bene' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'No, grazie' }))
    await waitFor(() => { expect(m.imposta).toHaveBeenCalledWith(false, 'riaccettazione') })
  })

  it('un nuovo titolare non la vede in Home: la risposta è nel tour', () => {
    apri()
    expect(screen.getByText('app')).toBeInTheDocument()
  })

  it('finché il piano non è arrivato il salone non è ancora un titolare qualsiasi', () => {
    m.caricatoPer = undefined
    render(<StatisticheRiga />)
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it.each([
    ['socio', { ...TITOLARE, role: 'socio' }, 'base'],
    ['VIP', TITOLARE, 'vip'],
    ['chi ha già risposto', { ...TITOLARE, consensoMetriche: { attivo: false, at: 'x', fonte: 'tour', versione: 1 } }, 'base'],
  ])('%s non la vede', (_nome, account, livello) => {
    m.account = account
    m.livelloNome = livello
    apri()
    expect(screen.getByText('app')).toBeInTheDocument()
  })

})

describe('interruttore in Account', () => {
  beforeEach(() => {
    m.account = { ...TITOLARE, consensoMetriche: { attivo: true, at: 'x', fonte: 'tour', versione: 1 } }
    m.livelloNome = 'base'
    m.imposta.mockClear()
  })

  it('il titolare può spegnere', async () => {
    render(<StatisticheRiga />)
    await userEvent.click(screen.getByRole('switch'))
    await waitFor(() => { expect(m.imposta).toHaveBeenCalledWith(false, 'account') })
  })

  it('il socio non lo vede', () => {
    m.account = { ...TITOLARE, role: 'socio' }
    render(<StatisticheRiga />)
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('chi deve ancora accettare i documenti non lo vede', () => {
    m.account = { ...TITOLARE, termini: { accettati: true, at: 'x', versione: 1 } }
    render(<StatisticheRiga />)
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })
})
