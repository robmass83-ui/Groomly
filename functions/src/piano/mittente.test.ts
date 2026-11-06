import { describe, expect, it } from 'vitest'
import { indirizzoDi, reteDi } from './mittente'

describe('la rete della connessione', () => {
  it('due indirizzi della stessa /64 sono la stessa connessione', () => {
    expect(reteDi('2a01:4f8:c0c:1234::1')).toBe(reteDi('2a01:4f8:c0c:1234:ffff:1:2:3'))
    expect(reteDi('2a01:04f8:0c0c:1234:0:0:0:1')).toBe('2a01:4f8:c0c:1234')
  })

  it('una /64 diversa resta diversa, e un IPv4 resta intero', () => {
    expect(reteDi('2a01:4f8:c0c:1234::1')).not.toBe(reteDi('2a01:4f8:c0c:1235::1'))
    expect(reteDi('203.0.113.7')).toBe('203.0.113.7')
    expect(reteDi('::ffff:203.0.113.7')).toBe('203.0.113.7')
  })
})

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
