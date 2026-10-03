import { startOfWeek } from 'date-fns'
import { describe, expect, it } from 'vitest'
import { formatEuro, formatHomeDate, IT_DATE } from './format'

describe('formatEuro', () => {
  it('mette il simbolo prima e omette i decimali interi', () => {
    expect(formatEuro(25)).toBe('€ 25')
  })

  it('mostra due decimali con la virgola italiana', () => {
    expect(formatEuro(10.5)).toBe('€ 10,50')
  })
})

describe('formatHomeDate', () => {
  it('scrive il giorno con l’iniziale maiuscola', () => {
    expect(formatHomeDate(new Date(2026, 9, 1, 12))).toBe('Giovedì 1 ottobre')
  })
})

describe('IT_DATE', () => {
  it('fa iniziare la settimana di lunedì', () => {
    const monday = startOfWeek(new Date(2026, 9, 1, 12), IT_DATE)
    expect(monday.getDay()).toBe(1)
    expect(monday.getDate()).toBe(28)
    expect(monday.getMonth()).toBe(8)
  })
})
