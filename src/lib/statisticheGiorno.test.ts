import { describe, expect, it } from 'vitest'
import { giornoPrecedenteRoma, leggiStatistiche, limitiGiornoRoma, lunediRoma, type StatisticheGiorno } from './statisticheGiorno'

const RIGA: StatisticheGiorno = {
  giorno: '2026-11-04', saloni: 3, nuovi: 1, attivi1: 1, attivi7: 2, attivi30: 3, attivati: 2,
  appuntamenti: 4, mediaAppuntamenti: 4, coorti: [{ settimana: '2026-11-02', saloni: 1, rimasti7: 0, rimasti30: 0 }],
  avvisami: { plus: 1, salon: 0 }, esclusi: 2, calcolatoIl: '2026-11-05T02:30:00.000Z',
}

describe('giorni a Roma', () => {
  it('il giorno appena finito', () => {
    expect(giornoPrecedenteRoma(new Date('2026-11-05T02:30:00.000Z'))).toBe('2026-11-04')
    expect(giornoPrecedenteRoma(new Date('2026-01-01T02:30:00.000Z'))).toBe('2025-12-31')
  })

  it('un giorno normale dura 24 ore', () => {
    const [inizio, fine] = limitiGiornoRoma('2026-11-04')
    expect(new Date(inizio).toISOString()).toBe('2026-11-03T23:00:00.000Z')
    expect(fine - inizio).toBe(24 * 3_600_000)
  })

  it('il giorno del cambio d’ora dura 25 ore', () => {
    const [inizio, fine] = limitiGiornoRoma('2026-10-25')
    expect(new Date(inizio).toISOString()).toBe('2026-10-24T22:00:00.000Z')
    expect(fine - inizio).toBe(25 * 3_600_000)
  })

  it('la settimana comincia di lunedì', () => {
    expect(lunediRoma(new Date('2026-11-04T10:00:00.000Z'))).toBe('2026-11-02')
    expect(lunediRoma(new Date('2026-11-01T10:00:00.000Z'))).toBe('2026-10-26')
  })
})

describe('leggiStatistiche', () => {
  it('legge una riga completa', () => {
    expect(leggiStatistiche(RIGA)).toEqual(RIGA)
  })

  it('scarta una riga rotta', () => {
    expect(leggiStatistiche({ giorno: '2026-11-04' })).toBeUndefined()
    expect(leggiStatistiche(null)).toBeUndefined()
  })
})
