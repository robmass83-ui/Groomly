import { describe, expect, it } from 'vitest'
import { linguaDelTelefono, linguaValida } from './lingua'

describe('lingua del telefono', () => {
  it('tiene le cinque lingue e manda il resto in inglese', () => {
    expect(linguaDelTelefono('it')).toBe('it')
    expect(linguaDelTelefono('it-IT')).toBe('it')
    expect(linguaDelTelefono('en-GB')).toBe('en')
    expect(linguaDelTelefono('en-US')).toBe('en')
    expect(linguaDelTelefono('es-ES')).toBe('es')
    expect(linguaDelTelefono('es-MX')).toBe('es')
    expect(linguaDelTelefono('fr')).toBe('fr')
    expect(linguaDelTelefono('fr-CH')).toBe('fr')
    expect(linguaDelTelefono('de-DE')).toBe('de')
    expect(linguaDelTelefono('pt-PT')).toBe('en')
    expect(linguaDelTelefono('')).toBe('en')
    expect(linguaDelTelefono(null)).toBe('en')
    expect(linguaDelTelefono(undefined)).toBe('en')
  })

  it('accetta solo i cinque codici', () => {
    expect(linguaValida('it')).toBe('it')
    expect(linguaValida('en')).toBe('en')
    expect(linguaValida('es')).toBe('es')
    expect(linguaValida('fr')).toBe('fr')
    expect(linguaValida('de')).toBe('de')
    expect(linguaValida('pt')).toBeNull()
    expect(linguaValida('EN')).toBeNull()
    expect(linguaValida(1)).toBeNull()
  })
})
