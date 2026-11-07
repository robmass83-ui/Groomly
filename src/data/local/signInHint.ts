import { storageKeys } from './storage'

export type SignInHint = { uid: string; email: string; firstName?: string; admin?: boolean }

export function readSignInHint(): SignInHint | null {
  try {
    const raw = localStorage.getItem(storageKeys.lastSignIn)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<SignInHint> | null
    if (!value || typeof value.uid !== 'string' || !value.uid || typeof value.email !== 'string') return null
    return {
      uid: value.uid,
      email: value.email,
      ...(typeof value.firstName === 'string' && value.firstName.trim() ? { firstName: value.firstName.trim() } : {}),
      ...(value.admin === true ? { admin: true } : {}),
    }
  } catch {
    return null
  }
}

export function writeSignInHint(account: { uid: string; email: string; firstName?: string; admin?: boolean }): void {
  try {
    // Il nome serve al saluto della schermata di accesso, prima che l'account si legga.
    const firstName = account.firstName?.trim()
    localStorage.setItem(storageKeys.lastSignIn, JSON.stringify({
      uid: account.uid,
      email: account.email,
      ...(firstName ? { firstName } : {}),
      ...(account.admin === true ? { admin: true } : {}),
    }))
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
