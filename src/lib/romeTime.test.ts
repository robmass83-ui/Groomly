import { describe, expect, it } from 'vitest'
import { romeDay, romeIso } from './romeTime'

describe('Europe/Rome', () => {
  it('le 23:30 italiane restano nello stesso giorno anche visto da UTC+3', () => {
    const instant = new Date('2026-10-22T21:30:00.000Z')
    expect(romeDay(instant)).toBe('2026-10-22')
    expect(romeIso(instant)).toBe('2026-10-22T23:30:00+02:00')
  })

  it('in inverno l’offset è +01:00', () => {
    const instant = new Date('2026-01-15T12:00:00.000Z')
    expect(romeDay(instant)).toBe('2026-01-15')
    expect(romeIso(instant)).toBe('2026-01-15T13:00:00+01:00')
  })
})
