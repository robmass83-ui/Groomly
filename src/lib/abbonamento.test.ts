import { describe, expect, it } from 'vitest'
import { COLORE_PIANO, COLORE_PIANO_SCURO, PREZZI, ePianoVetrina, pianoAttivo } from './abbonamento'

describe('pianoAttivo', () => {
  it('Go è sempre attivo', () => {
    expect(pianoAttivo(undefined, 'go')).toBe(true)
    expect(pianoAttivo('base', 'go')).toBe(true)
  })

  it('base non ha Plus né Salone', () => {
    expect(pianoAttivo('base', 'plus')).toBe(false)
    expect(pianoAttivo('base', 'salone')).toBe(false)
    expect(pianoAttivo(undefined, 'plus')).toBe(false)
  })

  it('pro ha Plus ma non Salone', () => {
    expect(pianoAttivo('pro', 'plus')).toBe(true)
    expect(pianoAttivo('pro', 'salone')).toBe(false)
  })

  it('salone e vip hanno tutto', () => {
    for (const livello of ['salone', 'vip'] as const) {
      for (const piano of ['go', 'plus', 'salone'] as const) expect(pianoAttivo(livello, piano)).toBe(true)
    }
  })
})

describe('vetrina', () => {
  it('prezzi segnaposto', () => {
    expect(PREZZI).toEqual({ plus: '9,99 €', salone: '19,99 €' })
  })

  it('colori dei piani presi dai loghi', () => {
    expect(COLORE_PIANO).toEqual({ go: 'var(--pri-solid)', plus: '#7B3FE4', salone: '#C99200' })
    expect(COLORE_PIANO_SCURO).toEqual({ plus: '#4F2BB8', salone: '#8F6400' })
  })

  it('riconosce solo i tre piani della vetrina', () => {
    expect(ePianoVetrina('plus')).toBe(true)
    expect(ePianoVetrina('go')).toBe(true)
    expect(ePianoVetrina('pro')).toBe(false)
    expect(ePianoVetrina(undefined)).toBe(false)
  })
})
