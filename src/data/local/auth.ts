import { PASSWORD_ITERATIONS, hashPassword, verifyPassword } from '../../lib/password'
import type { AccountRole } from '../../lib/salonPath'
import type { TerminiAccount } from '../../lib/versioneLegale'
import { erroreApp } from '../errors'
import { findCorruptGroomlyKey, readJson, storageKeys, writeJson } from './storage'

export interface LocalAccount {
  uid: string
  email: string
  passwordHash: string
  salt: string
  iterations: number
  createdAt: string
  firstName?: string
  lastName?: string
  salonId?: string
  role?: AccountRole
  legacy?: boolean
  termini?: TerminiAccount
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

export async function createAccount(
  email: string,
  password: string,
  profile?: { firstName: string; lastName: string },
): Promise<LocalAccount> {
  if (findCorruptGroomlyKey()) throw erroreApp('storage_corrupt')
  if (getAccount()) throw erroreApp('auth_exists')
  const hashed = await hashPassword(password, PASSWORD_ITERATIONS)
  const uid = crypto.randomUUID()
  const account: LocalAccount = {
    uid,
    email: normalizeEmail(email),
    passwordHash: hashed.passwordHash,
    salt: hashed.salt,
    iterations: hashed.iterations,
    createdAt: new Date().toISOString(),
    ...(profile
      ? {
          firstName: profile.firstName,
          lastName: profile.lastName,
          salonId: uid,
          legacy: false,
        }
      : {}),
  }
  writeJson(storageKeys.auth, account)
  try {
    localStorage.setItem(storageKeys.session, account.uid)
  } catch {
    throw erroreApp('storage_write')
  }
  return account
}

export async function cambiaPasswordLocale(attuale: string, nuova: string): Promise<void> {
  const account = getAccount()
  if (!account) throw erroreApp('auth_invalid')
  const ok = await verifyPassword(attuale, account.salt, account.passwordHash, account.iterations)
  if (!ok) throw erroreApp('auth_invalid')
  const hashed = await hashPassword(nuova, PASSWORD_ITERATIONS)
  writeJson(storageKeys.auth, { ...account, passwordHash: hashed.passwordHash, salt: hashed.salt, iterations: hashed.iterations })
}

export async function cambiaEmailLocale(attuale: string, email: string): Promise<void> {
  const account = getAccount()
  if (!account) throw erroreApp('auth_invalid')
  const ok = await verifyPassword(attuale, account.salt, account.passwordHash, account.iterations)
  if (!ok) throw erroreApp('auth_invalid')
  writeJson(storageKeys.auth, { ...account, email: email.trim().toLowerCase() })
}

export function aggiornaNomeLocale(firstName: string, lastName: string): LocalAccount {
  const account = getAccount()
  if (!account) throw erroreApp('auth_invalid')
  const aggiornato = { ...account, firstName, lastName }
  writeJson(storageKeys.auth, aggiornato)
  return aggiornato
}

export async function login(email: string, password: string): Promise<LocalAccount> {
  if (findCorruptGroomlyKey()) throw erroreApp('storage_corrupt')
  const account = getAccount()
  if (!account || account.email !== normalizeEmail(email)) {
    throw erroreApp('auth_invalid')
  }
  const ok = await verifyPassword(password, account.salt, account.passwordHash, account.iterations)
  if (!ok) throw erroreApp('auth_invalid')
  try {
    localStorage.setItem(storageKeys.session, account.uid)
  } catch {
    throw erroreApp('storage_write')
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
