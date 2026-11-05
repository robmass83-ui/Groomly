import { describe, expect, it } from 'vitest'
import { RICONFERMA_MS, controllaAccessoRecente, controllaAdminRecente } from './accessoRecente'

const ADESSO = Date.parse('2026-11-05T10:00:00Z')
const secondiFa = (minuti: number, secondi = 0) => (ADESSO - minuti * 60_000 - secondi * 1000) / 1000

describe('accesso recente', () => {
  it('vale 15 minuti', () => {
    expect(RICONFERMA_MS).toBe(15 * 60 * 1000)
  })

  it('a 14:59 passa, a 15:01 chiede la riconferma', () => {
    expect(() => controllaAccessoRecente(secondiFa(14, 59), ADESSO)).not.toThrow()
    expect(() => controllaAccessoRecente(secondiFa(15, 1), ADESSO)).toThrow('Conferma la password per continuare')
  })

  it('senza data d’accesso chiede la riconferma', () => {
    expect(() => controllaAccessoRecente(undefined, ADESSO)).toThrow('Conferma la password per continuare')
    expect(() => controllaAccessoRecente('ieri', ADESSO)).toThrow('Conferma la password per continuare')
  })

  it('risponde col codice che il client riconosce', () => {
    try {
      controllaAccessoRecente(undefined, ADESSO)
      expect.unreachable()
    } catch (error) {
      expect(error).toMatchObject({ details: { codice: 'riconferma_richiesta' } })
    }
  })

  it('chi non è admin non riceve la riconferma: lo ferma il controllo del claim', () => {
    expect(() => controllaAdminRecente({ auth_time: secondiFa(60) }, ADESSO)).not.toThrow()
    expect(() => controllaAdminRecente(undefined, ADESSO)).not.toThrow()
    expect(() => controllaAdminRecente({ admin: true, auth_time: secondiFa(60) }, ADESSO)).toThrow('Conferma la password per continuare')
  })
})
