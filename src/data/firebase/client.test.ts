// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAppointment } from '../local/appointments'
import { createDog } from '../local/dogs'
import { storageKeys } from '../local/storage'
import type { DogWrite } from '../../types/models'

const authFns = vi.hoisted(() => ({
  createUser: vi.fn(),
  signIn: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
}))

const fs = vi.hoisted(() => {
  const store = new Map<string, Map<string, Record<string, unknown>>>()
  const writes: { path: string; data: Record<string, unknown> }[] = []
  const deletes: string[] = []
  const snapshots: string[] = []
  const setDoc = vi.fn(async (ref: { path: string }, data: Record<string, unknown>) => {
    writes.push({ path: ref.path, data })
    const parts = ref.path.split('/')
    const id = parts.pop() ?? ''
    const col = parts.join('/')
    if (!store.has(col)) store.set(col, new Map())
    store.get(col)?.set(id, data)
  })
  return { store, writes, deletes, snapshots, setDoc }
})

vi.mock('firebase/app', () => ({
  getApps: () => [{ name: 'app' }],
  initializeApp: () => ({ name: 'app' }),
}))

vi.mock('firebase/auth', () => ({
  getAuth: () => ({ currentUser: null }),
  createUserWithEmailAndPassword: (...args: unknown[]) => authFns.createUser(...args),
  signInWithEmailAndPassword: (...args: unknown[]) => authFns.signIn(...args),
  onAuthStateChanged: (...args: unknown[]) => authFns.onAuthStateChanged(...args),
  signOut: (...args: unknown[]) => authFns.signOut(...args),
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  initializeFirestore: () => ({}),
  persistentLocalCache: () => ({}),
  persistentMultipleTabManager: () => ({}),
  doc: (_db: unknown, ...parts: string[]) => ({ path: parts.join('/') }),
  collection: (_db: unknown, ...parts: string[]) => ({ path: parts.join('/') }),
  collectionGroup: (_db: unknown, name: string) => ({ path: `group:${name}`, group: name }),
  setDoc: (ref: { path: string }, data: Record<string, unknown>) => fs.setDoc(ref, data),
  updateDoc: async () => undefined,
  getDoc: async (ref: { path: string }) => {
    const parts = ref.path.split('/')
    const id = parts.pop() ?? ''
    const data = fs.store.get(parts.join('/'))?.get(id)
    return { exists: () => data != null, data: () => data }
  },
  getDocs: async (col: { path: string; group?: string }) => {
    if (col.group) {
      const docs = []
      for (const [path, map] of fs.store) {
        if (path.split('/').pop() !== col.group) continue
        for (const [id, data] of map) {
          docs.push({ id, data: () => data, ref: { path: `${path}/${id}` } })
        }
      }
      return { docs, empty: docs.length === 0 }
    }
    const map = fs.store.get(col.path) ?? new Map<string, Record<string, unknown>>()
    const docs = [...map.entries()].map(([id, data]) => ({
      id,
      data: () => data,
      ref: { path: `${col.path}/${id}` },
    }))
    return { docs, empty: docs.length === 0 }
  },
  deleteDoc: async (ref: { path: string }) => {
    fs.deletes.push(ref.path)
    const parts = ref.path.split('/')
    const id = parts.pop() ?? ''
    fs.store.get(parts.join('/'))?.delete(id)
  },
  onSnapshot: (col: { path: string }) => {
    fs.snapshots.push(col.path)
    return () => undefined
  },
}))

vi.mock('firebase/storage', () => ({
  getStorage: () => ({}),
  ref: () => ({}),
  uploadString: async () => undefined,
  getDownloadURL: async () => 'https://example.test/file',
}))

function dogWrite(name: string): DogWrite {
  return {
    name,
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: 'Sara', phone: '333' },
  }
}

function firebaseUser(uid = 'fb-1', email = 'maria@salone.it') {
  return { uid, email, metadata: { creationTime: '2026-01-01T00:00:00.000Z' } }
}

function seedCloud(path: string, id: string) {
  if (!fs.store.has(path)) fs.store.set(path, new Map())
  fs.store.get(path)?.set(id, { id })
}

