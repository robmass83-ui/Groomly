import { describe, expect, it } from 'vitest'
import type { Appointment } from '../types/models'
import { ageText, averageDuration, formatCompactDuration, shortOwner, splitCritical } from './display'

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

function visit(partial: Pick<Appointment, 'id' | 'dogId' | 'start'> & Partial<Appointment>): Appointment {
  return {
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 60, price: 20 }],
    status: 'completato',
    createdAt: partial.start,
    updatedAt: partial.start,
    ...partial,
  }
}

describe('averageDuration', () => {
  it('media gli ultimi cinque e, se manca la durata reale, quella prevista', () => {
    const dogId = 'cane'
    const oldest = visit({
      id: 'vecchio',
      dogId,
      start: new Date(2026, 0, 1, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 90, price: 20 }],
    })
    const recent = [2, 3, 4, 5, 6].map((day) => visit({
      id: `g${day}`,
      dogId,
      start: new Date(2026, 0, day, 9, 0, 0, 0),
      actualDurationMin: 60,
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 15, price: 20 }],
    }))
    const other = visit({
      id: 'altro',
      dogId: 'altro',
      start: new Date(2026, 0, 7, 9, 0, 0, 0),
      actualDurationMin: 10,
    })
    expect(averageDuration([oldest, ...recent, other], dogId)).toBe('1h')
    const planned = [
      visit({
        id: 'p30',
        dogId,
        start: new Date(2026, 1, 1, 9, 0, 0, 0),
        services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 10 }],
      }),
      visit({
        id: 'p60',
        dogId,
        start: new Date(2026, 1, 2, 9, 0, 0, 0),
        services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 60, price: 10 }],
      }),
    ]
    expect(averageDuration(planned, dogId)).toBe('45m')
    expect(averageDuration([], dogId)).toBe('—')
  })
})
