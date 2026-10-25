import { describe, expect, it } from 'vitest'
import { confirmEmailCopy, entryGate, passwordResetMessage, resendWaitCopy } from './authGate'
import { loginFailureMessage } from './authAction'

describe('entryGate', () => {
  it('senza Firebase entra in home', () => {
    expect(entryGate({ firebase: false, email: 'ada@salone.it', emailVerified: false, legacy: false, hasAccountDoc: false })).toEqual({ kind: 'home' })
  })

  it('un nuovo senza documento ripara, Laura senza documento lavora', () => {
    expect(entryGate({ firebase: true, email: 'ada@salone.it', emailVerified: true, legacy: false, hasAccountDoc: false })).toEqual({ kind: 'repair-salon' })
    expect(entryGate({ firebase: true, email: 'laura.masala@tiscali.it', emailVerified: false, legacy: true, hasAccountDoc: false })).toEqual({ kind: 'home' })
  })

  it('Roberto senza documento entra, un titolare nuovo va in riparazione', () => {
    expect(entryGate({ firebase: true, email: 'masala.roberto@hotmail.it', emailVerified: false, legacy: false, hasAccountDoc: false })).toEqual({ kind: 'home' })
    expect(entryGate({ firebase: true, email: 'robmass83@gmail.com', emailVerified: true, legacy: false, hasAccountDoc: false })).toEqual({ kind: 'repair-salon' })
  })

  it('un nuovo non verificato conferma; Laura non verificata entra', () => {
    expect(entryGate({ firebase: true, email: 'ada@salone.it', emailVerified: false, legacy: false, hasAccountDoc: true })).toEqual({ kind: 'confirm-email' })
    expect(entryGate({ firebase: true, email: 'laura.masala@tiscali.it', emailVerified: false, legacy: true, hasAccountDoc: true })).toEqual({ kind: 'home' })
    expect(entryGate({ firebase: true, email: 'ada@salone.it', emailVerified: true, legacy: false, hasAccountDoc: true })).toEqual({ kind: 'home' })
  })

  it('i testi sono quelli fissati', () => {
    expect(loginFailureMessage('auth_email_taken')).toBe('Questa email ha già un account')
    expect(passwordResetMessage()).toBe('Se l’indirizzo è registrato, ti abbiamo inviato un’email per reimpostare la password. Controlla anche lo spam.')
    expect(confirmEmailCopy()).toBe('Controlla la tua email per confermare l’account')
    expect(resendWaitCopy(60)).toBe('Puoi inviarne un’altra tra 60 secondi.')
    expect(loginFailureMessage('auth_offline', 'en')).toBe('No connection')
    expect(passwordResetMessage('en')).toContain('reset the password')
    expect(resendWaitCopy(60, 'es')).toContain('60')
  })
})
