import { describe, expect, it } from 'vitest'
import {
  NA_PRICE_MESSAGE,
  canSaveClose,
  canSkipClose,
  closePatch,
  formatSpent,
  hasVariation,
  naBlocks,
  parseCloseDuration,
  parseClosePrice,
  splitDuration,
} from './closeVisit'

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

  it('il patch tiene il listino, salva la nota anche senza variazione e porta il metodo', () => {
    expect(closePatch({ quotedPrice: 50, quotedMinutes: 60, price: 50, minutes: 60, note: '  niente  ', paymentMethod: 'pos' })).toEqual({
      total: null,
      actualDurationMin: 60,
      adjustmentNote: 'niente',
      paymentMethod: 'pos',
    })
    expect(closePatch({ quotedPrice: 50, quotedMinutes: 60, price: 70, minutes: 120, note: '  Pieno di nodi  ', paymentMethod: 'contanti' })).toEqual({
      total: 70,
      actualDurationMin: 120,
      adjustmentNote: 'Pieno di nodi',
      paymentMethod: 'contanti',
    })
    expect(closePatch({ quotedPrice: 50, quotedMinutes: 60, price: 0, minutes: 60, note: '   ', paymentMethod: 'na' })).toEqual({
      total: 0,
      actualDurationMin: 60,
      adjustmentNote: null,
      paymentMethod: 'na',
    })
  })

  it('solo il tempo si salva senza nota, il prezzo no, N/A a zero sì', () => {
    const same = { quotedPrice: 50, quotedMinutes: 60, priceRaw: '50', hoursRaw: '1', minutesRaw: '0', note: '', payment: 'pos' as const }
    expect(canSkipClose(same)).toBe(true)
    expect(canSaveClose({ ...same, allowSame: false })).toBe(false)
    expect(canSaveClose({ ...same, allowSame: true })).toBe(true)
    expect(canSkipClose({ ...same, payment: null })).toBe(false)
    const timeOnly = { ...same, hoursRaw: '2' }
    expect(canSkipClose(timeOnly)).toBe(false)
    expect(canSaveClose({ ...timeOnly, allowSame: false })).toBe(true)
    const price = { ...same, priceRaw: '70', payment: 'contanti' as const }
    expect(canSaveClose({ ...price, allowSame: false })).toBe(false)
    expect(canSaveClose({ ...price, note: 'Nodi', allowSame: false })).toBe(true)
    const offered = { ...same, priceRaw: '0', payment: 'na' as const }
    expect(naBlocks(offered)).toBe(false)
    expect(canSaveClose({ ...offered, allowSame: false })).toBe(true)
    expect(naBlocks({ priceRaw: '38', payment: 'na' })).toBe(true)
    expect(canSaveClose({ ...same, priceRaw: '38', payment: 'na', allowSame: false })).toBe(false)
    expect(canSkipClose({ ...same, priceRaw: '38', payment: 'na' })).toBe(false)
    expect(NA_PRICE_MESSAGE).toBe('Con N/A il prezzo deve essere 0')
    expect(canSkipClose({ quotedPrice: 0, quotedMinutes: 60, priceRaw: '0', hoursRaw: '1', minutesRaw: '0', payment: 'na' })).toBe(true)
  })
})
