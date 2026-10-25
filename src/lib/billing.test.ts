import { describe, expect, it, vi } from 'vitest'
import { compra, sondaggioDisdettaVisibile } from './billing'

describe('acquisti spenti', () => {
  it('con gli abbonamenti spenti non carica lo store e nasconde il sondaggio', () => {
    const carica = vi.fn()
    expect(compra(false, carica)).toEqual({ stato: 'spento' })
    expect(carica).not.toHaveBeenCalled()
    expect(sondaggioDisdettaVisibile(false)).toBe(false)
  })
})
