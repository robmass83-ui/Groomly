import { describe, expect, it } from 'vitest'
import { DOCUMENTI_IN_VIGORE, VERSIONE_DOCUMENTI, deveRiaccettare, leggiConsensoMetriche, mancaSuServer } from './versioneLegale'

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

describe('consenso alle statistiche', () => {
  it('legge un consenso completo', () => {
    const consenso = { attivo: false, at: '2026-11-05T10:00:00.000Z', fonte: 'tour', versione: 1 }
    expect(leggiConsensoMetriche(consenso)).toEqual(consenso)
  })

  it('scarta i dati incompleti', () => {
    expect(leggiConsensoMetriche({ attivo: 'si' })).toBeUndefined()
    expect(leggiConsensoMetriche({ attivo: true, at: 'x', fonte: 'altro', versione: 1 })).toBeUndefined()
    expect(leggiConsensoMetriche(undefined)).toBeUndefined()
  })
})
