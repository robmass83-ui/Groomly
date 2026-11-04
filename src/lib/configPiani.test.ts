import { describe, expect, it } from 'vitest'
import { CONFIG_PIANI_DEFAULT, leggiConfigPiani, provaSelfServiceAccesa, provaSelfServiceConcessa } from './configPiani'

describe('config dei piani', () => {
  it('di default è tutto spento', () => {
    expect(CONFIG_PIANI_DEFAULT).toEqual({
      provaSelfService: false,
      showPrezziInBeta: false,
      offertaEarlyAdopter: { it: '', en: '', es: '' },
      revenueCat: { chiaveSdk: '', offeringId: 'groomly_standard' },
      annuncioPagamentiIl: null,
    })
  })

  it('config assente o rotta → default', () => {
    expect(leggiConfigPiani(undefined)).toEqual(CONFIG_PIANI_DEFAULT)
    expect(leggiConfigPiani({ piani: 'x' })).toEqual(CONFIG_PIANI_DEFAULT)
    expect(leggiConfigPiani({ piani: { provaSelfService: 'si', revenueCat: 3, offertaEarlyAdopter: { it: 5 } } })).toEqual(CONFIG_PIANI_DEFAULT)
  })

  it('legge i valori validi e completa il resto', () => {
    expect(leggiConfigPiani({
      mostraPiani: true,
      piani: { provaSelfService: true, offertaEarlyAdopter: { en: 'Half price' }, revenueCat: { chiaveSdk: 'goog_x' }, annuncioPagamentiIl: '2027-01-01T00:00:00.000Z' },
    })).toEqual({
      ...CONFIG_PIANI_DEFAULT,
      provaSelfService: true,
      offertaEarlyAdopter: { it: '', en: 'Half price', es: '' },
      revenueCat: { chiaveSdk: 'goog_x', offeringId: 'groomly_standard' },
      annuncioPagamentiIl: '2027-01-01T00:00:00.000Z',
    })
  })

  it('la prova self-service si accende solo col flag a true', () => {
    expect(provaSelfServiceAccesa(undefined)).toBe(false)
    expect(provaSelfServiceAccesa({ piani: { provaSelfService: true } })).toBe(true)
  })
})

describe('prova self-service per l’app', () => {
  const adesso = new Date('2026-11-04T10:00:00.000Z')
  it('serve sia la config accesa sia un Go puro', () => {
    expect(provaSelfServiceConcessa(undefined, undefined, adesso)).toBe(false)
    expect(provaSelfServiceConcessa({ piani: { provaSelfService: true } }, undefined, adesso)).toBe(true)
    expect(provaSelfServiceConcessa({ piani: { provaSelfService: true } }, { piano: 'base', provaUsata: true }, adesso)).toBe(false)
  })
})
