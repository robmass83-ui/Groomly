import { describe, expect, it } from 'vitest'
import { applyBirthYear, categoryFromYear, seniorOf } from './dogScreen'

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
})
