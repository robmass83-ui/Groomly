import { describe, expect, it } from 'vitest'
import { azzeraPrimoDato, leggiPrimoDato, segnaApertura, segnaPrimoDato } from './primoDato'

describe('primo dato', () => {
  it('salva i millisecondi dall’apertura e non li riscrive', () => {
    azzeraPrimoDato()
    expect(segnaApertura(1000)).toBe(1000)
    expect(segnaApertura(50)).toBe(1000)
    expect(segnaPrimoDato(2500)).toBe(1500)
    expect(leggiPrimoDato()).toBe(1500)
    expect(segnaPrimoDato(9000)).toBeNull()
    expect(leggiPrimoDato()).toBe(1500)
  })
})
