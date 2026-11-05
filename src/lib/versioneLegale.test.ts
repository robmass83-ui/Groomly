import { describe, expect, it } from 'vitest'
import { DOCUMENTI_IN_VIGORE, RIACCETTA_DAL, VERSIONE_DOCUMENTI, deveRiaccettare, documentiPerRuolo, leggiConsensoMetriche, mancaSuServer } from './versioneLegale'

describe('versione dei documenti', () => {
  const PRIMA = new Date('2026-11-30T22:59:00.000Z')
  const DOPO = new Date('2026-11-30T23:00:00.000Z')

  it('i documenti in vigore sono quelli del blocco 4', () => {
    expect(VERSIONE_DOCUMENTI).toBe(2)
    expect(DOCUMENTI_IN_VIGORE).toEqual({ termini: '2', privacy: '3', dpa: '2' })
  })

  it('prima della data chi ha la 1 entra, dalla mezzanotte di Roma riaccetta', () => {
    const termini = { accettati: true, at: 'x', versione: 1 } as const
    expect(RIACCETTA_DAL).toBe('2026-12-01')
    expect(deveRiaccettare(termini, 2, PRIMA)).toBe(false)
    expect(deveRiaccettare(termini, 2, DOPO)).toBe(true)
  })

  it('dalla data riaccetta chi è rimasto indietro', () => {
    expect(deveRiaccettare(undefined, 2, DOPO)).toBe(true)
    expect(deveRiaccettare({ accettati: true, at: 'x' }, 2, DOPO)).toBe(true)
    expect(deveRiaccettare({ accettati: true, at: 'x', versione: 2 }, 2, DOPO)).toBe(false)
  })

  it('il DPA lo accetta solo il titolare', () => {
    expect(documentiPerRuolo('titolare')).toEqual(DOCUMENTI_IN_VIGORE)
    expect(documentiPerRuolo('socio')).toEqual({ termini: '2', privacy: '3' })
    expect(documentiPerRuolo('collaboratore')).toEqual({ termini: '2', privacy: '3' })
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
