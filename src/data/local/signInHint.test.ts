import { beforeEach, describe, expect, it } from 'vitest'
import { clearSignInHint, readSignInHint, writeSignInHint } from './signInHint'
import { storageKeys } from './storage'

describe('ricordo dell’accesso', () => {
  beforeEach(() => localStorage.clear())

  it('scrive, legge e cancella uid ed email', () => {
    expect(storageKeys.lastSignIn).toBe('groomly.lastSignIn')
    expect(readSignInHint()).toBeNull()
    writeSignInHint({ uid: 'fb-1', email: 'laura.masala@tiscali.it' })
    expect(JSON.parse(localStorage.getItem('groomly.lastSignIn')!)).toEqual({ uid: 'fb-1', email: 'laura.masala@tiscali.it' })
    expect(readSignInHint()).toEqual({ uid: 'fb-1', email: 'laura.masala@tiscali.it' })
    clearSignInHint()
    expect(localStorage.getItem('groomly.lastSignIn')).toBeNull()
  })

  it('un valore rovinato vale come nessun ricordo', () => {
    localStorage.setItem('groomly.lastSignIn', '{rotto')
    expect(readSignInHint()).toBeNull()
    localStorage.setItem('groomly.lastSignIn', JSON.stringify({ uid: '', email: 'a@b.it' }))
    expect(readSignInHint()).toBeNull()
    localStorage.setItem('groomly.lastSignIn', JSON.stringify({ uid: 'fb-1' }))
    expect(readSignInHint()).toBeNull()
  })
})
