import { beforeEach, describe, expect, it } from 'vitest'
import { linguaDalLuogo, linguaVecchiaRegola } from './linguaLuogo'
import { leggiLinguaAttiva, leggiLinguaSalvata, passaggioLingua, scriviLinguaLocale } from './linguaLocale'

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

  it('la vecchia regola conosce solo tre lingue', () => {
    expect(linguaVecchiaRegola('it-IT', 'Europe/London')).toBe('en')
    expect(linguaVecchiaRegola('fr-FR', 'Europe/Paris')).toBe('en')
    expect(linguaVecchiaRegola('de-DE', 'Europe/Rome')).toBe('it')
    expect(linguaVecchiaRegola('es-ES', 'UTC')).toBe('es')
  })
})

describe('lingua attiva', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('la lingua salvata vince sul telefono', () => {
    scriviLinguaLocale('es')
    expect(leggiLinguaAttiva('it-IT')).toBe('es')
  })

  it('senza scelta usa il telefono, poi l’inglese', () => {
    expect(leggiLinguaAttiva('it-IT')).toBe('it')
    expect(leggiLinguaAttiva('fr-CA')).toBe('fr')
    expect(leggiLinguaAttiva('de-AT')).toBe('de')
    expect(leggiLinguaAttiva('pt-BR')).toBe('en')
    expect(leggiLinguaAttiva(null)).toBe('en')
  })
})

describe('passaggio per chi ha già l’app', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('chi non ha mai scelto tiene la lingua che vedeva, anche se il telefono dice altro', () => {
    localStorage.setItem('groomly.lastSignIn', '{}')
    passaggioLingua('fr-FR', 'Europe/Paris')
    expect(leggiLinguaSalvata()).toBe('en')
    expect(leggiLinguaAttiva('fr-FR')).toBe('en')
  })

  it('riconosce l’app già usata anche dai dati dell’account', () => {
    localStorage.setItem('groomly.users.u1.dogs', '[]')
    passaggioLingua('en-GB', 'Europe/Rome')
    expect(leggiLinguaSalvata()).toBe('it')
  })

  it('una scelta già fatta non cambia', () => {
    localStorage.setItem('groomly.session', 'u1')
    scriviLinguaLocale('es')
    passaggioLingua('it-IT', 'Europe/Rome')
    expect(leggiLinguaSalvata()).toBe('es')
  })

  it('un’installazione nuova segue il telefono e resta nuova anche dopo l’accesso', () => {
    passaggioLingua('fr-FR', 'Europe/Rome')
    expect(leggiLinguaSalvata()).toBeNull()
    localStorage.setItem('groomly.session', 'u1')
    passaggioLingua('fr-FR', 'Europe/Rome')
    expect(leggiLinguaSalvata()).toBeNull()
    expect(leggiLinguaAttiva('fr-FR')).toBe('fr')
  })
})
