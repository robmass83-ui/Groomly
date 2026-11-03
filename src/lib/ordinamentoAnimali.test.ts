// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { leggiOrdinamento, salvaOrdinamento } from './ordinamentoAnimali'

describe('ordinamento animali ricordato', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('senza scelta è alfabetico', () => {
    expect(leggiOrdinamento()).toBe('alfabetico')
  })

  it('ricorda la scelta salvata', () => {
    salvaOrdinamento('prossimo')
    expect(leggiOrdinamento()).toBe('prossimo')
  })

  it('un valore sconosciuto torna alfabetico', () => {
    localStorage.setItem('groomly.ordinamentoAnimali', 'xyz')
    expect(leggiOrdinamento()).toBe('alfabetico')
  })

  it('se localStorage lancia, legge alfabetico e salva senza errori', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloccato')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloccato')
    })
    expect(leggiOrdinamento()).toBe('alfabetico')
    expect(() => salvaOrdinamento('prossimo')).not.toThrow()
  })
})
