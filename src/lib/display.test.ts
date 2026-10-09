import { describe, expect, it } from 'vitest'
import { ageText, formatCompactDuration, shortOwner, splitCritical } from './display'

describe('formatCompactDuration', () => {
  it('compatta minuti e ore', () => {
    expect(formatCompactDuration(0)).toBe('0m')
    expect(formatCompactDuration(45)).toBe('45m')
    expect(formatCompactDuration(120)).toBe('2h')
    expect(formatCompactDuration(65)).toBe('1h05')
    expect(formatCompactDuration(435)).toBe('7h15')
  })
})

describe('ageText', () => {
  const now = new Date(2026, 9, 3, 12, 0, 0, 0)
  it("usa l'anno di nascita", () => {
    expect(ageText(2025, 'Cucciolo', now)).toBe('1 anno')
    expect(ageText(2022, 'Adulto', now)).toBe('4 anni')
    expect(ageText(undefined, 'Adulto', now)).toBe('Adulto')
  })
})

describe('shortOwner', () => {
  it("tiene l'iniziale e il cognome", () => {
    expect(shortOwner('Maria Pinna')).toBe('M. Pinna')
    expect(shortOwner('Maria Luisa Pinna')).toBe('M. Pinna')
    expect(shortOwner('Maria')).toBe('Maria')
    expect(shortOwner('  ')).toBe('')
  })
})

describe('splitCritical', () => {
  it('separa la prima frase', () => {
    expect(splitCritical('Morde. Usare museruola')).toEqual({ title: 'Morde', rest: 'Usare museruola' })
    expect(splitCritical('Solo questo')).toEqual({ title: 'Solo questo', rest: '' })
  })
})
