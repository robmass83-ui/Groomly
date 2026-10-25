import { describe, expect, it } from 'vitest'
import { linguaDelTelefono, linguaValida } from './lingua'

describe('lingua del telefono', () => {
  it('tiene italiano, inglese e spagnolo e manda il resto in inglese', () => {
    expect(linguaDelTelefono('it')).toBe('it')
    expect(linguaDelTelefono('it-IT')).toBe('it')
    expect(linguaDelTelefono('en-GB')).toBe('en')
    expect(linguaDelTelefono('en-US')).toBe('en')
    expect(linguaDelTelefono('es-ES')).toBe('es')
    expect(linguaDelTelefono('es-MX')).toBe('es')
    expect(linguaDelTelefono('fr')).toBe('en')
    expect(linguaDelTelefono('')).toBe('en')
    expect(linguaDelTelefono(null)).toBe('en')
    expect(linguaDelTelefono(undefined)).toBe('en')
  })

  it('accetta solo i tre codici', () => {
    expect(linguaValida('it')).toBe('it')
    expect(linguaValida('en')).toBe('en')
    expect(linguaValida('es')).toBe('es')
    expect(linguaValida('de')).toBeNull()
    expect(linguaValida('EN')).toBeNull()
    expect(linguaValida(1)).toBeNull()
  })
})
