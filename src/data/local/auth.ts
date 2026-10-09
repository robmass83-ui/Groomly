import { PASSWORD_ITERATIONS, hashPassword, verifyPassword } from '../../lib/password'
import { AppError } from '../errors'
import { findCorruptGroomlyKey, readJson, storageKeys, writeJson } from './storage'

export interface LocalAccount {
  uid: string
  email: string
  passwordHash: string
  salt: string
  iterations: number
  createdAt: string
}

export type SessionGate =
  | { kind: 'in'; account: LocalAccount }
  | { kind: 'out' }
  | { kind: 'corrupt' }
  | { kind: 'pending' }

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function getAccount(): LocalAccount | null {
  return readJson<LocalAccount>(storageKeys.auth)
}

export function getSession(): string | null {
  const uid = localStorage.getItem(storageKeys.session)
  return uid ? uid : null
}

export function logout(): void {
  localStorage.removeItem(storageKeys.session)
}

export async function createAccount(email: string, password: string): Promise<LocalAccount> {
  if (findCorruptGroomlyKey()) throw new AppError('Dati locali illeggibili', 'storage_corrupt')
  if (getAccount()) throw new AppError('Account già presente', 'auth_exists')
  const hashed = await hashPassword(password, PASSWORD_ITERATIONS)
  const account: LocalAccount = {
    uid: crypto.randomUUID(),
    email: normalizeEmail(email),
    passwordHash: hashed.passwordHash,
    salt: hashed.salt,
    iterations: hashed.iterations,
    createdAt: new Date().toISOString(),
  }
  writeJson(storageKeys.auth, account)
  try {
    localStorage.setItem(storageKeys.session, account.uid)
  } catch {
    throw new AppError('Salvataggio non riuscito', 'storage_write')
  }
  return account
}

export async function login(email: string, password: string): Promise<LocalAccount> {
  if (findCorruptGroomlyKey()) throw new AppError('Dati locali illeggibili', 'storage_corrupt')
  const account = getAccount()
  if (!account || account.email !== normalizeEmail(email)) {
    throw new AppError('Email o password non corretti', 'auth_invalid')
  }
  const ok = await verifyPassword(password, account.salt, account.passwordHash, account.iterations)
  if (!ok) throw new AppError('Email o password non corretti', 'auth_invalid')
  try {
    localStorage.setItem(storageKeys.session, account.uid)
  } catch {
    throw new AppError('Salvataggio non riuscito', 'storage_write')
  }
  return account
}

export function reconcileSession(): SessionGate {
  if (findCorruptGroomlyKey()) return { kind: 'corrupt' }
  const account = getAccount()
  const session = getSession()
  if (!account) {
    if (session) logout()
    return { kind: 'out' }
  }
  if (session && session !== account.uid) {
    logout()
    return { kind: 'out' }
  }
  if (!session) return { kind: 'out' }
  return { kind: 'in', account }
}
