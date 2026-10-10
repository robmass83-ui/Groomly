import { describe, expect, it } from 'vitest'
import { applyBirthYear, categoryFromYear, completeYear, seniorOf } from './dogScreen'

const thresholds = { giovaneFrom: 1, adultoFrom: 3, anzianoFrom: 8 }
const now = new Date(2026, 9, 10, 12, 0, 0, 0)

describe('categoryFromYear', () => {
  it('usa le soglie già salvate', () => {
    expect(categoryFromYear(2026, now, thresholds)).toBe('cucciolo')
    expect(categoryFromYear(2024, now, thresholds)).toBe('giovane')
    expect(categoryFromYear(2020, now, thresholds)).toBe('adulto')
    expect(categoryFromYear(2015, now, thresholds)).toBe('anziano')
  })
})

describe('seniorOf', () => {
  it('è vero solo per anziano', () => {
    expect(seniorOf('anziano')).toBe(true)
    expect(seniorOf('adulto')).toBe(false)
  })
})

describe('applyBirthYear', () => {
  it('un anno incompleto non sposta il segmento', () => {
    expect(applyBirthYear({ ageCategory: 'giovane', birthYear: '20' }, '201', now, thresholds).ageCategory).toBe('giovane')
  })

  it('un anno completo sposta, e il segmento successivo resta finché l’anno non cambia', () => {
    const fromYear = applyBirthYear({ ageCategory: 'adulto', birthYear: '' }, '2024', now, thresholds)
    expect(fromYear.ageCategory).toBe('giovane')
    expect(fromYear.birthYear).toBe('2024')
    const held = applyBirthYear({ ageCategory: 'adulto', birthYear: '2024' }, '2024', now, thresholds)
    expect(held.ageCategory).toBe('adulto')
  })

  it('un anno prima del 1990 non è completo e non sposta il segmento', () => {
    const next = applyBirthYear({ ageCategory: 'adulto', birthYear: '' }, '1988', now, thresholds)
    expect(next).toEqual({ ageCategory: 'adulto', birthYear: '1988' })
    expect(completeYear('1988', now)).toBeNull()
    expect(completeYear('1989', now)).toBeNull()
    expect(completeYear('1990', now)).toBe(1990)
    expect(completeYear('2015', now)).toBe(2015)
    expect(completeYear('2026', now)).toBe(2026)
    expect(completeYear('2027', now)).toBeNull()
  })
})
