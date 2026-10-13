import { storageKeys } from './storage'

export type SignInHint = { uid: string; email: string }

export function readSignInHint(): SignInHint | null {
  try {
    const raw = localStorage.getItem(storageKeys.lastSignIn)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<SignInHint> | null
    if (!value || typeof value.uid !== 'string' || !value.uid || typeof value.email !== 'string') return null
    return { uid: value.uid, email: value.email }
  } catch {
    return null
  }
}

export function writeSignInHint(account: { uid: string; email: string }): void {
  try {
    localStorage.setItem(storageKeys.lastSignIn, JSON.stringify({ uid: account.uid, email: account.email }))
  } catch {
    return
  }
}

export function clearSignInHint(): void {
  try {
    localStorage.removeItem(storageKeys.lastSignIn)
  } catch {
    return
  }
}
