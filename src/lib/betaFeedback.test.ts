import { describe, expect, it } from 'vitest'
import { FASCE_PREZZO, LIMITE_FEEDBACK_GIORNO, PAGHERESTI } from './betaFeedback'

describe('feedback beta', () => {
  it('ha le risposte fisse del modulo', () => {
    expect(PAGHERESTI).toEqual(['si', 'forse', 'no'])
    expect(FASCE_PREZZO).toEqual(['meno-5', '5-10', '10-20', 'piu-20'])
    expect(LIMITE_FEEDBACK_GIORNO).toBe(5)
  })
})