describe('client Firebase', () => {
  let client: typeof import('./client')

  beforeEach(async () => {
    localStorage.clear()
    sessionStorage.clear()
    fs.store.clear()
    fs.writes.length = 0
    fs.deletes.length = 0
    fs.snapshots.length = 0
    authFns.createUser.mockReset()
    authFns.signIn.mockReset()
    authFns.onAuthStateChanged.mockReset()
    authFns.signOut.mockReset()
    fs.setDoc.mockReset()
    fs.setDoc.mockImplementation(async (ref: { path: string }, data: Record<string, unknown>) => {
      fs.writes.push({ path: ref.path, data })
      const parts = ref.path.split('/')
      const id = parts.pop() ?? ''
      const col = parts.join('/')
      if (!fs.store.has(col)) fs.store.set(col, new Map())
      fs.store.get(col)?.set(id, data)
    })
    vi.resetModules()
    client = await import('./client')
  })

  it('registerEmail: già in uso poi accesso riuscito', async () => {
    authFns.createUser.mockRejectedValue({ code: 'auth/email-already-in-use' })
    authFns.signIn.mockResolvedValue({ user: firebaseUser() })
    const account = await client.registerEmail('Maria@Salone.it', 'segretissimo')
    expect(account).toMatchObject({ uid: 'fb-1', email: 'maria@salone.it' })
    expect(authFns.signIn).toHaveBeenCalledTimes(1)
  })

  it('registerEmail: già in uso poi password errata diventa «Email o password non corretti»', async () => {
    authFns.createUser.mockRejectedValue({ code: 'auth/email-already-in-use' })
    authFns.signIn.mockRejectedValue({ code: 'auth/invalid-credential' })
    await expect(client.registerEmail('maria@salone.it', 'sbagliata')).rejects.toMatchObject({
      message: 'Email o password non corretti',
      code: 'auth_invalid',
    })
  })

  it('registerEmail: offline senza sessione diventa «Connessione assente»', async () => {
    authFns.createUser.mockRejectedValue({ code: 'auth/network-request-failed' })
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    await expect(client.registerEmail('maria@salone.it', 'segretissimo')).rejects.toMatchObject({
      message: 'Connessione assente',
      code: 'auth_offline',
    })
    expect(authFns.signIn).not.toHaveBeenCalled()
    online.mockRestore()
  })

  it('replaceCloudData non scrive groomly.users e cancella i documenti assenti dal backup', async () => {
    const dog = createDog('uid-cloud', dogWrite('Birba'))
    const appointment = createAppointment('uid-cloud', {
      dogId: dog.id,
      start: new Date('2026-10-03T09:30:00.000Z'),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const dogs = JSON.parse(localStorage.getItem(storageKeys.dogs('uid-cloud')) ?? '{}') as Record<string, unknown>
    const appointments = JSON.parse(localStorage.getItem(storageKeys.appointments('uid-cloud')) ?? '{}') as Record<string, unknown>
    localStorage.clear()
    seedCloud('salon/shared/dogs', 'stale')
    seedCloud('salon/shared/appointments', 'old')
    seedCloud('salon/shared/services', 'extra')
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    await client.replaceCloudData('uid-cloud', {
      dogs,
      appointments,
      services: {
        bagno: {
          id: 'bagno',
          name: 'Bagno',
          kind: 'principale',
          durationMin: { piccola: 30, media: 45, grande: 60 },
          price: { piccola: 20, media: 28, grande: 38 },
          order: 0,
          active: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
      settings: { theme: 'dark', updatedAt: '2026-01-01T00:00:00.000Z' },
    })
    const written = fs.writes.map((item) => item.path)
    expect(written).toContain(`salon/shared/dogs/${dog.id}`)
    expect(written).toContain(`salon/shared/appointments/${appointment.id}`)
    expect(written).toContain('salon/shared/services/bagno')
    expect(written).toContain('salon/shared/settings/main')
    expect(fs.deletes).toEqual(expect.arrayContaining([
      'salon/shared/dogs/stale',
      'salon/shared/appointments/old',
      'salon/shared/services/extra',
    ]))
    expect(fs.deletes).not.toContain(`salon/shared/dogs/${dog.id}`)
    expect(setItem.mock.calls.some(([key]) => String(key).startsWith('groomly.users.'))).toBe(false)
    expect(localStorage.getItem(storageKeys.dogs('uid-cloud'))).toBeNull()
    expect(localStorage.getItem(storageKeys.appointments('uid-cloud'))).toBeNull()
    setItem.mockRestore()
  })

  it('riporta cani, prezzi e servizi dell’account anche se il salone è stato svuotato', async () => {
    seedCloud('users/fb-1/dogs', 'birba')
    fs.store.get('users/fb-1/dogs')?.set('birba', { id: 'birba', name: 'Birba', updatedAt: 10 })
    seedCloud('users/fb-1/appointments', 'vis-1')
    fs.store.get('users/fb-1/appointments')?.set('vis-1', { id: 'vis-1', dogId: 'birba', updatedAt: 10 })
    seedCloud('users/fb-1/services', 'bagno')
    fs.store.get('users/fb-1/services')?.set('bagno', {
      id: 'bagno',
      name: 'Bagno',
      price: { piccola: 80, media: 90, grande: 100 },
      updatedAt: 10,
    })
    seedCloud('users/fb-1/settings', 'main')
    fs.store.get('users/fb-1/settings')?.set('main', {
      theme: 'dark',
      updatedAt: '2026-01-01T00:00:00.000Z',
      business: { name: 'Toelettatura', vatNumber: '', phone: '', address: '' },
      priceList: { id: 'listino', fileName: 'listino.pdf', dataUrl: 'https://files.example/listino.pdf' },
    })
    seedCloud('salon/shared/services', 'bagno')
    fs.store.get('salon/shared/services')?.set('bagno', {
      id: 'bagno',
      name: 'Bagno',
      price: { piccola: 20, media: 28, grande: 38 },
      updatedAt: Date.now(),
    })
    fs.store.get('salon/shared/services')?.set('stripping', {
      id: 'stripping',
      name: 'Stripping',
      price: { piccola: 50, media: 65, grande: 85 },
      updatedAt: Date.now(),
    })
    seedCloud('salon/shared/settings', 'main')
    fs.store.get('salon/shared/settings')?.set('main', {
      theme: 'auto',
      updatedAt: new Date().toISOString(),
      business: { name: '', vatNumber: '', phone: '', address: '' },
      priceListHistory: [],
    })
    seedCloud('users/laura/dogs', 'lulu')
    fs.store.get('users/laura/dogs')?.set('lulu', { id: 'lulu', name: 'Lulu', updatedAt: 10 })
    authFns.signIn.mockResolvedValue({ user: firebaseUser() })
    await client.signInEmail('maria@salone.it', 'segretissimo')
    expect(fs.store.get('salon/shared/dogs')?.get('birba')).toMatchObject({ name: 'Birba' })
    expect(fs.store.get('salon/shared/appointments')?.get('vis-1')).toMatchObject({ dogId: 'birba' })
    expect(fs.store.get('salon/shared/dogs')?.has('lulu')).toBe(false)
    expect(fs.store.get('salon/shared/services')?.get('bagno')).toMatchObject({ price: { piccola: 80 } })
    expect(fs.store.get('salon/shared/services')?.has('stripping')).toBe(false)
    expect(fs.store.get('salon/shared/settings')?.get('main')).toMatchObject({
      business: { name: 'Toelettatura' },
      priceList: { fileName: 'listino.pdf' },
    })
    await client.listenDogs('fb-1', () => undefined)
    await client.listenServices('fb-1', () => undefined)
    expect(fs.snapshots).toEqual(['salon/shared/dogs', 'salon/shared/services'])
    authFns.signIn.mockResolvedValue({ user: firebaseUser('laura', 'laura@salone.it') })
    await client.signOutEmail()
    await client.signInEmail('laura@salone.it', 'segretissimo')
    expect(fs.store.get('salon/shared/dogs')?.get('lulu')).toMatchObject({ name: 'Lulu' })
    expect(fs.store.get('salon/shared/dogs')?.get('birba')).toMatchObject({ name: 'Birba' })
    expect(fs.store.get('salon/shared/services')?.get('bagno')).toMatchObject({ price: { piccola: 80 } })
  })

  it('mostra a tutti le foto caricate da un altro account e non le cancella', async () => {
    seedCloud('salon/shared/dogs', 'lulu')
    fs.store.get('salon/shared/dogs')?.set('lulu', { id: 'lulu', name: 'Lulu', updatedAt: 50 })
    seedCloud('users/laura/dogs', 'lulu')
    fs.store.get('users/laura/dogs')?.set('lulu', {
      id: 'lulu', name: 'Lulu', updatedAt: 10,
      photo: 'https://files.example/lulu.jpg',
      gallery: [{ id: 'g1', photo: 'data:image/jpeg;base64,QQ==', takenAt: 1 }],
    })
    seedCloud('salon/shared/appointments', 'vis')
    fs.store.get('salon/shared/appointments')?.set('vis', { id: 'vis', dogId: 'lulu', photos: [], updatedAt: 50 })
    seedCloud('users/laura/appointments', 'vis')
    fs.store.get('users/laura/appointments')?.set('vis', {
      id: 'vis', photos: [{ id: 'p1', photo: 'https://files.example/prima.jpg', kind: 'prima' }], updatedAt: 10,
    })
    authFns.signIn.mockResolvedValue({ user: firebaseUser('laura', 'laura@salone.it') })
    await client.signInEmail('laura@salone.it', 'segretissimo')
    expect(fs.store.get('salon/shared/dogs')?.get('lulu')).toMatchObject({ photo: 'https://files.example/lulu.jpg' })
    expect(fs.store.get('salon/shared/dogs')?.get('lulu')?.gallery).toEqual([
      { id: 'g1', photo: 'data:image/jpeg;base64,QQ==', takenAt: 1 },
    ])
    expect(fs.store.get('salon/shared/appointments')?.get('vis')?.photos).toEqual([
      { id: 'p1', photo: 'https://files.example/prima.jpg', kind: 'prima' },
    ])
    const local = createDog('fb-1', dogWrite('Lulu'))
    await client.saveDog('fb-1', { ...local, id: 'lulu' })
    expect(fs.store.get('salon/shared/dogs')?.get('lulu')).toMatchObject({ photo: 'https://files.example/lulu.jpg' })
  })

  it('watchAuth consegna l’account locale prima della migrazione, poi l’account cloud', async () => {
    createDog('local-1', dogWrite('Birba'))
    let release: () => void = () => undefined
    let open = false
    const waiters: Array<() => void> = []
    fs.setDoc.mockImplementation(() => {
      if (open) return Promise.resolve()
      return new Promise<void>((resolve) => { waiters.push(resolve) })
    })
    release = () => {
      open = true
      const pending = waiters.splice(0)
      for (const resolve of pending) resolve()
    }
    let next: (user: ReturnType<typeof firebaseUser> | null) => void = () => undefined
    authFns.onAuthStateChanged.mockImplementation((_auth: unknown, cb: typeof next) => {
      next = cb
      return () => undefined
    })
    const accounts: ({ uid: string } | null)[] = []
    const enabled = await import('./enabled')
    const toasts: string[] = []
    enabled.subscribeSaveFailed(() => { toasts.push('fail') })
    await client.watchAuth((account) => { accounts.push(account) })
    next(firebaseUser())
    expect(accounts).toHaveLength(1)
    expect(accounts[0]?.uid).toBe('local-1')
    await vi.waitFor(() => expect(fs.setDoc).toHaveBeenCalled())
    release()
    await vi.waitFor(() => expect(accounts.at(-1)?.uid).toBe('fb-1'))
    expect(toasts).toEqual([])
    next(null)
    expect(accounts.at(-1)).toBeNull()
  })

  it('se la migrazione fallisce il toast resta e l’account locale non viene sostituito dal vuoto', async () => {
    createDog('local-1', dogWrite('Birba'))
    let fail: (error: Error) => void = () => undefined
    fs.setDoc.mockImplementation(() => new Promise<void>((_resolve, reject) => { fail = reject }))
    let next: (user: ReturnType<typeof firebaseUser> | null) => void = () => undefined
    authFns.onAuthStateChanged.mockImplementation((_auth: unknown, cb: typeof next) => {
      next = cb
      return () => undefined
    })
    const accounts: ({ uid: string } | null)[] = []
    const enabled = await import('./enabled')
    const toasts: string[] = []
    const stop = enabled.subscribeSaveFailed(() => { toasts.push('fail') })
    await client.watchAuth((account) => { accounts.push(account) })
    next(firebaseUser())
    expect(accounts.map((account) => account?.uid)).toEqual(['local-1'])
    await vi.waitFor(() => expect(fs.setDoc).toHaveBeenCalled())
    fail(new Error('rete'))
    await vi.waitFor(() => expect(toasts).toEqual(['fail']))
    expect(accounts.at(-1)?.uid).toBe('local-1')
    stop()
  })
})
