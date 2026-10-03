import { describe, expect, it, vi } from 'vitest'
import { AppError } from '../data/errors'
import { hashPassword, verifyPassword } from './password'

describe('password', () => {
  it('verifica la password giusta e rifiuta quella sbagliata', async () => {
    const stored = await hashPassword('segretissimo', 10)
    expect(stored.iterations).toBe(10)
    expect(stored.salt).not.toContain('segretissimo')
    expect(stored.passwordHash).not.toContain('segretissimo')
    await expect(verifyPassword('segretissimo', stored.salt, stored.passwordHash, 10)).resolves.toBe(true)
    await expect(verifyPassword('sbagliata', stored.salt, stored.passwordHash, 10)).resolves.toBe(false)
  })

  it('rifiuta se Web Crypto non c’è', async () => {
    vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => bytes, subtle: undefined })
    await expect(hashPassword('segretissimo', 10)).rejects.toMatchObject({ code: 'auth_crypto' })
    vi.unstubAllGlobals()
  })
})

describe('AppError', () => {
  it('espone il codice', () => {
    const error = new AppError('x', 'auth_crypto')
    expect(error).toBeInstanceOf(AppError)
    expect(error.code).toBe('auth_crypto')
  })
})
