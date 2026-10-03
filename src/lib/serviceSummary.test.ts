import { describe, expect, it } from 'vitest'
import { activeServicesSubtitle, summarizeDuration, summarizePrice } from './serviceSummary'

const base = { createdAt: new Date(), updatedAt: new Date(), id: 'x', name: 'x', order: 0, active: true }

describe('serviceSummary', () => {
  it('riassume un principale con intervallo e un valore unico', () => {
    expect(summarizeDuration({ ...base, kind: 'principale', durationMin: { piccola: 30, media: 45, grande: 60 } })).toBe('30–60m')
    expect(summarizePrice({ ...base, kind: 'principale', price: { piccola: 20, media: 28, grande: 38 } })).toBe('€ 20–38')
    expect(summarizeDuration({ ...base, kind: 'principale', durationMin: { piccola: 60, media: 60, grande: 60 } })).toBe('60m')
  })

  it('prefissa la durata extra', () => {
    expect(summarizeDuration({ ...base, kind: 'extra', durationMin: { piccola: 20, media: 20, grande: 20 } })).toBe('+20m')
    expect(summarizePrice({ ...base, kind: 'extra', price: { piccola: 5, media: 5, grande: 5 } })).toBe('€ 5')
  })

  it('accorda il sottotitolo', () => {
    expect(activeServicesSubtitle(1)).toBe('1 servizio · tempi stimati')
    expect(activeServicesSubtitle(8)).toBe('8 servizi · tempi stimati')
  })
})
