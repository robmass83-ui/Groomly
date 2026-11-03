import { describe, expect, it } from 'vitest'
import { clientiInRitardo, euroOra, previsione } from './statistiche'

const giorno = 24 * 60 * 60 * 1000

describe('statistiche', () => {
  it('euro ora usa la durata effettiva e, se manca, quella prevista', () => {
    const ora = euroOra([
      { status: 'completato', incasso: 60, minutiEffettivi: 30, minutiPrevisti: 60, dogId: 'a', start: new Date(0) },
      { status: 'completato', incasso: 30, minutiPrevisti: 30, dogId: 'b', start: new Date(0) },
    ])
    expect(ora).toBe(90)
  })

  describe('previsione del mese', () => {
    const novembre = { inizio: new Date(2026, 10, 1), fine: new Date(2026, 11, 1) }
    const v = (status: 'completato' | 'programmato' | 'non_venuto', incasso: number, start: Date) => ({ status, incasso, minutiPrevisti: 30, dogId: 'a', start })

    it('conta solo incassato e programmati del periodo', () => {
      const visite = [
        v('completato', 50, new Date(2026, 9, 20)),
        v('completato', 30, new Date(2026, 10, 3)),
        v('programmato', 40, new Date(2026, 10, 20)),
        v('programmato', 40, new Date(2026, 10, 25)),
      ]
      expect(previsione(visite, novembre)).toBe(110)
    })

    it('applica il tasso di non venuti di tutte le visite chiuse ai programmati', () => {
      const visite = [
        v('completato', 50, new Date(2026, 9, 1)),
        v('completato', 30, new Date(2026, 10, 3)),
        v('completato', 10, new Date(2026, 8, 3)),
        v('non_venuto', 0, new Date(2026, 8, 5)),
        v('programmato', 40, new Date(2026, 10, 20)),
        v('programmato', 40, new Date(2026, 10, 25)),
      ]
      expect(previsione(visite, novembre)).toBe(90)
    })

    it('inizio incluso e fine escluso', () => {
      const visite = [v('completato', 10, novembre.inizio), v('completato', 20, novembre.fine)]
      expect(previsione(visite, novembre)).toBe(10)
    })
  })

  it('un cliente è in ritardo se ha superato l’intervallo medio per una volta e mezzo e non ha futuri', () => {
    const adesso = new Date(10 * giorno)
    const visite = [
      { status: 'completato' as const, incasso: 10, minutiPrevisti: 30, dogId: 'rex', start: new Date(0) },
      { status: 'completato' as const, incasso: 10, minutiPrevisti: 30, dogId: 'rex', start: new Date(2 * giorno) },
      { status: 'completato' as const, incasso: 10, minutiPrevisti: 30, dogId: 'fido', start: new Date(8 * giorno) },
      { status: 'programmato' as const, incasso: 10, minutiPrevisti: 30, dogId: 'fido', start: new Date(12 * giorno) },
    ]
    expect(clientiInRitardo(visite, adesso)).toEqual(['rex'])
  })
})
