// @vitest-environment happy-dom
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RaccoltaMetriche } from './RaccoltaMetriche'

const SI = { attivo: true, at: 'x', fonte: 'account', versione: 2 }
const m = vi.hoisted(() => ({
  gate: { kind: 'pending' } as Record<string, unknown>,
  livelloNome: 'base' as string | undefined,
  imposta: vi.fn(async () => undefined),
}))

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock('../../hooks/useSession', () => ({ useSession: () => ({ gate: m.gate, admin: false }) }))
vi.mock('../../hooks/usePiano', () => ({ usePiano: () => ({ livelloNome: m.livelloNome }) }))
vi.mock('../../i18n/LinguaContext', () => ({ useLingua: () => ({ lingua: 'it' }) }))
vi.mock('../../lib/metricheNative', () => ({ impostaRaccolta: m.imposta }))

function titolare(altro: Record<string, unknown> = {}) {
  return { kind: 'in', account: { uid: 'u', email: 'a@b.it', salonId: 'u', role: 'titolare', consensoMetriche: SI, ...altro } }
}

describe('RaccoltaMetriche', () => {
  beforeEach(() => {
    m.gate = { kind: 'pending' }
    m.livelloNome = 'base'
    m.imposta.mockClear()
  })

  it('finché la sessione non è pronta non decide', () => {
    render(<RaccoltaMetriche />)
    expect(m.imposta).not.toHaveBeenCalled()
    m.gate = titolare()
    m.livelloNome = undefined
    render(<RaccoltaMetriche />)
    expect(m.imposta).not.toHaveBeenCalled()
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
