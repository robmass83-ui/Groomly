import { describe, expect, it } from 'vitest'
import { confirmEmailCopy, entryGate, passwordResetMessage } from './authGate'
import { loginFailureMessage } from './authAction'

describe('entryGate', () => {
  it('senza Firebase entra in home', () => {
    expect(entryGate({ firebase: false, email: 'ada@salone.it', emailVerified: false, legacy: false, hasAccountDoc: false })).toEqual({ kind: 'home' })
  })

  it('un nuovo senza documento ripara, Laura senza documento lavora', () => {
    expect(entryGate({ firebase: true, email: 'ada@salone.it', emailVerified: true, legacy: false, hasAccountDoc: false })).toEqual({ kind: 'repair-salon' })
    expect(entryGate({ firebase: true, email: 'laura.masala@tiscali.it', emailVerified: false, legacy: true, hasAccountDoc: false })).toEqual({ kind: 'home' })
  })

  it('un nuovo non verificato conferma; Laura non verificata entra', () => {
    expect(entryGate({ firebase: true, email: 'ada@salone.it', emailVerified: false, legacy: false, hasAccountDoc: true })).toEqual({ kind: 'confirm-email' })
    expect(entryGate({ firebase: true, email: 'laura.masala@tiscali.it', emailVerified: false, legacy: true, hasAccountDoc: true })).toEqual({ kind: 'home' })
    expect(entryGate({ firebase: true, email: 'ada@salone.it', emailVerified: true, legacy: false, hasAccountDoc: true })).toEqual({ kind: 'home' })
  })

  it('i testi sono quelli fissati', () => {
    expect(loginFailureMessage('auth_email_taken')).toBe('Questa email ha già un account')
    expect(passwordResetMessage()).toBe('Se questo indirizzo è un account Groomly, ti arriva un’email per scegliere una nuova password. Poi torna su Entra.')
    expect(confirmEmailCopy('ada@salone.it')).toBe('Ti abbiamo scritto a ada@salone.it. Apri il messaggio e tocca il link, poi torna qui.')
  })
})
