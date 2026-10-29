import { describe, expect, it } from 'vitest'
import { indirizzoDi } from './mittente'

describe('mittente del modulo pubblico', () => {
  it('prende l’indirizzo che il front end di Google aggiunge in fondo, non quello scritto dal client', () => {
    expect(indirizzoDi({ headers: { 'x-forwarded-for': '1.2.3.4, 203.0.113.7' } })).toBe('203.0.113.7')
    expect(indirizzoDi({ headers: { 'x-forwarded-for': '203.0.113.7' } })).toBe('203.0.113.7')
  })

  it('senza intestazione usa l’ip della richiesta, e senza nulla è vuoto', () => {
    expect(indirizzoDi({ headers: {}, ip: '198.51.100.2' })).toBe('198.51.100.2')
    expect(indirizzoDi(undefined)).toBe('')
  })
})
