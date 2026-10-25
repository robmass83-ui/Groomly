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

  it('la previsione somma l’incassato e i programmati al netto di chi non viene', () => {
    const visite = [
      { status: 'completato' as const, incasso: 40, minutiPrevisti: 30, dogId: 'a', start: new Date(0) },
      { status: 'non_venuto' as const, incasso: 0, minutiPrevisti: 30, dogId: 'b', start: new Date(0) },
      { status: 'programmato' as const, incasso: 20, minutiPrevisti: 30, dogId: 'c', start: new Date(giorno) },
    ]
    expect(previsione(visite)).toBe(50)
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
