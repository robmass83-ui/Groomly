import type { SessionGate } from '../data/local/auth'

export function primaryAuthAction(firebase: boolean, hasLocalAccount: boolean): 'create' | 'sign-in' {
  if (hasLocalAccount) return 'sign-in'
  if (firebase) return 'create'
  return 'create'
}

export function shouldFallbackToSignIn(code: string): boolean {
  return code === 'auth/email-already-in-use' || code === 'auth_exists'
}

export function loginFailureMessage(code: string | undefined): string {
  if (code === 'auth_crypto') return 'Questo dispositivo non può proteggere la password'
  if (code === 'auth_offline') return 'Connessione assente'
  if (code === 'auth_exists') return 'Account già presente'
  return 'Email o password non corretti'
}

export function openingGate(firebase: boolean, reconciled: SessionGate): SessionGate {
  void firebase
  return reconciled
}
