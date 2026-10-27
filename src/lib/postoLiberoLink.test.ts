import { describe, expect, it } from 'vitest'
import { parametriPosto } from './postoLiberoLink'

describe('parametri del posto libero', () => {
  it('legge giorno e ora solo se sono una data e un orario', () => {
    expect(parametriPosto('2026-10-28', '10:00')).toEqual({ giorno: '2026-10-28', ora: '10:00' })
    expect(parametriPosto('domani', '10:00')).toBeNull()
    expect(parametriPosto('2026-10-28', '25:00')).toBeNull()
  })
})
