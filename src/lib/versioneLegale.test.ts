import { describe, expect, it } from 'vitest'
import { DOCUMENTI_IN_VIGORE, VERSIONE_DOCUMENTI, deveRiaccettare, mancaSuServer } from './versioneLegale'

describe('versione dei documenti', () => {
  it('resta alla versione 1: la alza solo il blocco dei testi', () => {
    expect(VERSIONE_DOCUMENTI).toBe(1)
    expect(DOCUMENTI_IN_VIGORE).toEqual({ termini: '1.1', privacy: '2' })
  })

  it('oggi nessun account esistente deve riaccettare', () => {
    expect(deveRiaccettare(undefined)).toBe(false)
    expect(deveRiaccettare({ accettati: true, at: 'x' })).toBe(false)
  })

  it('con la versione 2 riaccetta chi è rimasto indietro', () => {
    expect(deveRiaccettare(undefined, 2)).toBe(true)
    expect(deveRiaccettare({ accettati: true, at: 'x' }, 2)).toBe(true)
    expect(deveRiaccettare({ accettati: true, at: 'x', versione: 1 }, 2)).toBe(true)
    expect(deveRiaccettare({ accettati: true, at: 'x', versione: 2 }, 2)).toBe(false)
  })

  it('manca sul server solo chi ha la versione ma non la prova', () => {
    expect(mancaSuServer(undefined)).toBe(false)
    expect(mancaSuServer({ accettati: true, at: 'x' })).toBe(false)
    expect(mancaSuServer({ accettati: true, at: 'x', versione: 1 })).toBe(true)
    expect(mancaSuServer({ accettati: true, at: 'x', versione: 1, suServer: true })).toBe(false)
  })
})
