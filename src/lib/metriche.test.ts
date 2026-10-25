import { describe, expect, it, vi } from 'vitest'
import { registra } from './metriche'

describe('metriche', () => {
  it('senza consenso non chiama il sink; con consenso registra feature e fonte', () => {
    const sink = vi.fn()
    registra(false, { nome: 'paywall_aperta', feature: 'export', fonte: 'home' }, sink)
    expect(sink).not.toHaveBeenCalled()
    registra(true, { nome: 'paywall_aperta', feature: 'export', fonte: 'home' }, sink)
    expect(sink).toHaveBeenCalledWith({ nome: 'paywall_aperta', feature: 'export', fonte: 'home' })
  })
})
