import { describe, expect, it } from 'vitest'
import { dopoChiusura, puoProporre } from './proposte'

describe('proposte', () => {
  it('prima di sette giorni non propone, e chiudere conta come proposta', () => {
    const prima = new Date('2026-10-01T00:00:00.000Z')
    const treGiorni = new Date('2026-10-04T00:00:00.000Z')
    const ottoGiorni = new Date('2026-10-08T00:00:00.000Z')
    expect(puoProporre(null, prima)).toBe(true)
    expect(puoProporre(prima, treGiorni)).toBe(false)
    expect(puoProporre(dopoChiusura(prima), treGiorni)).toBe(false)
    expect(puoProporre(prima, ottoGiorni)).toBe(true)
  })
})
