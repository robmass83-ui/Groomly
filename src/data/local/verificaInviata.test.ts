// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { secondiDaAspettare, segnaVerificaInviata, verificaInviataIl } from './verificaInviata'

describe('verificaInviata', () => {
  beforeEach(() => localStorage.clear())

  it('senza invio non si aspetta', () => {
    expect(secondiDaAspettare(null, 0)).toBe(0)
  })

  it('il conto scende con i secondi passati', () => {
    expect(secondiDaAspettare(1000, 1000)).toBe(60)
    expect(secondiDaAspettare(0, 15_500)).toBe(45)
    expect(secondiDaAspettare(0, 61_000)).toBe(0)
  })

  it('un invio nel futuro non supera i 60 secondi', () => {
    expect(secondiDaAspettare(10_000, 0)).toBe(60)
  })

  it('il segno è per email in minuscolo', () => {
    segnaVerificaInviata('A@b.it', 5)
    expect(verificaInviataIl('a@b.it')).toBe(5)
    expect(verificaInviataIl('altra@b.it')).toBeNull()
  })
})
