import { describe, expect, it } from 'vitest'
import { esitoToken, schedaPubblica } from './schedaPubblica'

describe('scheda pubblica', () => {
  it('non restituisce note, tag né comportamento, e un token revocato è non trovato', () => {
    const pubblica = schedaPubblica({
      name: 'Rex',
      species: 'cane',
      notes: 'segreto',
      tags: ['vip'],
      behavior: 'mordace',
      temperament: 'mordace',
    })
    expect(pubblica).toEqual({ nome: 'Rex', specie: 'cane' })
    expect(JSON.stringify(pubblica)).not.toMatch(/segreto|vip|mordace|notes|tags|behavior/)
    expect(esitoToken(true, true)).toBe('non_trovata')
    expect(esitoToken(false, false)).toBe('non_trovata')
    expect(esitoToken(false, true)).toBe('ok')
  })
})
