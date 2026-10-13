import { describe, expect, it } from 'vitest'
import { eventLayout, nextVisitPill, priceChange, priceTone, serviceTone } from './uiStyle'

describe('uiStyle', () => {
  it('mappa le icone servizio e usa strip se manca', () => {
    expect(serviceTone('bagno')).toEqual({ ink: 'var(--s-bagno)', bg: 'var(--s-bagno-bg)' })
    expect(serviceTone('bagno_taglio').ink).toBe('var(--s-combo)')
    expect(serviceTone(undefined).ink).toBe('var(--s-strip)')
  })

  it('dice tra N minuti, almeno 1, oppure ora', () => {
    const now = new Date(2026, 9, 10, 12, 0, 0)
    expect(nextVisitPill(new Date(2026, 9, 10, 12, 36, 1), now)).toBe('tra 37 min')
    expect(nextVisitPill(new Date(2026, 9, 10, 12, 0, 20), now)).toBe('tra 1 min')
    expect(nextVisitPill(new Date(2026, 9, 10, 11, 30, 0), now)).toBe('ora')
  })

  it('mostra la variazione solo se il totale precedente è diverso', () => {
    expect(priceChange(40, null)).toBeNull()
    expect(priceChange(40, 40)).toBeNull()
    expect(priceChange(45, 40)).toBe('▲ € 5')
    expect(priceChange(38, 40)).toBe('▼ € 2')
  })

  it('compatta sotto i 60 minuti', () => {
    expect(eventLayout(45)).toBe('compact')
    expect(eventLayout(59)).toBe('compact')
    expect(eventLayout(60)).toBe('full')
  })

  it('dà al pelo un tono proprio e riusa i toni servizio', () => {
    expect(priceTone('pelo_corto')).toEqual({ ink: 'var(--s-pelo)', bg: 'var(--s-pelo-bg)' })
    expect(priceTone('pelo_lungo').ink).toBe('var(--s-pelo)')
    expect(priceTone('bagno_sistemazione').ink).toBe('var(--s-combo)')
    expect(priceTone('unghie').ink).toBe('var(--s-taglio)')
    expect(priceTone('orecchie').bg).toBe('var(--s-bagno-bg)')
    expect(priceTone('occhi').ink).toBe('var(--s-bagno)')
    expect(priceTone('shampoo').ink).toBe('var(--s-combo)')
    expect(priceTone('tosatrice').ink).toBe('var(--s-strip)')
    expect(priceTone('dermatologico').ink).toBe('var(--s-derma)')
  })
})
