import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const f = vi.hoisted(() => ({
  initializeAuth: vi.fn(() => ({})),
  getAuth: vi.fn(() => ({})),
  initializeFirestore: vi.fn(() => ({})),
  memoryLocalCache: vi.fn(() => 'memoria'),
  persistentLocalCache: vi.fn(() => 'disco'),
}))

vi.mock('firebase/app', () => ({ getApps: () => [{}], initializeApp: vi.fn() }))
vi.mock('firebase/auth', () => ({
  initializeAuth: f.initializeAuth,
  getAuth: f.getAuth,
  browserSessionPersistence: 'sessione',
  connectAuthEmulator: vi.fn(),
  onAuthStateChanged: vi.fn(),
}))
vi.mock('firebase/firestore', () => ({
  initializeFirestore: f.initializeFirestore,
  getFirestore: vi.fn(() => ({})),
  memoryLocalCache: f.memoryLocalCache,
  persistentLocalCache: f.persistentLocalCache,
  persistentMultipleTabManager: vi.fn(),
  connectFirestoreEmulator: vi.fn(),
}))

async function carica() {
  vi.resetModules()
  return import('./client')
}

describe('Firebase sul sito admin', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.unstubAllEnvs())

  it('sul sito la sessione finisce col browser e la cache sta in memoria', async () => {
    vi.stubEnv('VITE_ENTRY', 'admin')
    const client = await carica()
    await client.database()
    await client.sessioneAuth()
    expect(f.initializeAuth).toHaveBeenCalledWith(expect.anything(), { persistence: 'sessione' })
    expect(f.getAuth).not.toHaveBeenCalled()
    expect(f.initializeFirestore).toHaveBeenCalledWith(expect.anything(), { localCache: 'memoria' })
  }, 60_000) // Il primo import di client.ts, a freddo, supera il limite comune quando il PC è carico.

  it('nell’app resta tutto come prima', async () => {
    vi.stubEnv('VITE_ENTRY', '')
    const client = await carica()
    await client.database()
    await client.sessioneAuth()
    expect(f.getAuth).toHaveBeenCalled()
    expect(f.initializeAuth).not.toHaveBeenCalled()
    expect(f.initializeFirestore).toHaveBeenCalledWith(expect.anything(), { localCache: 'disco' })
  })
})
