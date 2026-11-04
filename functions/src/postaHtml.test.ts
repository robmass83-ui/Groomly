import { describe, expect, it } from 'vitest'
import { conLingua, linguaCliente, replyToDa } from './postaHtml'

describe('catena della lingua dei clienti', () => {
  it('la persona, poi il salone, poi l’italiano', () => {
    expect(linguaCliente('de', 'en')).toBe('de')
    expect(linguaCliente(undefined, 'en')).toBe('en')
    expect(linguaCliente('pt', undefined)).toBe('it')
  })

  it('il link porta la lingua e tiene i suoi parametri', () => {
    expect(conLingua('https://groomlyapp.it/s/x?attesa=abc', 'de')).toBe('https://groomlyapp.it/s/x?attesa=abc&lang=de')
    expect(conLingua('https://groomlyapp.it/s/x?lang=it', 'fr')).toBe('https://groomlyapp.it/s/x?lang=fr')
  })
})

describe('replyToDa', () => {
  it('con email e nome validi restituisce entrambi, email senza spazi', () => {
    expect(replyToDa('  sala@salone.it  ', '  Bauci  ')).toEqual({ email: 'sala@salone.it', name: 'Bauci' })
  })

  it('con email valida e nome vuoto usa Groomly', () => {
    expect(replyToDa('sala@salone.it', '')).toEqual({ email: 'sala@salone.it', name: 'Groomly' })
    expect(replyToDa('sala@salone.it', '   ')).toEqual({ email: 'sala@salone.it', name: 'Groomly' })
  })

  it('email non valida, stringa vuota o non stringa non danno un reply-to', () => {
    expect(replyToDa('non-una-mail', 'Bauci')).toBeUndefined()
    expect(replyToDa('', 'Bauci')).toBeUndefined()
    expect(replyToDa('   ', 'Bauci')).toBeUndefined()
    expect(replyToDa(null, 'Bauci')).toBeUndefined()
    expect(replyToDa(undefined, 'Bauci')).toBeUndefined()
    expect(replyToDa(12, 'Bauci')).toBeUndefined()
  })
})
