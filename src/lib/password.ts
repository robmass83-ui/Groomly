import { AppError } from '../data/errors'

export const PASSWORD_ITERATIONS = 100_000

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false
  let diff = 0
  for (let index = 0; index < left.length; index += 1) diff |= left[index] ^ right[index]
  return diff === 0
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  if (!globalThis.crypto?.subtle) throw new AppError('Web Crypto assente', 'auth_crypto')
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    material,
    256,
  )
  return new Uint8Array(bits)
}

export async function hashPassword(password: string, iterations = PASSWORD_ITERATIONS) {
  if (!globalThis.crypto?.subtle || !globalThis.crypto.getRandomValues) {
    throw new AppError('Web Crypto assente', 'auth_crypto')
  }
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await derive(password, salt, iterations)
  return { passwordHash: bytesToBase64(key), salt: bytesToBase64(salt), iterations }
}

export async function verifyPassword(password: string, salt: string, passwordHash: string, iterations: number) {
  const key = await derive(password, base64ToBytes(salt), iterations)
  return sameBytes(key, base64ToBytes(passwordHash))
}
