import { describe, expect, it } from 'vitest'
import type { Appointment, Dog } from '../types/models'
import { blockTone, daySummary, parseVista, snapQuarter, weekDays } from './calendarView'

function dog(id: string, temperament: Dog['temperament']): Dog {
  return { id, temperament } as Dog
}

function visit(dogId: string, minutes: number): Appointment {
  return {
    id: `${dogId}-${minutes}`,
    dogId,
    start: new Date(2026, 9, 5, 9, 0, 0, 0),
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: minutes, price: 1 }],
    status: 'programmato',
    createdAt: new Date(2026, 9, 5, 9, 0, 0, 0),
    updatedAt: new Date(2026, 9, 5, 9, 0, 0, 0),
  }
}

describe('blockTone', () => {
  it('preferisce il mensile, poi bagno e taglio, poi dermatologico o antiparassitario', () => {
    expect(blockTone('mensile', ['bagno_taglio'])).toBe('warn')
    expect(blockTone('occasionale', ['bagno_taglio'])).toBe('sen')
    expect(blockTone('occasionale', ['dermatologico'])).toBe('tea')
    expect(blockTone('occasionale', ['antiparassitario'])).toBe('tea')
    expect(blockTone('occasionale', ['bagno'])).toBe('pri')
    expect(blockTone('occasionale', ['bagno-taglio'])).toBe('pri')
  })
})

describe('parseVista', () => {
  it('torna giorno se il valore non è uno dei tre', () => {
    expect(parseVista('no')).toBe('giorno')
    expect(parseVista(null)).toBe('giorno')
    expect(parseVista('settimana')).toBe('settimana')
    expect(parseVista('mese')).toBe('mese')
  })
})

describe('snapQuarter', () => {
  it('aggancia ai quarti d’ora e resta fra le 08:00 e le 19:00', () => {
    expect(snapQuarter(new Date(2026, 9, 5, 10, 7))).toEqual(new Date(2026, 9, 5, 10, 0))
    expect(snapQuarter(new Date(2026, 9, 5, 10, 8))).toEqual(new Date(2026, 9, 5, 10, 15))
    expect(snapQuarter(new Date(2026, 9, 5, 20, 0))).toEqual(new Date(2026, 9, 5, 19, 0))
    expect(snapQuarter(new Date(2026, 9, 5, 7, 30))).toEqual(new Date(2026, 9, 5, 8, 0))
  })
})

describe('weekDays', () => {
  it('è il lunedì–domenica che contiene il giorno', () => {
    const days = weekDays(new Date(2026, 9, 3))
    expect(days).toHaveLength(7)
    expect(days[0].getDay()).toBe(1)
    expect(days[0].getMonth()).toBe(8)
    expect(days[0].getDate()).toBe(28)
    expect(days[6].getDay()).toBe(0)
    expect(days[6].getDate()).toBe(4)
  })
})

describe('daySummary', () => {
  it('conta i cani distinti, somma le durate e i mordaci distinti', () => {
    const dogs = [dog('rex', 'mordace'), dog('luna', 'bravo')]
    expect(daySummary(dogs, [visit('rex', 30), visit('rex', 45), visit('luna', 20)])).toEqual({
      dogs: 2,
      minutes: 95,
      mordaci: 1,
    })
    expect(daySummary(dogs, [])).toEqual({ dogs: 0, minutes: 0, mordaci: 0 })
  })
})
