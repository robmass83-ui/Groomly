import { beforeEach, describe, expect, it } from 'vitest'
import { linguaDelTelefono } from './lingua'
import { linguaDalLuogo } from './linguaLuogo'
import { leggiLinguaAttiva, scriviLinguaLocale } from './linguaLocale'

describe('lingua dal luogo', () => {
  it('mappa Italia, Inghilterra e Spagna e ignora gli altri fusi', () => {
    expect(linguaDalLuogo('Europe/Rome')).toBe('it')
    expect(linguaDalLuogo('Europe/London')).toBe('en')
    expect(linguaDalLuogo('Europe/Madrid')).toBe('es')
    expect(linguaDalLuogo('Atlantic/Canary')).toBe('es')
    expect(linguaDalLuogo('Africa/Ceuta')).toBe('es')
    expect(linguaDalLuogo('Africa/Cairo')).toBeNull()
    expect(linguaDalLuogo('UTC')).toBeNull()
    expect(linguaDalLuogo('')).toBeNull()
    expect(linguaDalLuogo('  ')).toBeNull()
    expect(linguaDalLuogo(null)).toBeNull()
    expect(linguaDalLuogo(undefined)).toBeNull()
  })
})

describe('lingua attiva', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('la lingua salvata vince sul luogo e sul telefono', () => {
    scriviLinguaLocale('es')
    expect(leggiLinguaAttiva('it-IT', 'Europe/London')).toBe('es')
  })

  it('senza scelta usa il luogo', () => {
    expect(leggiLinguaAttiva('it-IT', 'Europe/London')).toBe('en')
    expect(leggiLinguaAttiva('en-GB', 'Europe/Rome')).toBe('it')
    expect(leggiLinguaAttiva('it-IT', 'Europe/Madrid')).toBe('es')
    expect(leggiLinguaAttiva('it-IT', 'Atlantic/Canary')).toBe('es')
    expect(leggiLinguaAttiva('en-US', 'Africa/Ceuta')).toBe('es')
  })

  it('un fuso sconosciuto usa la lingua del telefono', () => {
    expect(leggiLinguaAttiva('it-IT', 'Africa/Cairo')).toBe('it')
    expect(leggiLinguaAttiva('it-IT', 'UTC')).toBe('it')
    expect(leggiLinguaAttiva('it-IT', '')).toBe('it')
    expect(leggiLinguaAttiva('es-ES', 'Africa/Cairo')).toBe('es')
    expect(leggiLinguaAttiva('fr', 'UTC')).toBe('en')
  })

  it('il fuso predefinito è quello di Intl', () => {
    const fuso = Intl.DateTimeFormat().resolvedOptions().timeZone
    expect(leggiLinguaAttiva('fr-FR')).toBe(linguaDalLuogo(fuso) ?? linguaDelTelefono('fr-FR'))
  })
})
