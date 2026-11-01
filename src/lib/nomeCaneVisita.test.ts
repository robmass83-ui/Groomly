import { describe, expect, it } from 'vitest'
import type { Dog } from '../types/models'
import { nomeCaneVisita } from './nomeCaneVisita'

const frasi = { rigaCaneAssente: 'Cane eliminato', rigaCaneNeutro: 'Cane' }

describe('nomeCaneVisita', () => {
  it('con il cane usa il suo nome', () => {
    expect(nomeCaneVisita({ name: 'Rex' } as Dog, 'Ada', true, frasi)).toBe('Rex')
  })

  it('senza cane usa il nome dell ospite', () => {
    expect(nomeCaneVisita(undefined, 'Ada', true, frasi)).toBe('Ada')
    expect(nomeCaneVisita(undefined, 'Ada', false, frasi)).toBe('Ada')
  })

  it('senza cane né ospite dice Cane eliminato solo con i cani dal server', () => {
    expect(nomeCaneVisita(undefined, '', true, frasi)).toBe('Cane eliminato')
    expect(nomeCaneVisita(undefined, '', false, frasi)).toBe('Cane')
  })
})
