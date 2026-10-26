import { beforeEach, describe, expect, it } from 'vitest'
import { leggiLinguaMessaggio, scriviLinguaMessaggio } from './linguaMessaggio'

describe('lingua del messaggio', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('ricorda la lingua sulla chiave fatta di sole cifre', () => {
    scriviLinguaMessaggio('333 1234567', 'en')
    expect(localStorage.getItem('groomly.linguaMessaggio.393331234567')).toBe('en')
    expect(localStorage.getItem('groomly.linguaMessaggio.333 1234567')).toBeNull()
    expect(leggiLinguaMessaggio('(333) 123-4567', 'it')).toBe('en')
    expect(leggiLinguaMessaggio('+39 333 1234567', 'it')).toBe('en')
  })

  it('senza cifre non scrive e usa la lingua predefinita', () => {
    scriviLinguaMessaggio('senza numero', 'en')
    scriviLinguaMessaggio('', 'es')
    expect(localStorage.length).toBe(0)
    expect(leggiLinguaMessaggio('abc', 'it')).toBe('it')
    expect(leggiLinguaMessaggio('', 'es')).toBe('es')
    expect(leggiLinguaMessaggio('+++', 'en')).toBe('en')
  })

  it('un valore salvato non valido torna alla lingua predefinita', () => {
    localStorage.setItem('groomly.linguaMessaggio.393331234567', 'fr')
    expect(leggiLinguaMessaggio('333 1234567', 'es')).toBe('es')
  })
})
