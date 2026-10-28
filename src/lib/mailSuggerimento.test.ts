import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { decisioneMailSuggerimento, emailAuthSuggerimento, SUGGERIMENTI_AL_GIORNO } from './mailSuggerimento'

describe('mail suggerimento', () => {
  it('spedisce cinque lettere nel giorno e tace dalla sesta', () => {
    let conteggio = 0
    for (let i = 1; i <= SUGGERIMENTI_AL_GIORNO; i += 1) {
      const decisione = decisioneMailSuggerimento({ giorno: '2026-10-28', giornoSalvato: '2026-10-28', conteggio })
      expect(decisione.invia).toBe(true)
      conteggio = decisione.prossimo
    }
    expect(decisioneMailSuggerimento({ giorno: '2026-10-28', giornoSalvato: '2026-10-28', conteggio }).invia).toBe(false)
    expect(decisioneMailSuggerimento({ giorno: '2026-10-29', giornoSalvato: '2026-10-28', conteggio: 9 })).toEqual({
      invia: true,
      prossimo: 1,
      giorno: '2026-10-29',
    })
  })

  it('tiene l’email di Auth e scarta un valore vuoto o con un a capo', () => {
    expect(emailAuthSuggerimento('  Ada@Example.com ')).toBe('Ada@Example.com')
    expect(emailAuthSuggerimento('')).toBe('')
    expect(emailAuthSuggerimento(null)).toBe('')
    expect(emailAuthSuggerimento(`ada@example.com\nBcc: x`)).toBe('')
  })

  it('la function legge Auth e le regole esigono l’email del token', () => {
    const funzione = readFileSync('functions/src/index.ts', 'utf8')
    const da = funzione.indexOf('export const mailSuggerimento')
    const corpo = funzione.slice(da)
    expect(corpo).toContain('getAuth().getUser(uid)')
    expect(corpo).toContain('decisioneMailSuggerimento')
    expect(corpo).not.toContain('data.email')
    const rules = readFileSync('firestore.rules', 'utf8')
    const inizio = rules.indexOf('match /suggerimenti/{id}')
    const fine = rules.indexOf('match /', inizio + 10)
    const blocco = rules.slice(inizio, fine === -1 ? undefined : fine)
    expect(blocco).toContain('request.resource.data.email == request.auth.token.email')
  })
})
