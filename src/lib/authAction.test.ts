import { describe, expect, it } from 'vitest'
import type { SessionGate } from '../data/local/auth'
import { loginFailureMessage, openingGate, primaryAuthAction, shouldFallbackToSignIn } from './authAction'

const out: SessionGate = { kind: 'out' }
const corrupt: SessionGate = { kind: 'corrupt' }

describe('scelta accesso', () => {
  it('senza account locale crea l’accesso anche con Firebase', () => {
    expect(primaryAuthAction(true, false)).toBe('create')
  })

  it('senza Firebase e senza account locale crea l’accesso', () => {
    expect(primaryAuthAction(false, false)).toBe('create')
  })

  it('con account locale entra anche senza Firebase', () => {
    expect(primaryAuthAction(false, true)).toBe('sign-in')
    expect(primaryAuthAction(true, true)).toBe('sign-in')
  })

  it('email già in uso riprova l’accesso e non è una password sbagliata', () => {
    expect(shouldFallbackToSignIn('auth/email-already-in-use')).toBe(true)
    expect(shouldFallbackToSignIn('auth_exists')).toBe(true)
    expect(shouldFallbackToSignIn('auth_invalid')).toBe(false)
    expect(loginFailureMessage('auth_exists')).not.toBe('Email o password non corretti')
    expect(loginFailureMessage('auth_invalid')).toBe('Email o password non corretti')
    expect(loginFailureMessage('auth_offline')).toBe('Connessione assente')
  })

  it('con Firebase la sessione già nota si apre subito', () => {
    const account = { uid: 'uid-1', email: 'maria@salone.it', salt: 's', passwordHash: 'h', iterations: 1, createdAt: '2026-01-01T00:00:00.000Z' }
    const inside: SessionGate = { kind: 'in', account }
    expect(openingGate(true, inside)).toEqual(inside)
    expect(openingGate(true, out)).toEqual(out)
    expect(openingGate(true, corrupt)).toEqual(corrupt)
    expect(openingGate(false, out)).toEqual(out)
  })
})
