import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../errors'
import {
  createAccount,
  getAccount,
  getSession,
  login,
  logout,
  reconcileSession,
} from './auth'
import { readJson, storageKeys, writeJson } from './storage'

describe('storage', () => {
  beforeEach(() => localStorage.clear())

  it('non cancella una chiave illeggibile', () => {
    localStorage.setItem(storageKeys.auth, '{')
    expect(() => readJson(storageKeys.auth)).toThrow(AppError)
    expect(localStorage.getItem(storageKeys.auth)).toBe('{')
  })

  it('propaga il fallimento di scrittura senza cambiare la chiave', () => {
    writeJson(storageKeys.auth, { ok: true })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => writeJson(storageKeys.auth, { ok: false })).toThrow(AppError)
    vi.restoreAllMocks()
    expect(readJson<{ ok: boolean }>(storageKeys.auth)?.ok).toBe(true)
  })
})

describe('auth', () => {
  beforeEach(() => localStorage.clear())

  it('crea l’account, scrive la sessione e rifiuta il secondo create', async () => {
    const account = await createAccount('  Maria@Salone.IT ', 'segretissimo')
    expect(account.email).toBe('maria@salone.it')
    expect(account.passwordHash).not.toContain('segretissimo')
    expect(getSession()).toBe(account.uid)
    expect(getAccount()?.uid).toBe(account.uid)
    await expect(createAccount('altra@salone.it', 'segretissimo')).rejects.toMatchObject({ code: 'auth_exists' })
  })

  it('il login giusto entra e quello sbagliato non scrive la sessione', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    logout()
    expect(getSession()).toBeNull()
    expect(getAccount()?.email).toBe('maria@salone.it')
    await expect(login('maria@salone.it', 'no-no-no')).rejects.toMatchObject({ code: 'auth_invalid' })
    expect(getSession()).toBeNull()
    const again = await login(' MARIA@salone.it ', 'segretissimo')
    expect(again.uid).toBe(account.uid)
    expect(getSession()).toBe(account.uid)
  })

  it('azzerra la sessione se l’uid non coincide e lascia i servizi', () => {
    localStorage.setItem(storageKeys.auth, JSON.stringify({
      uid: 'account-1',
      email: 'maria@salone.it',
      passwordHash: 'aa',
      salt: 'bb',
      iterations: 10,
      createdAt: '2026-10-01T00:00:00.000Z',
    }))
    localStorage.setItem(storageKeys.session, 'altro-uid')
    localStorage.setItem(storageKeys.services('altro-uid'), JSON.stringify({ custom: { id: 'custom' } }))
    expect(reconcileSession()).toEqual({ kind: 'out' })
    expect(getSession()).toBeNull()
    expect(localStorage.getItem(storageKeys.services('altro-uid'))).toContain('custom')
  })

  it('segnala i dati illeggibili senza cancellarli', () => {
    localStorage.setItem(storageKeys.auth, '{')
    expect(reconcileSession()).toEqual({ kind: 'corrupt' })
    expect(localStorage.getItem(storageKeys.auth)).toBe('{')
  })
})
