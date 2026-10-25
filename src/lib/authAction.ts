import type { SessionGate } from '../data/local/auth'
import type { Lingua } from '../i18n/lingua'
import { t } from '../i18n/t'

export function primaryAuthAction(firebase: boolean, hasLocalAccount: boolean): 'create' | 'sign-in' {
  void firebase
  void hasLocalAccount
  return 'sign-in'
}

export function shouldFallbackToSignIn(code: string): boolean {
  return code === 'auth/email-already-in-use' || code === 'auth_exists'
}

export function loginFailureMessage(code: string | undefined, lingua: Lingua = 'it'): string {
  const chiave = code === 'auth_crypto' ? 'authCrypto'
    : code === 'auth_offline' ? 'authOffline'
      : code === 'auth_exists' ? 'authExists'
        : code === 'auth_email_taken' ? 'authTaken'
          : code === 'auth_slow' ? 'authSlow'
            : 'authWrong'
  return t(lingua, chiave)
}

export function openingGate(firebase: boolean, reconciled: SessionGate, remembered = false): SessionGate {
  if (firebase && remembered && reconciled.kind === 'out') return { kind: 'pending' }
  return reconciled
}
