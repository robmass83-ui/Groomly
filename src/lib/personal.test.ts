import { describe, expect, it } from 'vitest'
import { appointmentKind, personalEndOk, personalPlaceMinutes, personalTitleOk } from './personal'

describe('personale', () => {
  it('senza kind è pelosetto', () => {
    expect(appointmentKind({})).toBe('pelosetto')
    expect(appointmentKind({ kind: 'personale' })).toBe('personale')
  })

  it('il titolo ha da 1 a 60 caratteri', () => {
    expect(personalTitleOk('  Dentista  ')).toBe(true)
    expect(personalTitleOk('   ')).toBe(false)
    expect(personalTitleOk('a'.repeat(61))).toBe(false)
  })

  it('la fine vuota va bene; lo stesso minuto no; il giorno dopo no', () => {
    const start = new Date(2026, 9, 21, 18, 0)
    expect(personalEndOk(start, null)).toBe(true)
    expect(personalEndOk(start, new Date(2026, 9, 21, 18, 0))).toBe(false)
    expect(personalEndOk(start, new Date(2026, 9, 21, 19, 0))).toBe(true)
    expect(personalEndOk(start, new Date(2026, 9, 22, 9, 0))).toBe(false)
  })

  it('senza fine occupa 15 minuti, con fine i minuti veri', () => {
    const start = new Date(2026, 9, 21, 18, 0)
    expect(personalPlaceMinutes(start, null)).toBe(15)
    expect(personalPlaceMinutes(start, new Date(2026, 9, 21, 19, 30))).toBe(90)
  })
})
