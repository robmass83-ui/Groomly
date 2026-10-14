import { describe, expect, it } from 'vitest'
import { canSaveClose, canSkipClose, closePatch, formatSpent, hasVariation, parseCloseDuration, parseClosePrice, splitDuration } from './closeVisit'

describe('closeVisit', () => {
  it('spezza i minuti e li legge', () => {
    expect(splitDuration(90)).toEqual({ hours: 1, minutes: 30 })
    expect(formatSpent(120)).toBe('2 h 00')
    expect(formatSpent(45)).toBe('45 min')
  })

  it('accetta importo e tempo nei limiti', () => {
    expect(parseClosePrice('70,5')).toEqual({ ok: true, value: 70.5 })
    expect(parseClosePrice('abc')).toEqual({ ok: false, message: 'Importo non valido' })
    expect(parseCloseDuration('2', '00')).toEqual({ ok: true, value: 120 })
    expect(parseCloseDuration('24', '0')).toEqual({ ok: true, value: 1440 })
    expect(parseCloseDuration('0', '0').ok).toBe(false)
    expect(parseCloseDuration('24', '1').ok).toBe(false)
    expect(parseCloseDuration('1', '90').ok).toBe(false)
  })

  it('la variazione è in centesimi o in minuti', () => {
    expect(hasVariation(50, 60, 50, 60)).toBe(false)
    expect(hasVariation(50, 60, 50.0, 60)).toBe(false)
    expect(hasVariation(50, 60, 70, 60)).toBe(true)
    expect(hasVariation(50, 60, 50, 120)).toBe(true)
  })

  it('il patch tiene il listino e la nota solo se serve', () => {
    expect(closePatch({ quotedPrice: 50, quotedMinutes: 60, price: 50, minutes: 60, note: '  niente  ' })).toEqual({
      total: null,
      actualDurationMin: 60,
      adjustmentNote: null,
    })
    expect(closePatch({ quotedPrice: 50, quotedMinutes: 60, price: 70, minutes: 120, note: '  Pieno di nodi  ' })).toEqual({
      total: 70,
      actualDurationMin: 120,
      adjustmentNote: 'Pieno di nodi',
    })
  })

  it('Nessuna modifica e Salva seguono la variazione', () => {
    const same = { quotedPrice: 50, quotedMinutes: 60, priceRaw: '50', hoursRaw: '1', minutesRaw: '0', note: 'x' }
    expect(canSkipClose(same)).toBe(true)
    expect(canSaveClose(same)).toBe(false)
    const changed = { ...same, priceRaw: '70', hoursRaw: '2', note: '   ' }
    expect(canSkipClose(changed)).toBe(false)
    expect(canSaveClose(changed)).toBe(false)
    expect(canSaveClose({ ...changed, note: 'Nodi' })).toBe(true)
    expect(canSkipClose({ ...same, priceRaw: 'no' })).toBe(false)
  })
})
