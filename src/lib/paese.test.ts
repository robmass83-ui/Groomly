import { describe, expect, it } from 'vitest'
import { esempioIva, erroreIva, haCodiceFiscale, nomePaese, normalizzaIva, PAESI, paeseDalFuso, paeseValido, type CodicePaese } from './paese'

describe('erroreIva', () => {
  it.each([
    ['12345678901', 'IT'], ['IT12345678901', 'IT'], ['it 123 456 789 01', 'IT'],
    ['FR12345678901', 'FR'], ['X1234567X', 'ES'], ['ESX1234567X', 'ES'],
    ['DE123456789', 'DE'], ['U12345678', 'AT'], ['NL123456789B01', 'NL'],
    ['0123456789', 'BE'], ['123456789', 'PT'], ['GB123456789', 'GB'],
    ['EL123456789', 'GR'], ['CHE-123.456.789 MWST', 'CH'], ['NO123456789MVA', 'NO'],
    ['SE123456789012', 'SE'], ['PL1234567890', 'PL'], ['qualsiasi', 'ALTRO'], ['', 'IT'],
  ] as [string, CodicePaese][])('%s è valida per %s', (valore, paese) => {
    expect(erroreIva(valore, paese)).toBeNull()
  })

  it.each([
    ['1234', 'IT'], ['12345678', 'DE'], ['IT12345678901', 'FR'], ['U1234567', 'AT'], ['12345678901', 'GB'],
  ] as [string, CodicePaese][])('%s non è valida per %s', (valore, paese) => {
    expect(erroreIva(valore, paese)).toBe('formato')
  })

  it('ogni paese ha un esempio che il suo controllo accetta', () => {
    for (const paese of PAESI) expect([paese, erroreIva(esempioIva(paese), paese)]).toEqual([paese, null])
  })
})

describe('paese', () => {
  it('normalizzaIva toglie separatori e prefisso (EL per la Grecia)', () => {
    expect(normalizzaIva(' fr 12.345-678 901 ', 'FR')).toBe('12345678901')
    expect(normalizzaIva('EL123456789', 'GR')).toBe('123456789')
    expect(normalizzaIva('x', 'ALTRO')).toBe('X')
  })
  it('paeseValido, paeseDalFuso, nomePaese, haCodiceFiscale', () => {
    expect(paeseValido('FR')).toBe('FR')
    expect(paeseValido('ALTRO')).toBe('ALTRO')
    expect(paeseValido('US')).toBeNull()
    expect(paeseValido(3)).toBeNull()
    expect(paeseDalFuso('Europe/Paris')).toBe('FR')
    expect(paeseDalFuso('Atlantic/Canary')).toBe('ES')
    expect(paeseDalFuso('America/New_York')).toBeNull()
    expect(paeseDalFuso(null)).toBeNull()
    expect(nomePaese('it', 'FR')).toBe('Francia')
    expect(nomePaese('en', 'ALTRO')).toBe('Other')
    expect(haCodiceFiscale('IT')).toBe(true)
    expect(haCodiceFiscale('FR')).toBe(false)
  })
})
