// @vitest-environment happy-dom
import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RaccoltaMetriche } from './RaccoltaMetriche'

const SI = { attivo: true, at: 'x', fonte: 'account', versione: 2 }
const m = vi.hoisted(() => ({
  gate: { kind: 'pending' } as Record<string, unknown>,
  livelloNome: 'base',
  caricatoPer: 'u' as string | undefined,
  replaceAccount: vi.fn(),
  rileggi: vi.fn(async (): Promise<unknown> => undefined),
  imposta: vi.fn(async () => undefined),
}))

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock('../../hooks/useSession', () => ({ useSession: () => ({ gate: m.gate, admin: false, replaceAccount: m.replaceAccount }) }))
vi.mock('../../hooks/usePiano', () => ({ usePiano: () => ({ livelloNome: m.livelloNome, pianoCaricatoPer: m.caricatoPer }) }))
vi.mock('../../i18n/LinguaContext', () => ({ useLingua: () => ({ lingua: 'it' }) }))
vi.mock('../../lib/metricheNative', () => ({ impostaRaccolta: m.imposta }))
vi.mock('../../data/firebase/client', () => ({ rileggiConsensoMetriche: m.rileggi }))

function titolare(altro: Record<string, unknown> = {}) {
  return { kind: 'in', account: { uid: 'u', email: 'a@b.it', salonId: 'u', role: 'titolare', consensoMetriche: SI, ...altro } }
}

describe('RaccoltaMetriche', () => {
  beforeEach(() => {
    m.gate = { kind: 'pending' }
    m.livelloNome = 'base'
    m.caricatoPer = 'u'
    m.replaceAccount.mockClear()
    m.rileggi.mockReset()
    m.imposta.mockClear()
  })

  it('finché la sessione non è pronta non decide', () => {
    render(<RaccoltaMetriche />)
    expect(m.imposta).not.toHaveBeenCalled()
    m.gate = titolare()
    m.caricatoPer = undefined
    render(<RaccoltaMetriche />)
    expect(m.imposta).not.toHaveBeenCalled()
  })

  it('un piano di un altro salone non basta per decidere', () => {
    m.gate = titolare()
    m.caricatoPer = 'altro'
    render(<RaccoltaMetriche />)
    expect(m.imposta).not.toHaveBeenCalled()
  })

  it('il collaboratore si spegne senza aspettare il piano', () => {
    m.gate = titolare({ role: 'collaboratore' })
    m.caricatoPer = undefined
    render(<RaccoltaMetriche />)
    expect(m.imposta).toHaveBeenLastCalledWith(false)
  })

  it('tornando nell’app legge la scelta fatta su un altro telefono', async () => {
    m.gate = titolare()
    const no = { attivo: false, at: 'y', fonte: 'account', versione: 2 }
    m.rileggi.mockResolvedValue(no)
    render(<RaccoltaMetriche />)
    window.dispatchEvent(new Event('groomlyResume'))
    await waitFor(() => { expect(m.replaceAccount).toHaveBeenCalledWith(expect.objectContaining({ consensoMetriche: no })) })
  })

  it('accende su ogni telefono del titolare che ha detto sì', () => {
    m.gate = titolare()
    render(<RaccoltaMetriche />)
    expect(m.imposta).toHaveBeenLastCalledWith(true, { piano: 'go', lingua: 'it' })
  })

  it('spegne passando a un collaboratore sullo stesso telefono', () => {
    m.gate = titolare()
    const vista = render(<RaccoltaMetriche />)
    m.gate = titolare({ role: 'collaboratore', uid: 'c' })
    vista.rerender(<RaccoltaMetriche />)
    expect(m.imposta).toHaveBeenLastCalledWith(false)
  })

  it('spegne all’uscita', () => {
    m.gate = titolare()
    const vista = render(<RaccoltaMetriche />)
    m.gate = { kind: 'out' }
    vista.rerender(<RaccoltaMetriche />)
    expect(m.imposta).toHaveBeenLastCalledWith(false)
  })

  it('un salone VIP resta spento anche col sì', () => {
    m.gate = titolare()
    m.livelloNome = 'vip'
    render(<RaccoltaMetriche />)
    expect(m.imposta).toHaveBeenLastCalledWith(false)
  })
})
