// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAppointment } from '../local/appointments'
import { createDog } from '../local/dogs'
import { blankSettings } from '../local/settings'
import { seedPriceSheet } from '../seed/priceSheet'
import { storageKeys } from '../local/storage'
import type { DogWrite } from '../../types/models'

const authFns = vi.hoisted(() => ({
  createUser: vi.fn(),
  signIn: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
  sendEmail: vi.fn(),
  sendReset: vi.fn(),
  reload: vi.fn(),
  current: null as { uid: string; email: string; emailVerified: boolean; metadata: { creationTime: string } } | null,
}))

const fs = vi.hoisted(() => {
  const store = new Map<string, Map<string, Record<string, unknown>>>()
  const writes: { path: string; data: Record<string, unknown> }[] = []
  const deletes: string[] = []
  const snapshots: string[] = []
  const uploads: { path: string; data: string }[] = []
  const listeners = new Map<string, Array<(snap: unknown) => void>>()
  let uploadFail = false
  function applyWrite(current: Record<string, unknown> | undefined, data: Record<string, unknown>, merge: boolean): Record<string, unknown> {
    const next: Record<string, unknown> = merge && current ? { ...current } : {}
    for (const [key, value] of Object.entries(data)) {
      const incoming = value && typeof value === 'object' && !Array.isArray(value)
        ? (value as { __arrayUnion?: unknown }).__arrayUnion
        : undefined
      if (Array.isArray(incoming)) {
        const previous = Array.isArray(next[key]) ? next[key] as unknown[] : []
        next[key] = [...new Set([...previous, ...incoming].filter((item): item is string => typeof item === 'string'))]
      } else {
        next[key] = value
      }
    }
    return next
  }
  async function writeDoc(ref: { path: string }, data: Record<string, unknown>, options?: { merge?: boolean }) {
    writes.push({ path: ref.path, data })
    const parts = ref.path.split('/')
    const id = parts.pop() ?? ''
    const col = parts.join('/')
    if (!store.has(col)) store.set(col, new Map())
    const map = store.get(col)
    map?.set(id, applyWrite(map.get(id), data, options?.merge === true))
  }
  async function readDoc(ref: { path: string }, _options?: { source?: string }) {
    const parts = ref.path.split('/')
    const id = parts.pop() ?? ''
    const data = store.get(parts.join('/'))?.get(id)
    return { exists: () => data != null, data: () => data }
  }
  async function removeDoc(ref: { path: string }) {
    deletes.push(ref.path)
    const parts = ref.path.split('/')
    const id = parts.pop() ?? ''
    store.get(parts.join('/'))?.delete(id)
  }
  const setDoc = vi.fn(writeDoc)
  const getDoc = vi.fn(readDoc)
  function emit(path: string, snap: unknown) {
    for (const listener of listeners.get(path) ?? []) listener(snap)
  }
  return {
    store, writes, deletes, snapshots, uploads, listeners, emit,
    get uploadFail() { return uploadFail }, set uploadFail(value: boolean) { uploadFail = value },
    batchFail: false,
    setDoc, getDoc, writeDoc, readDoc, removeDoc,
  }
})

vi.mock('../../lib/photoCodec', () => ({
  photoFromDataUrl: async () => ({ full: new Uint8Array([1, 2, 3]), thumb: new Uint8Array([9]), mime: 'image/webp', width: 10, height: 10 }),
}))

vi.mock('firebase/app', () => ({
  getApps: () => [{ name: 'app' }],
  initializeApp: () => ({ name: 'app' }),
}))

vi.mock('firebase/auth', () => ({
  getAuth: () => ({ get currentUser() { return authFns.current } }),
  createUserWithEmailAndPassword: (...args: unknown[]) => authFns.createUser(...args),
  signInWithEmailAndPassword: (...args: unknown[]) => authFns.signIn(...args),
  onAuthStateChanged: (...args: unknown[]) => authFns.onAuthStateChanged(...args),
  signOut: (...args: unknown[]) => authFns.signOut(...args),
  sendEmailVerification: (...args: unknown[]) => authFns.sendEmail(...args),
  sendPasswordResetEmail: (...args: unknown[]) => authFns.sendReset(...args),
  reload: (...args: unknown[]) => authFns.reload(...args),
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  initializeFirestore: () => ({}),
  persistentLocalCache: () => ({}),
  persistentMultipleTabManager: () => ({}),
  doc: (_db: unknown, ...parts: string[]) => ({ path: parts.join('/') }),
  collection: (_db: unknown, ...parts: string[]) => ({ path: parts.join('/') }),
  collectionGroup: (_db: unknown, name: string) => ({ path: `group:${name}`, group: name }),
  setDoc: (ref: { path: string }, data: Record<string, unknown>, options?: { merge?: boolean }) => fs.setDoc(ref, data, options),
  updateDoc: async () => undefined,
  arrayUnion: (...elements: unknown[]) => ({ __arrayUnion: elements }),
  getDoc: (ref: { path: string }, options?: { source?: string }) => fs.getDoc(ref, options),
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
  deleteDoc: (ref: { path: string }) => fs.removeDoc(ref),
  Bytes: class {
    constructor(readonly raw: Uint8Array) {}
    static fromUint8Array(raw: Uint8Array) { return new this(raw) }
    toUint8Array() { return this.raw }
  },
  writeBatch: () => {
    const ops: Array<() => Promise<void> | void> = []
    return {
      set: (ref: { path: string }, data: Record<string, unknown>) => { ops.push(() => fs.writeDoc(ref, data)) },
      delete: (ref: { path: string }) => { ops.push(() => fs.removeDoc(ref)) },
      commit: async () => {
        if (fs.batchFail) throw new Error('batch')
        for (const op of ops) await op()
      },
    }
  },
  onSnapshot: (col: { path: string }, onNext?: (snap: unknown) => void) => {
    fs.snapshots.push(col.path)
    if (onNext) {
      const list = fs.listeners.get(col.path) ?? []
      list.push(onNext)
      fs.listeners.set(col.path, list)
    }
    return () => {
      fs.listeners.set(col.path, (fs.listeners.get(col.path) ?? []).filter((item) => item !== onNext))
    }
  },
}))

vi.mock('firebase/storage', () => ({
  getStorage: () => ({}),
  ref: (_bucket: unknown, path: string) => ({ path }),
  uploadString: async (fileRef: { path: string }, data: string) => {
    if (fs.uploadFail) throw new Error('storage')
    fs.uploads.push({ path: fileRef.path, data })
  },
  getDownloadURL: async (fileRef: { path: string }) => `https://example.test/${fileRef.path}`,
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

const LAURA = 'laura.masala@tiscali.it'

function firebaseUser(uid = 'fb-1', email = 'maria@salone.it') {
  return { uid, email, emailVerified: false, metadata: { creationTime: '2026-01-01T00:00:00.000Z' } }
}

function seedCloud(path: string, id: string) {
  if (!fs.store.has(path)) fs.store.set(path, new Map())
  fs.store.get(path)?.set(id, { id })
}

function seedLauraAccount(uid: string) {
  if (!fs.store.has('accounts')) fs.store.set('accounts', new Map())
  fs.store.get('accounts')?.set(uid, { firstName: '', lastName: '', email: LAURA, salonId: 'shared', role: 'titolare', legacy: true })
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
    fs.uploads.length = 0
    fs.listeners.clear()
    fs.uploadFail = false
    fs.batchFail = false
    authFns.createUser.mockReset()
    authFns.signIn.mockReset()
    authFns.onAuthStateChanged.mockReset()
    authFns.signOut.mockReset()
    authFns.sendEmail.mockReset()
    authFns.sendEmail.mockResolvedValue(undefined)
    authFns.sendReset.mockReset()
    authFns.sendReset.mockResolvedValue(undefined)
    authFns.reload.mockReset()
    authFns.reload.mockResolvedValue(undefined)
    authFns.current = null
    fs.setDoc.mockReset()
    fs.setDoc.mockImplementation(fs.writeDoc)
    fs.getDoc.mockReset()
    fs.getDoc.mockImplementation(fs.readDoc)
    vi.resetModules()
    client = await import('./client')
    const root = await import('./salonRoot')
    root.bindSalon('shared')
  })

  it('registerOwner: email già in uso non entra', async () => {
    authFns.createUser.mockRejectedValue({ code: 'auth/email-already-in-use' })
    await expect(client.registerOwner({
      email: 'ada@salone.it', password: 'segretissimo', firstName: 'Ada', lastName: 'Neri',
      salonName: 'I Pelosetti', vatNumber: '', address: '',
    })).rejects.toMatchObject({ code: 'auth_email_taken', message: 'Questa email ha già un account' })
    expect(authFns.signIn).not.toHaveBeenCalled()
  })

  it('registerOwner scrive accounts e salons/{uid}, mai salon/shared', async () => {
    authFns.createUser.mockResolvedValue({ user: firebaseUser('uid-9', 'ada@salone.it') })
    authFns.sendEmail = vi.fn(async () => undefined)
    await client.registerOwner({
      email: 'Ada@Salone.it', password: 'segretissimo', firstName: 'Ada', lastName: 'Neri',
      salonName: 'I Pelosetti', vatNumber: '', address: 'Via Roma',
    })
    expect(fs.store.get('accounts')?.get('uid-9')).toMatchObject({
      firstName: 'Ada', lastName: 'Neri', email: 'ada@salone.it', salonId: 'uid-9', role: 'titolare', legacy: false,
    })
    expect(fs.store.get('salons/uid-9/settings')?.get('main')).toMatchObject({
      business: { name: 'I Pelosetti', vatNumber: '', address: 'Via Roma', taxCode: '' },
    })
    expect(fs.writes.some((item) => item.path.startsWith('salon/shared'))).toBe(false)
    expect(authFns.sendEmail).toHaveBeenCalledTimes(1)
    expect(client.currentSalonId()).toBe('uid-9')
  })

  it('registerOwner: se le impostazioni non si salvano il salone resta slegato', async () => {
    authFns.createUser.mockResolvedValue({ user: firebaseUser('uid-9', 'ada@salone.it') })
    fs.setDoc.mockImplementation(async (ref: { path: string }, data: Record<string, unknown>) => {
      if (ref.path.startsWith('salons/')) throw new Error('rete')
      return fs.writeDoc(ref, data)
    })
    await expect(client.registerOwner({
      email: 'ada@salone.it', password: 'segretissimo', firstName: 'Ada', lastName: 'Neri',
      salonName: 'I Pelosetti', vatNumber: '', address: '',
    })).rejects.toMatchObject({ code: 'storage_write' })
    expect(client.currentSalonId()).toBeNull()
    expect(authFns.sendEmail).not.toHaveBeenCalled()
    expect(fs.store.get('accounts')?.has('uid-9')).toBe(false)
    let next: (user: ReturnType<typeof firebaseUser> | null) => void = () => undefined
    authFns.onAuthStateChanged.mockImplementation((_auth: unknown, cb: typeof next) => {
      next = cb
      return () => undefined
    })
    const accounts: ({ uid: string; salonId?: string } | null)[] = []
    await client.watchAuth((account) => { accounts.push(account) })
    next(firebaseUser('uid-9', 'ada@salone.it'))
    await vi.waitFor(() => expect(accounts).toHaveLength(1))
    expect(accounts[0]).toMatchObject({ uid: 'uid-9', salonId: '' })
    expect(client.currentSalonId()).toBeNull()
  })

  describe('coda dei salvataggi e cambio di salone', () => {
    const listino = {
      id: 'pf1', fileName: 'listino.pdf', mime: 'application/pdf', byteSize: 3,
      uploadedAt: '2026-10-13T00:00:00.000Z', dataUrl: 'data:application/pdf;base64,QUJD',
    }

    async function queueWhileOffline() {
      const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
      await client.saveSettings('fb-1', { ...blankSettings('auto', '2026-10-13T00:00:00.000Z'), priceList: listino })
      void client.removeDog('fb-1', 'marcello')
      expect(fs.writes).toHaveLength(0)
      expect(fs.deletes).toHaveLength(0)
      return online
    }

    async function reconnect(online: { mockReturnValue: (value: boolean) => unknown; mockRestore: () => void }) {
      online.mockReturnValue(true)
      window.dispatchEvent(new Event('online'))
      await new Promise((resolve) => setTimeout(resolve, 30))
      online.mockRestore()
    }

    it('dopo Esci e un nuovo salone, un salvataggio rimasto in coda non scrive né in salons/{uid} né in shared', async () => {
      const online = await queueWhileOffline()
      authFns.signOut.mockResolvedValue(undefined)
      await client.signOutEmail()
      const root = await import('./salonRoot')
      root.bindSalon('uid-new')
      await reconnect(online)
      expect(fs.writes.filter((item) => item.path.startsWith('salons/uid-new'))).toHaveLength(0)
      expect(fs.deletes.filter((path) => path.startsWith('salons/uid-new'))).toHaveLength(0)
      expect(fs.writes.some((item) => item.path.startsWith('salon/shared'))).toBe(false)
      expect(fs.deletes.some((path) => path.startsWith('salon/shared'))).toBe(false)
      expect(fs.store.get('salon/shared/settings')?.get('main')).toBeUndefined()
    })

    it('anche se l’utente sparisce per watchAuth la coda si svuota', async () => {
      const online = await queueWhileOffline()
      let next: (user: ReturnType<typeof firebaseUser> | null) => void = () => undefined
      authFns.onAuthStateChanged.mockImplementation((_auth: unknown, cb: typeof next) => {
        next = cb
        return () => undefined
      })
      await client.watchAuth(() => undefined)
      next(null)
      const root = await import('./salonRoot')
      root.bindSalon('uid-new')
      await reconnect(online)
      expect(fs.writes.filter((item) => item.path.startsWith('salons/uid-new'))).toHaveLength(0)
      expect(fs.writes.some((item) => item.path.startsWith('salon/shared'))).toBe(false)
    })

    it('senza cambio di salone il salvataggio in coda parte al ritorno della rete', async () => {
      const online = await queueWhileOffline()
      await reconnect(online)
      expect(fs.store.get('salon/shared/settings')?.get('main')).toBeDefined()
      expect(fs.deletes.some((path) => path === 'salon/shared/dogs/marcello')).toBe(true)
    })

    it('un salone nuovo continua a salvare dopo il cambio', async () => {
      const online = await queueWhileOffline()
      authFns.signOut.mockResolvedValue(undefined)
      await client.signOutEmail()
      const root = await import('./salonRoot')
      root.bindSalon('uid-new')
      await client.saveSettings('uid-new', { ...blankSettings('auto', '2026-10-14T00:00:00.000Z'), priceList: listino })
      await reconnect(online)
      expect(fs.store.get('salons/uid-new/settings')?.get('main')).toBeDefined()
      expect(fs.writes.some((item) => item.path.startsWith('salon/shared'))).toBe(false)
    })
  })

  describe('Riprova', () => {
    const profile = { firstName: 'Ada', lastName: 'Neri', salonName: 'I Pelosetti', vatNumber: '', address: '' }

    function signedInAs(uid: string, email: string) {
      authFns.current = firebaseUser(uid, email)
    }

    function seedAccount(uid: string) {
      if (!fs.store.has('accounts')) fs.store.set('accounts', new Map())
      fs.store.get('accounts')?.set(uid, {
        firstName: 'Ada', lastName: 'Neri', email: 'ada@salone.it', salonId: uid, role: 'titolare', legacy: false,
      })
    }

    function seedSettings(uid: string) {
      fs.store.set(`salons/${uid}/settings`, new Map([['main', {
        business: { name: 'Nome già scelto', vatNumber: '', address: 'Via Roma', taxCode: '' },
        updatedAt: '2026-10-17T10:00:00.000Z',
      }]]))
    }

    beforeEach(async () => {
      const root = await import('./salonRoot')
      root.clearSalon()
    })

    it('con il documento account già scritto aggancia il salone e non scrive impostazioni', async () => {
      signedInAs('uid-9', 'ada@salone.it')
      seedAccount('uid-9')
      seedSettings('uid-9')
      await client.repairOwnerSalon(profile)
      expect(client.currentSalonId()).toBe('uid-9')
      expect(fs.writes).toHaveLength(0)
      expect(fs.store.get('salons/uid-9/settings')?.get('main')).toMatchObject({ business: { name: 'Nome già scelto' } })
    })

    it('con l’account mancante ma le impostazioni presenti scrive l’account e non sostituisce le impostazioni', async () => {
      signedInAs('uid-9', 'ada@salone.it')
      seedSettings('uid-9')
      await client.repairOwnerSalon(profile)
      expect(fs.store.get('accounts')?.get('uid-9')).toMatchObject({ salonId: 'uid-9', role: 'titolare' })
      expect(fs.writes.some((item) => item.path === 'salons/uid-9/settings/main')).toBe(false)
      expect(fs.store.get('salons/uid-9/settings')?.get('main')).toMatchObject({ business: { name: 'Nome già scelto', address: 'Via Roma' } })
      expect(client.currentSalonId()).toBe('uid-9')
    })

    it('con tutto mancante crea il salone in salons/{uid}, mai in salon/shared', async () => {
      signedInAs('uid-9', 'ada@salone.it')
      await client.repairOwnerSalon({ ...profile, firstName: 'Ada' })
      expect(fs.store.get('accounts')?.get('uid-9')).toMatchObject({ firstName: 'Ada', lastName: 'Neri', salonId: 'uid-9', legacy: false })
      expect(fs.store.get('salons/uid-9/settings')?.get('main')).toMatchObject({
        business: { name: 'I Pelosetti', vatNumber: '', address: '', taxCode: '' },
      })
      expect(fs.writes.some((item) => item.path.startsWith('salon/shared'))).toBe(false)
      expect(client.currentSalonId()).toBe('uid-9')
      expect(authFns.sendEmail).toHaveBeenCalledTimes(1)
    })

    it('se la lettura dell’account non riesce non scrive niente', async () => {
      signedInAs('uid-9', 'ada@salone.it')
      fs.getDoc.mockRejectedValue(new Error('rete'))
      await expect(client.repairOwnerSalon(profile)).rejects.toMatchObject({ code: 'storage_write' })
      expect(fs.writes).toHaveLength(0)
      expect(client.currentSalonId()).toBeNull()
    })
  })

  it('Laura: la prima scrittura dell’account non trattiene l’accesso e un errore avvisa', async () => {
    const enabled = await import('./enabled')
    const toasts: string[] = []
    const stop = enabled.subscribeSaveFailed(() => { toasts.push('fail') })
    fs.setDoc.mockImplementation((ref: { path: string }, data: Record<string, unknown>) => (
      ref.path.startsWith('accounts/') ? new Promise<void>(() => undefined) : fs.writeDoc(ref, data)
    ))
    authFns.signIn.mockResolvedValue({ user: firebaseUser('laura-uid', LAURA) })
    const done = await Promise.race([
      client.signInEmail(LAURA, 'segretissimo').then(() => 'fatto'),
      new Promise((resolve) => setTimeout(() => resolve('appeso'), 200)),
    ])
    expect(done).toBe('fatto')
    expect(client.currentSalonId()).toBe('shared')
    expect(toasts).toEqual([])
    stop()
  })

  it('Laura: se la scrittura dell’account fallisce l’accesso resta e arriva «Salvataggio non riuscito»', async () => {
    const enabled = await import('./enabled')
    const toasts: string[] = []
    const stop = enabled.subscribeSaveFailed(() => { toasts.push('fail') })
    fs.setDoc.mockImplementation(async (ref: { path: string }, data: Record<string, unknown>) => {
      if (ref.path.startsWith('accounts/')) throw new Error('rete')
      return fs.writeDoc(ref, data)
    })
    authFns.signIn.mockResolvedValue({ user: firebaseUser('laura-uid', LAURA) })
    await client.signInEmail(LAURA, 'segretissimo')
    await vi.waitFor(() => expect(toasts).toContain('fail'))
    expect(client.currentSalonId()).toBe('shared')
    stop()
  })

  it('registerEmail: già in uso non fa l’accesso', async () => {
    authFns.createUser.mockRejectedValue({ code: 'auth/email-already-in-use' })
    authFns.signIn.mockResolvedValue({ user: firebaseUser() })
    await expect(client.registerEmail('maria@salone.it', 'segretissimo')).rejects.toMatchObject({
      code: 'auth_email_taken', message: 'Questa email ha già un account',
    })
    expect(authFns.signIn).not.toHaveBeenCalled()
  })

  it('Laura senza documento viene legata a shared e un’altra email no', async () => {
    authFns.signIn.mockResolvedValue({ user: firebaseUser('laura-uid', LAURA) })
    await client.signInEmail(LAURA, 'segretissimo')
    expect(fs.store.get('accounts')?.get('laura-uid')).toMatchObject({ salonId: 'shared', legacy: true, role: 'titolare' })
    expect(client.currentSalonId()).toBe('shared')
  })

  it('Roberto senza documento entra in shared e non copia users né un salone proprio', async () => {
    fs.store.set('users/rob-uid/dogs', new Map([['rex', { name: 'Rex' }]]))
    authFns.signIn.mockResolvedValue({ user: firebaseUser('rob-uid', 'masala.roberto@hotmail.it') })
    await client.signInEmail('masala.roberto@hotmail.it', 'segretissimo')
    expect(client.currentSalonId()).toBe('shared')
    expect(fs.store.get('accounts')?.get('rob-uid')).toMatchObject({ salonId: 'shared', legacy: true, role: 'titolare' })
    expect(fs.store.get('salon/shared/dogs')?.has('rex')).toBeFalsy()
    expect(fs.writes.some((item) => item.path.startsWith('salons/'))).toBe(false)
    expect(fs.store.get('salon/shared/members')?.has('rob-uid')).toBe(true)
  })

  it('Roberto con un salone proprio viene riportato su shared e tiene nome e cognome', async () => {
    fs.store.set('accounts', new Map([['rob-uid', {
      firstName: 'Roberto', lastName: 'Masala', email: 'masala.roberto@hotmail.it', salonId: 'rob-uid', role: 'titolare', legacy: false,
    }]]))
    authFns.signIn.mockResolvedValue({ user: firebaseUser('rob-uid', 'masala.roberto@hotmail.it') })
    const account = await client.signInEmail('masala.roberto@hotmail.it', 'segretissimo')
    expect(account).toMatchObject({ firstName: 'Roberto', lastName: 'Masala', salonId: 'shared', legacy: true })
    expect(client.currentSalonId()).toBe('shared')
  })

  it.each(['', 'laura.masala@tiscali.it'])(
    'Roberto corregge l’email condivisa %j e usa solo le protezioni cloud',
    async (storedEmail) => {
      fs.store.set('accounts', new Map([['rob-uid', {
        firstName: 'Roberto', lastName: 'Masala', email: storedEmail, salonId: 'shared', role: 'titolare', legacy: true,
      }]]))
      localStorage.setItem('groomly.deleted', JSON.stringify({ ids: ['marcello'], appointmentIds: [] }))
      authFns.signIn.mockResolvedValueOnce({ user: firebaseUser('rob-uid', 'masala.roberto@hotmail.it') })

      await client.signInEmail('masala.roberto@hotmail.it', 'segretissimo')

      expect(client.currentSalonId()).toBe('shared')
      expect(fs.store.get('accounts')?.get('rob-uid')).toMatchObject({
        email: 'masala.roberto@hotmail.it',
        firstName: 'Roberto',
        lastName: 'Masala',
      })

      const seen: { id: string }[][] = []
      await client.listenDogs('rob-uid', (dogs) => { seen.push(dogs) })
      fs.emit('salon/shared/dogs', collectionSnap([
        { id: 'marcello', data: { id: 'marcello', name: 'Marcello' } },
      ], false))
      await vi.waitFor(() => expect(seen).toHaveLength(1))
      expect(seen[0]?.map((dog) => dog.id)).toEqual(['marcello'])

      await client.listenServices('rob-uid', () => undefined)
      fs.emit('salon/shared/services', collectionSnap([], false))
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(fs.writes.filter((item) => item.path.startsWith('salon/shared/services/'))).toEqual([])
    },
  )

  it('Riprova Roberto conserva nome e cognome esistenti se quelli inviati sono vuoti', async () => {
    fs.store.set('accounts', new Map([['rob-uid', {
      firstName: 'Roberto', lastName: 'Masala', email: 'masala.roberto@hotmail.it',
    }]]))
    authFns.current = firebaseUser('rob-uid', 'masala.roberto@hotmail.it')
    await client.repairOwnerSalon({
      firstName: '', lastName: '', salonName: '', vatNumber: '', address: '',
    })
    expect(fs.store.get('accounts')?.get('rob-uid')).toMatchObject({
      firstName: 'Roberto',
      lastName: 'Masala',
      salonId: 'shared',
      role: 'titolare',
      legacy: true,
    })
    expect(fs.writes.some((item) => item.path.startsWith('salons/rob-uid'))).toBe(false)
  })

  it('robmass83 senza documento non aggancia shared', async () => {
    authFns.signIn.mockResolvedValue({ user: firebaseUser('robmass-uid', 'robmass83@gmail.com') })
    const account = await client.signInEmail('robmass83@gmail.com', 'segretissimo')
    expect(client.currentSalonId()).toBeNull()
    expect(account.salonId).toBe('')
    expect(fs.store.get('accounts')?.has('robmass-uid')).toBeFalsy()
  })

  it('un’altra email senza documento non lega shared e non legge salon/shared', async () => {
    seedCloud('salon/shared/dogs', 'lulu')
    authFns.signIn.mockResolvedValue({ user: firebaseUser('uid-2', 'maria@salone.it') })
    const account = await client.signInEmail('maria@salone.it', 'segretissimo')
    expect(client.currentSalonId()).toBeNull()
    expect(account).toMatchObject({ uid: 'uid-2', salonId: '', legacy: false })
    expect(fs.store.get('accounts')?.has('uid-2')).toBeFalsy()
    await expect(client.listenDogs('uid-2', () => undefined)).rejects.toMatchObject({ code: 'storage_write' })
    expect(fs.snapshots.some((path) => path.startsWith('salon/shared'))).toBe(false)
    expect(fs.writes.some((item) => item.path.startsWith('salon/shared'))).toBe(false)
  })

  it('il documento accounts lega il suo salone e l’account ne porta nome e id', async () => {
    fs.store.set('accounts', new Map([['uid-9', {
      firstName: 'Ada', lastName: 'Neri', email: 'ada@salone.it', salonId: 'uid-9', role: 'titolare', legacy: false,
    }]]))
    authFns.signIn.mockResolvedValue({ user: { ...firebaseUser('uid-9', 'ada@salone.it'), emailVerified: true } })
    const account = await client.signInEmail('ada@salone.it', 'segretissimo')
    expect(account).toMatchObject({ uid: 'uid-9', firstName: 'Ada', lastName: 'Neri', salonId: 'uid-9', legacy: false })
    expect(client.lastEmailVerified()).toBe(true)
    expect(client.currentSalonId()).toBe('uid-9')
    await client.signOutEmail()
    expect(client.currentSalonId()).toBeNull()
  })

  it('sendPasswordReset: troppe richieste chiede di aspettare, rete assente è «Connessione assente»', async () => {
    authFns.sendReset.mockRejectedValueOnce({ code: 'auth/too-many-requests' })
    await expect(client.sendPasswordReset('ada@salone.it')).rejects.toMatchObject({
      code: 'auth_slow', message: 'Aspetta un momento e riprova',
    })
    authFns.sendReset.mockRejectedValueOnce({ code: 'auth/network-request-failed' })
    await expect(client.sendPasswordReset('ada@salone.it')).rejects.toMatchObject({ code: 'auth_offline' })
    await client.sendPasswordReset(' Ada@Salone.it ')
    expect(authFns.sendReset).toHaveBeenLastCalledWith(expect.anything(), 'ada@salone.it')
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
    authFns.signIn.mockResolvedValue({ user: firebaseUser('fb-1', LAURA) })
    await client.signInEmail(LAURA, 'segretissimo')
    expect(fs.store.get('salon/shared/dogs')?.get('birba')).toMatchObject({ name: 'Birba' })
    expect(fs.store.get('salon/shared/appointments')?.get('vis-1')).toMatchObject({ dogId: 'birba' })
    expect(fs.store.get('salon/shared/dogs')?.has('lulu')).toBe(false)
    expect(fs.store.get('salon/shared/services')?.get('bagno')).toMatchObject({ price: { piccola: 20, media: 28, grande: 38 } })
    expect(fs.store.get('salon/shared/services')?.has('stripping')).toBe(true)
    expect(fs.store.get('salon/shared/settings')?.get('main')).toMatchObject({
      business: { name: 'Toelettatura' },
      priceList: { fileName: 'listino.pdf' },
    })
    expect(fs.store.get('salon/shared/settings')?.get('main')?.theme).toBeUndefined()
    await client.listenDogs('fb-1', () => undefined)
    await client.listenServices('fb-1', () => undefined)
    expect(fs.snapshots).toEqual(['salon/shared/dogs', 'salon/shared/services'])
    fs.store.set('accounts', new Map([...(fs.store.get('accounts') ?? new Map()), ['uid-2', {
      firstName: 'Maria', lastName: 'Rossi', email: 'maria@salone.it', salonId: 'uid-2', role: 'titolare', legacy: false,
    }]]))
    authFns.signIn.mockResolvedValue({ user: firebaseUser('uid-2', 'maria@salone.it') })
    await client.signOutEmail()
    fs.snapshots.length = 0
    fs.writes.length = 0
    await client.signInEmail('maria@salone.it', 'segretissimo')
    expect(client.currentSalonId()).toBe('uid-2')
    await client.listenDogs('uid-2', () => undefined)
    expect(fs.snapshots).toContain('salons/uid-2/dogs')
    expect(fs.snapshots).not.toContain('salon/shared/dogs')
    expect(fs.writes.some((item) => item.path.startsWith('salon/shared'))).toBe(false)
    expect(fs.store.get('salon/shared/dogs')?.has('lulu')).toBe(false)
    expect(fs.store.get('salon/shared/dogs')?.get('birba')).toMatchObject({ name: 'Birba' })
  })

  it('un cane eliminato non torna al prossimo accesso', async () => {
    seedCloud('users/fb-1/dogs', 'marcello')
    fs.store.get('users/fb-1/dogs')?.set('marcello', { id: 'marcello', name: 'Marcello', updatedAt: 10 })
    seedCloud('users/fb-1/dogs', 'filippo')
    fs.store.get('users/fb-1/dogs')?.set('filippo', { id: 'filippo', name: 'Filippo', updatedAt: 10 })
    authFns.signIn.mockResolvedValue({ user: firebaseUser('fb-1', LAURA) })
    await client.signInEmail(LAURA, 'segretissimo')
    expect(fs.store.get('salon/shared/dogs')?.get('filippo')).toMatchObject({ name: 'Filippo' })
    await client.removeDog('fb-1', 'marcello')
    fs.store.get('salon/shared/meta')?.delete('restored-fb-1')
    await client.signOutEmail()
    await client.signInEmail(LAURA, 'segretissimo')
    expect(fs.store.get('salon/shared/meta')?.get('deleted-dogs')).toMatchObject({
      ids: ['marcello'],
    })
    expect(fs.store.get('salon/shared/dogs')?.has('marcello')).toBe(false)
    expect(fs.store.get('users/fb-1/dogs')?.has('marcello')).toBe(true)
    expect(fs.deletes.some((path) => path.startsWith('users/'))).toBe(false)
    expect(fs.store.get('salon/shared/dogs')?.get('filippo')).toMatchObject({ name: 'Filippo' })
  })

  it('un appuntamento del cane eliminato non torna al prossimo accesso', async () => {
    seedCloud('users/fb-1/dogs', 'marcello')
    fs.store.get('users/fb-1/dogs')?.set('marcello', { id: 'marcello', name: 'Marcello', updatedAt: 10 })
    seedCloud('users/fb-1/appointments', 'vis-marcello')
    fs.store.get('users/fb-1/appointments')?.set('vis-marcello', { id: 'vis-marcello', dogId: 'marcello', updatedAt: 10 })
    authFns.signIn.mockResolvedValue({ user: firebaseUser('fb-1', LAURA) })
    await client.signInEmail(LAURA, 'segretissimo')
    expect(fs.store.get('salon/shared/appointments')?.get('vis-marcello')).toMatchObject({ dogId: 'marcello' })
    await client.removeDog('fb-1', 'marcello')
    fs.store.get('salon/shared/meta')?.delete('restored-fb-1')
    await client.signOutEmail()
    await client.signInEmail(LAURA, 'segretissimo')
    expect(fs.store.get('salon/shared/meta')?.get('deleted-dogs')?.appointmentIds).toContain('vis-marcello')
    expect(fs.store.get('salon/shared/appointments')?.has('vis-marcello')).toBe(false)
    expect(fs.store.get('users/fb-1/appointments')?.has('vis-marcello')).toBe(true)
  })

  it('una copia personale non sostituisce un cane già nel salone', async () => {
    seedCloud('salon/shared/dogs', 'lulu')
    fs.store.get('salon/shared/dogs')?.set('lulu', { id: 'lulu', name: 'Lulu del salone', updatedAt: 1 })
    seedCloud('users/laura/dogs', 'lulu')
    fs.store.get('users/laura/dogs')?.set('lulu', {
      id: 'lulu', name: 'Lulu vecchia', updatedAt: 99,
      photo: 'https://files.example/lulu.jpg',
    })
    seedCloud('users/laura/dogs', 'nuovo')
    fs.store.get('users/laura/dogs')?.set('nuovo', { id: 'nuovo', name: 'Nuovo', updatedAt: 5 })
    authFns.signIn.mockResolvedValue({ user: firebaseUser('laura', LAURA) })
    await client.signInEmail(LAURA, 'segretissimo')
    expect(fs.store.get('salon/shared/dogs')?.get('lulu')).toMatchObject({ name: 'Lulu del salone' })
    expect(fs.store.get('salon/shared/dogs')?.get('lulu')?.photo).toBeUndefined()
    expect(fs.store.get('salon/shared/dogs')?.get('nuovo')).toMatchObject({ name: 'Nuovo' })
  })

  it('salvare un cane già eliminato non lo riscrive', async () => {
    seedCloud('salon/shared/meta', 'deleted-dogs')
    fs.store.get('salon/shared/meta')?.set('deleted-dogs', { ids: ['marcello'], appointmentIds: [] })
    fs.store.set('salon/shared/dogs', new Map())
    authFns.signIn.mockResolvedValue({ user: firebaseUser('fb-1', LAURA) })
    await client.signInEmail(LAURA, 'segretissimo')
    const local = createDog('fb-1', dogWrite('Marcello'))
    await client.saveDog('fb-1', { ...local, id: 'marcello' })
    expect(fs.store.get('salon/shared/dogs')?.has('marcello')).toBe(false)
  })

  it('due unioni del segno tengono entrambi gli id dei cani', async () => {
    fs.store.set('salon/shared/meta', new Map([
      ['deleted-dogs', { ids: ['gia'], appointmentIds: ['vis-gia'] }],
    ]))
    const stale = { ids: ['gia'], appointmentIds: [] as string[] }
    fs.getDoc.mockImplementation(async (ref: { path: string }) => {
      if (ref.path === 'salon/shared/meta/deleted-dogs') {
        return { exists: () => true, data: () => ({ ids: [...stale.ids], appointmentIds: [...stale.appointmentIds] }) }
      }
      return fs.readDoc(ref)
    })
    await client.removeDog('fb-1', 'marcello')
    await client.removeDog('fb-1', 'filippo')
    const sign = fs.store.get('salon/shared/meta')?.get('deleted-dogs')
    expect(sign?.ids).toEqual(expect.arrayContaining(['gia', 'marcello', 'filippo']))
    expect(sign?.appointmentIds).toContain('vis-gia')
  })

  it('una lettura fallita del segno non copia il cane locale', async () => {
    const dog = createDog('local-1', dogWrite('Birba'))
    const appointment = createAppointment('local-1', {
      dogId: dog.id,
      start: new Date('2026-10-03T09:30:00.000Z'),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    fs.getDoc.mockImplementation(async (ref: { path: string }, options?: { source?: string }) => {
      if (ref.path === 'salon/shared/meta/deleted-dogs' && options?.source === 'server') throw new Error('rete')
      return fs.readDoc(ref)
    })
    authFns.signIn.mockResolvedValue({ user: firebaseUser('fb-1', LAURA) })
    await client.signInEmail(LAURA, 'segretissimo')
    expect(fs.store.get('salon/shared/dogs')?.get(dog.id)).toBeUndefined()
    expect(fs.store.get('salon/shared/appointments')?.get(appointment.id)).toBeUndefined()
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
    seedLauraAccount('fb-1')
    await client.watchAuth((account) => { accounts.push(account) })
    next(firebaseUser('fb-1', LAURA))
    await vi.waitFor(() => expect(accounts).toHaveLength(1))
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
    seedLauraAccount('fb-1')
    await client.watchAuth((account) => { accounts.push(account) })
    next(firebaseUser('fb-1', LAURA))
    await vi.waitFor(() => expect(accounts.map((account) => account?.uid)).toEqual(['local-1']))
    await vi.waitFor(() => expect(fs.setDoc).toHaveBeenCalled())
    fail(new Error('rete'))
    await vi.waitFor(() => expect(toasts).toEqual(['fail']))
    expect(accounts.at(-1)?.uid).toBe('local-1')
    stop()
  })

  function seedNamedDog(uid: string, id: string, name: string) {
    const created = createDog(uid, dogWrite(name))
    const map = JSON.parse(localStorage.getItem(storageKeys.dogs(uid))!) as Record<string, { id: string; name: string }>
    const stored = map[created.id]
    delete map[created.id]
    stored.id = id
    stored.name = name
    map[id] = stored
    localStorage.setItem(storageKeys.dogs(uid), JSON.stringify(map))
  }

  function seedSalonDog(id: string, name: string) {
    seedCloud('salon/shared/dogs', id)
    fs.store.get('salon/shared/dogs')?.set(id, { id, name, updatedAt: 50 })
  }

  it('uno specchio non riscrive il cane del salone e lascia la copia locale', async () => {
    const uid = 'fb-1'
    const id = 'cane-x'
    seedNamedDog(uid, id, 'Vecchio')
    localStorage.setItem(`groomly.mirror.${uid}`, '1')
    seedSalonDog(id, 'Nuovo')
    authFns.signIn.mockResolvedValue({ user: firebaseUser(uid, LAURA) })
    await client.signInEmail(LAURA, 'segretissimo')
    expect(fs.store.get('salon/shared/dogs')?.get(id)).toMatchObject({ name: 'Nuovo' })
    expect(fs.writes.filter((item) => item.path === `salon/shared/dogs/${id}`)).toEqual([])
    expect(localStorage.getItem(storageKeys.dogs(uid))).toContain('Vecchio')
  })

  it('senza segno di specchio il cane locale viene copiato nel salone', async () => {
    const uid = 'fb-1'
    const id = 'cane-x'
    seedNamedDog(uid, id, 'Vecchio')
    seedSalonDog(id, 'Nuovo')
    authFns.signIn.mockResolvedValue({ user: firebaseUser(uid, LAURA) })
    await client.signInEmail(LAURA, 'segretissimo')
    expect(fs.store.get('salon/shared/dogs')?.get(id)).toMatchObject({ name: 'Vecchio' })
  })

  it('offline, uno specchio non avvisa il fallimento e non inchioda la migrazione', async () => {
    const uid = 'fb-1'
    seedNamedDog(uid, 'cane-x', 'Vecchio')
    localStorage.setItem(`groomly.mirror.${uid}`, '1')
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const enabled = await import('./enabled')
    const toasts: string[] = []
    const stop = enabled.subscribeSaveFailed(() => { toasts.push('fail') })
    let next: (user: ReturnType<typeof firebaseUser> | null) => void = () => undefined
    authFns.onAuthStateChanged.mockImplementation((_auth: unknown, cb: typeof next) => {
      next = cb
      return () => undefined
    })
    await client.watchAuth(() => undefined)
    next(firebaseUser(uid, LAURA))
    await vi.waitFor(() => expect(enabled.isCloudReady()).toBe(true))
    expect(toasts).toEqual([])
    expect(fs.store.get('salon/shared/members')?.has(uid)).toBeFalsy()
    online.mockReturnValue(true)
    next(firebaseUser(uid, LAURA))
    await vi.waitFor(() => expect(fs.store.get('salon/shared/members')?.has(uid)).toBe(true))
    expect(toasts).toEqual([])
    stop()
    online.mockRestore()
  })

  it('watchAuth con un’altra email senza documento non lega shared e non entra in salon/shared', async () => {
    let next: (user: ReturnType<typeof firebaseUser> | null) => void = () => undefined
    authFns.onAuthStateChanged.mockImplementation((_auth: unknown, cb: typeof next) => {
      next = cb
      return () => undefined
    })
    const accounts: ({ uid: string; salonId?: string } | null)[] = []
    await client.watchAuth((account) => { accounts.push(account) })
    next(firebaseUser('uid-2', 'maria@salone.it'))
    await vi.waitFor(() => expect(accounts).toHaveLength(1))
    expect(accounts[0]).toMatchObject({ uid: 'uid-2', salonId: '' })
    expect(client.currentSalonId()).toBeNull()
    expect(fs.writes.some((item) => item.path.startsWith('salon/shared'))).toBe(false)
  })

  async function watchAndListen(user: ReturnType<typeof firebaseUser>) {
    ;(await import('./salonRoot')).clearSalon()
    let next: (value: ReturnType<typeof firebaseUser> | null) => void = () => undefined
    authFns.onAuthStateChanged.mockImplementation((_auth: unknown, cb: typeof next) => {
      next = cb
      return () => undefined
    })
    const failures: unknown[] = []
    const listened: string[] = []
    await client.watchAuth((account) => {
      if (!account) return
      listened.push(account.uid)
      client.listenDogs(account.uid, () => undefined).catch((error: unknown) => { failures.push(error) })
    })
    next(user)
    await vi.waitFor(() => expect(listened.length).toBeGreaterThan(0))
    await new Promise((resolve) => setTimeout(resolve, 20))
    return failures
  }

  it('watchAuth lega shared per Laura prima di consegnare l’account', async () => {
    const failures = await watchAndListen(firebaseUser('fb-1', LAURA))
    expect(failures).toEqual([])
    expect(fs.snapshots).toContain('salon/shared/dogs')
  })

  it('watchAuth lega il salone del titolare nuovo prima di consegnare l’account', async () => {
    fs.store.set('accounts', new Map([['uid-9', {
      firstName: 'Ada', lastName: 'Neri', email: 'ada@salone.it', salonId: 'uid-9', role: 'titolare', legacy: false,
    }]]))
    const failures = await watchAndListen(firebaseUser('uid-9', 'ada@salone.it'))
    expect(failures).toEqual([])
    expect(fs.snapshots).toContain('salons/uid-9/dogs')
    expect(fs.snapshots).not.toContain('salon/shared/dogs')
  })

  it('un titolare nuovo non riceve i cani locali del telefono', async () => {
    const local = createDog('local-1', dogWrite('Birba'))
    fs.store.set('accounts', new Map([['uid-9', {
      firstName: 'Ada', lastName: 'Neri', email: 'ada@salone.it', salonId: 'uid-9', role: 'titolare', legacy: false,
    }]]))
    authFns.signIn.mockResolvedValue({ user: firebaseUser('uid-9', 'ada@salone.it') })
    const account = await client.signInEmail('ada@salone.it', 'segretissimo')
    expect(account.uid).toBe('uid-9')
    expect(fs.writes.some((item) => item.path.includes('/dogs/'))).toBe(false)
    expect(localStorage.getItem(storageKeys.dogs('local-1'))).toContain(local.id)
    const enabled = await import('./enabled')
    expect(enabled.isCloudReady()).toBe(true)
  })

  it('readsLocal è falso per un solo specchio e localDataUid trova comunque l’uid', async () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-key')
    vi.resetModules()
    const enabled = await import('./enabled')
    localStorage.setItem(storageKeys.dogs('fb-1'), '{"cane-x":{"id":"cane-x","name":"Vecchio"}}')
    localStorage.setItem('groomly.mirror.fb-1', '1')
    expect(enabled.firebaseEnabled()).toBe(true)
    expect(enabled.isCloudReady()).toBe(false)
    expect(enabled.readsLocal()).toBe(false)
    expect(enabled.localDataUid()).toBe('fb-1')
    vi.unstubAllEnvs()
  })

  function collectionSnap(docs: { id: string; data: Record<string, unknown> }[], fromCache: boolean) {
    return {
      empty: docs.length === 0,
      docs: docs.map((item) => ({ id: item.id, data: () => item.data })),
      metadata: { fromCache },
    }
  }

  it('uno snapshot di impostazioni assente dalla cache non crea il salone', async () => {
    const seen: unknown[] = []
    await client.listenSettings('fb-1', (settings) => { seen.push(settings) })
    fs.emit('salon/shared/settings/main', { exists: () => false, data: () => undefined, metadata: { fromCache: true } })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(seen).toEqual([])
    expect(fs.store.get('salon/shared/settings')?.has('main')).toBeFalsy()
    fs.emit('salon/shared/settings/main', { exists: () => false, data: () => undefined, metadata: { fromCache: false } })
    await vi.waitFor(() => expect(fs.store.get('salon/shared/settings')?.has('main')).toBe(true))
    expect(seen).toHaveLength(1)
    expect(fs.store.get('salon/shared/settings')?.get('main')).toMatchObject({
      business: { name: '' },
    })
  })

  it('uno snapshot di cani vuoto dalla cache non sostituisce il cane locale', async () => {
    localStorage.setItem(storageKeys.dogs('fb-1'), JSON.stringify({ rex: { id: 'rex', name: 'Rex' } }))
    const seen: unknown[] = []
    await client.listenDogs('fb-1', (dogs) => { seen.push(dogs) })
    fs.emit('salon/shared/dogs', collectionSnap([], true))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(seen).toEqual([])
    expect(localStorage.getItem(storageKeys.dogs('fb-1'))).toContain('Rex')
    fs.emit('salon/shared/dogs', collectionSnap([], false))
    await vi.waitFor(() => expect(seen).toHaveLength(1))
    expect(seen[0]).toEqual([])
    fs.emit('salon/shared/dogs', collectionSnap([{ id: 'rex', data: { id: 'rex', name: 'Rex' } }], true))
    await vi.waitFor(() => expect(seen).toHaveLength(2))
    expect(seen[1]).toMatchObject([{ id: 'rex', name: 'Rex' }])
  })

  it('uno snapshot di appuntamenti vuoto dalla cache non sostituisce la copia', async () => {
    const seen: unknown[] = []
    await client.listenAppointments('fb-1', (items) => { seen.push(items) })
    fs.emit('salon/shared/appointments', collectionSnap([], true))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(seen).toEqual([])
    fs.emit('salon/shared/appointments', collectionSnap([{
      id: 'vis-1',
      data: { id: 'vis-1', dogId: 'rex', start: Date.parse('2026-10-03T09:30:00.000Z'), services: [], status: 'programmato' },
    }], false))
    await vi.waitFor(() => expect(seen).toHaveLength(1))
  })

  it('lo snapshot dei cani unisce il segno del salone e lo ricorda', async () => {
    seedCloud('salon/shared/meta', 'deleted-dogs')
    fs.store.get('salon/shared/meta')?.set('deleted-dogs', { ids: ['marcello'], appointmentIds: ['vis-marcello'] })
    const seen: { id: string }[][] = []
    await client.listenDogs('fb-1', (dogs) => { seen.push(dogs) })
    fs.emit('salon/shared/dogs', collectionSnap([
      { id: 'marcello', data: { id: 'marcello', name: 'Marcello' } },
      { id: 'filippo', data: { id: 'filippo', name: 'Filippo' } },
    ], true))
    await vi.waitFor(() => expect(seen).toHaveLength(1))
    expect(seen[0]?.map((dog) => dog.id)).toEqual(['filippo'])
    expect(JSON.parse(localStorage.getItem('groomly.deleted') ?? '{}')).toMatchObject({
      ids: ['marcello'],
      appointmentIds: ['vis-marcello'],
    })
  })

  it('una lettura fallita del segno non svuota il filtro', async () => {
    let reads = 0
    fs.getDoc.mockImplementation(async (ref: { path: string }) => {
      if (ref.path === 'salon/shared/meta/deleted-dogs') {
        reads += 1
        throw new Error('rete')
      }
      return fs.readDoc(ref)
    })
    const seen: unknown[] = []
    await client.listenDogs('fb-1', (dogs) => { seen.push(dogs) })
    const before = reads
    fs.emit('salon/shared/dogs', collectionSnap([{ id: 'marcello', data: { id: 'marcello', name: 'Marcello' } }], false))
    await vi.waitFor(() => expect(reads).toBeGreaterThan(before))
    expect(seen).toEqual([])
    expect(localStorage.getItem('groomly.deleted')).toBeNull()
  })

  it('uno snapshot di servizi vuoto dalla cache non semina', async () => {
    const seen: unknown[] = []
    await client.listenServices('fb-1', (services) => { seen.push(services) })
    fs.emit('salon/shared/services', collectionSnap([], true))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(seen).toEqual([])
    expect(fs.writes.filter((item) => item.path.startsWith('salon/shared/services/'))).toEqual([])
  })

  it('Roberto non applica il segno locale ai cani condivisi mentre Laura continua ad applicarlo', async () => {
    localStorage.setItem('groomly.deleted', JSON.stringify({ ids: ['marcello'], appointmentIds: [] }))
    authFns.signIn.mockResolvedValueOnce({ user: firebaseUser('rob-uid', 'masala.roberto@hotmail.it') })
    await client.signInEmail('masala.roberto@hotmail.it', 'segretissimo')
    const seenByRoberto: { id: string }[][] = []
    await client.listenDogs('rob-uid', (dogs) => { seenByRoberto.push(dogs) })
    fs.emit('salon/shared/dogs', collectionSnap([
      { id: 'marcello', data: { id: 'marcello', name: 'Marcello' } },
    ], false))
    await vi.waitFor(() => expect(seenByRoberto).toHaveLength(1))
    expect(seenByRoberto[0]?.map((dog) => dog.id)).toEqual(['marcello'])

    await client.signOutEmail()
    localStorage.setItem('groomly.deleted', JSON.stringify({ ids: ['marcello'], appointmentIds: [] }))
    authFns.signIn.mockResolvedValueOnce({ user: firebaseUser('laura-uid', LAURA) })
    await client.signInEmail(LAURA, 'segretissimo')
    const seenByLaura: { id: string }[][] = []
    await client.listenDogs('laura-uid', (dogs) => { seenByLaura.push(dogs) })
    fs.emit('salon/shared/dogs', collectionSnap([
      { id: 'marcello', data: { id: 'marcello', name: 'Marcello' } },
    ], false))
    await vi.waitFor(() => expect(seenByLaura).toHaveLength(1))
    expect(seenByLaura[0]).toEqual([])
  })

  it('Roberto non semina i servizi condivisi vuoti, un titolare non condiviso sì', async () => {
    authFns.signIn.mockResolvedValueOnce({ user: firebaseUser('rob-uid', 'masala.roberto@hotmail.it') })
    await client.signInEmail('masala.roberto@hotmail.it', 'segretissimo')
    await client.listenServices('rob-uid', () => undefined)
    fs.emit('salon/shared/services', collectionSnap([], false))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(fs.writes.filter((item) => item.path.startsWith('salon/shared/services/'))).toEqual([])

    await client.signOutEmail()
    fs.store.set('accounts', new Map([['uid-9', {
      firstName: 'Ada', lastName: 'Neri', email: 'ada@salone.it', salonId: 'uid-9', role: 'titolare', legacy: false,
    }]]))
    authFns.signIn.mockResolvedValueOnce({ user: firebaseUser('uid-9', 'ada@salone.it') })
    await client.signInEmail('ada@salone.it', 'segretissimo')
    await client.listenServices('uid-9', () => undefined)
    fs.emit('salons/uid-9/services', collectionSnap([], false))
    await vi.waitFor(() => expect(fs.writes.some((item) => item.path.startsWith('salons/uid-9/services/'))).toBe(true))
  })

  it('dopo un nuovo caricamento il segno locale cancella il cane del salone', async () => {
    localStorage.setItem('groomly.deleted', JSON.stringify({ ids: ['marcello'], appointmentIds: ['vis-marcello'] }))
    seedCloud('salon/shared/dogs', 'marcello')
    fs.store.get('salon/shared/dogs')?.set('marcello', { id: 'marcello', name: 'Marcello' })
    seedCloud('salon/shared/dogs', 'filippo')
    fs.store.get('salon/shared/dogs')?.set('filippo', { id: 'filippo', name: 'Filippo' })
    seedCloud('salon/shared/appointments', 'vis-marcello')
    fs.store.get('salon/shared/appointments')?.set('vis-marcello', { id: 'vis-marcello', dogId: 'marcello' })
    seedCloud('salon/shared/appointments', 'vis-filippo')
    fs.store.get('salon/shared/appointments')?.set('vis-filippo', { id: 'vis-filippo', dogId: 'filippo' })
    seedCloud('users/fb-1/dogs', 'marcello')
    fs.store.get('users/fb-1/dogs')?.set('marcello', { id: 'marcello', name: 'Marcello' })
    vi.resetModules()
    const restarted = await import('./client')
    authFns.signIn.mockResolvedValue({ user: firebaseUser('fb-1', LAURA) })
    await restarted.signInEmail(LAURA, 'segretissimo')
    expect(fs.store.get('salon/shared/meta')?.get('deleted-dogs')?.ids).toContain('marcello')
    expect(fs.store.get('salon/shared/meta')?.get('deleted-dogs')?.appointmentIds).toContain('vis-marcello')
    expect(fs.store.get('salon/shared/dogs')?.has('marcello')).toBe(false)
    expect(fs.store.get('salon/shared/appointments')?.has('vis-marcello')).toBe(false)
    expect(fs.store.get('salon/shared/dogs')?.get('filippo')).toMatchObject({ name: 'Filippo' })
    expect(fs.store.get('salon/shared/appointments')?.get('vis-filippo')).toMatchObject({ dogId: 'filippo' })
    expect(fs.store.get('users/fb-1/dogs')?.has('marcello')).toBe(true)
    expect(fs.deletes.some((path) => path.startsWith('users/'))).toBe(false)
  })

  it('un segno già sul server non cancella altri documenti', async () => {
    localStorage.setItem('groomly.deleted', JSON.stringify({ ids: ['marcello'], appointmentIds: ['vis-marcello'] }))
    seedCloud('salon/shared/meta', 'deleted-dogs')
    fs.store.get('salon/shared/meta')?.set('deleted-dogs', { ids: ['marcello'], appointmentIds: ['vis-marcello'] })
    seedCloud('salon/shared/dogs', 'filippo')
    fs.store.get('salon/shared/dogs')?.set('filippo', { id: 'filippo', name: 'Filippo' })
    seedCloud('salon/shared/appointments', 'vis-nuovo')
    fs.store.get('salon/shared/appointments')?.set('vis-nuovo', { id: 'vis-nuovo', dogId: 'filippo' })
    vi.resetModules()
    const restarted = await import('./client')
    authFns.signIn.mockResolvedValue({ user: firebaseUser('fb-1', LAURA) })
    await restarted.signInEmail(LAURA, 'segretissimo')
    expect(fs.store.get('salon/shared/dogs')?.get('filippo')).toMatchObject({ name: 'Filippo' })
    expect(fs.store.get('salon/shared/appointments')?.has('vis-nuovo')).toBe(true)
    expect(fs.deletes).not.toContain('salon/shared/dogs/filippo')
    expect(fs.deletes).not.toContain('salon/shared/appointments/vis-nuovo')
    expect(fs.store.get('salon/shared/meta')?.get('deleted-dogs')).toMatchObject({
      ids: ['marcello'],
      appointmentIds: ['vis-marcello'],
    })
  })

  it('una copia personale non sovrascrive le impostazioni del salone già compilate', async () => {
    seedCloud('users/fb-1/settings', 'main')
    fs.store.get('users/fb-1/settings')?.set('main', {
      updatedAt: '2026-10-01T00:00:00.000Z',
      business: { name: 'Personale', vatNumber: '', phone: '', address: '' },
      priceListHistory: [],
    })
    seedCloud('salon/shared/settings', 'main')
    fs.store.get('salon/shared/settings')?.set('main', {
      updatedAt: '2026-01-01T00:00:00.000Z',
      business: { name: 'Salone', vatNumber: '', phone: '', address: '' },
      priceListHistory: [],
    })
    authFns.signIn.mockResolvedValue({ user: firebaseUser('fb-1', LAURA) })
    await client.signInEmail(LAURA, 'segretissimo')
    expect(fs.store.get('salon/shared/settings')?.get('main')).toMatchObject({
      business: { name: 'Salone' },
    })
  })

  it('salva le foto in salon/shared/files e nel cane e nell’appuntamento scrive solo file:{id}', async () => {
    const dog = createDog('fb-1', dogWrite('Birba'))
    const appointment = createAppointment('fb-1', {
      dogId: dog.id,
      start: new Date('2026-10-03T09:30:00.000Z'),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    await client.saveDog('fb-1', {
      ...dog,
      photo: 'data:image/jpeg;base64,QQ==',
      gallery: [{ id: 'g1', photo: 'data:image/jpeg;base64,Qg==', takenAt: new Date('2026-03-01T00:00:00.000Z') }],
    })
    await client.saveAppointment('fb-1', {
      ...appointment,
      photos: [{ id: 'p1', photo: 'data:image/jpeg;base64,Qw==', kind: 'prima' }],
    })
    const storedDog = fs.store.get('salon/shared/dogs')?.get(dog.id)
    const storedVisit = fs.store.get('salon/shared/appointments')?.get(appointment.id)
    expect(String(storedDog?.photo)).toMatch(/^file:/)
    expect(JSON.stringify(storedDog)).not.toContain('data:')
    expect(JSON.stringify(storedVisit)).not.toContain('data:')
    const files = fs.store.get('salon/shared/files')
    expect(files?.size).toBe(3)
    const owners = [...(files?.values() ?? [])].map((item) => item.owner).sort()
    expect(owners).toEqual([`appointment:${appointment.id}`, `dog:${dog.id}`, `dog:${dog.id}`])
    expect(fs.uploads).toHaveLength(0)
  })

  it('togliere una foto dalla galleria la cancella da files e un’altra copia non la rimette', async () => {
    const dog = createDog('fb-1', dogWrite('Birba'))
    await client.saveDog('fb-1', {
      ...dog,
      gallery: [
        { id: 'g1', photo: 'data:image/jpeg;base64,QQ==', takenAt: new Date('2026-03-01T00:00:00.000Z') },
        { id: 'g2', photo: 'data:image/jpeg;base64,Qg==', takenAt: new Date('2026-03-02T00:00:00.000Z') },
      ],
    })
    const saved = fs.store.get('salon/shared/dogs')?.get(dog.id) as { gallery: Array<{ id: string; photo: string }> }
    const keep = saved.gallery.find((item) => item.id === 'g2')!
    const gone = saved.gallery.find((item) => item.id === 'g1')!
    await client.saveDog('fb-1', { ...dog, photo: undefined, gallery: [{ id: 'g2', photo: keep.photo, takenAt: new Date('2026-03-02T00:00:00.000Z') }], removedPhotoIds: ['g1'] })
    const after = fs.store.get('salon/shared/dogs')?.get(dog.id) as { gallery: Array<{ id: string }> }
    expect(after.gallery.map((item) => item.id)).toEqual(['g2'])
    expect(fs.store.get('salon/shared/files')?.has(gone.photo.slice(5))).toBe(false)
    await client.saveDog('fb-1', { ...dog, photo: undefined, gallery: [] })
    const stale = fs.store.get('salon/shared/dogs')?.get(dog.id) as { gallery: Array<{ id: string }> }
    expect(stale.gallery.map((item) => item.id)).toEqual(['g2'])
  })

  it('un file del listino si salva in files e le impostazioni tengono file:{id}', async () => {
    const settings = blankSettings('auto', '2026-10-13T00:00:00.000Z')
    await client.saveSettings('fb-1', {
      ...settings,
      priceList: { id: 'pf1', fileName: 'listino.pdf', mime: 'application/pdf', byteSize: 3, uploadedAt: '2026-10-13T00:00:00.000Z', dataUrl: 'data:application/pdf;base64,QUJD' },
    }, true)
    const stored = fs.store.get('salon/shared/settings')?.get('main') as { priceList: { dataUrl: string } }
    expect(stored.priceList.dataUrl).toMatch(/^file:/)
    expect(fs.store.get('salon/shared/files')?.get(stored.priceList.dataUrl.slice(5))).toMatchObject({ owner: 'listino', kind: 'file', name: 'listino.pdf' })
  })

  it('il logo del listino per razza si salva in files come foto', async () => {
    const settings = blankSettings('auto', '2026-10-13T00:00:00.000Z')
    const sheet = seedPriceSheet(settings.business)
    await client.saveSettings('fb-1', {
      ...settings,
      priceSheet: { ...sheet, intestazione: { ...sheet.intestazione, logo: 'data:image/png;base64,QQ==' } },
    }, true)
    const stored = fs.store.get('salon/shared/settings')?.get('main') as { priceSheet: { intestazione: { logo: string } } }
    expect(stored.priceSheet.intestazione.logo).toMatch(/^file:/)
    expect(fs.store.get('salon/shared/files')?.get(stored.priceSheet.intestazione.logo.slice(5))).toMatchObject({ owner: 'listino', kind: 'foto' })
  })

  it('all’avvio le foto data: di appuntamenti e listino salgono in files', async () => {
    const dog = createDog('fb-1', dogWrite('Birba'))
    const appointment = createAppointment('fb-1', {
      dogId: dog.id,
      start: new Date('2026-10-03T09:30:00.000Z'),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const visits = JSON.parse(localStorage.getItem(storageKeys.appointments('fb-1')) ?? '{}') as Record<string, Record<string, unknown>>
    visits[appointment.id] = { ...visits[appointment.id], photos: [{ id: 'p1', photo: 'data:image/jpeg;base64,Qw==', kind: 'prima' }] }
    localStorage.setItem(storageKeys.appointments('fb-1'), JSON.stringify(visits))
    const settings = blankSettings('auto', '2026-10-13T00:00:00.000Z')
    localStorage.setItem(storageKeys.settings('fb-1'), JSON.stringify({
      ...settings,
      priceList: { id: 'pf1', fileName: 'l.pdf', mime: 'application/pdf', byteSize: 3, uploadedAt: '2026-10-13T00:00:00.000Z', dataUrl: 'data:application/pdf;base64,QUJD' },
    }))
    await client.resaveLocalMedia('fb-1')
    const storedVisit = fs.store.get('salon/shared/appointments')?.get(appointment.id)
    const storedSettings = fs.store.get('salon/shared/settings')?.get('main')
    expect(JSON.stringify(storedVisit)).toContain('file:')
    expect(JSON.stringify(storedVisit)).not.toContain('data:')
    expect(JSON.stringify(storedSettings)).not.toContain('data:')
    expect(fs.store.get('salon/shared/files')?.size).toBe(2)
  })

  it('all’avvio un listino locale più vecchio aggiunge solo il file e non sovrascrive il salone', async () => {
    fs.store.set('salon/shared/settings', new Map([['main', {
      ...blankSettings('auto', '2026-10-13T12:00:00.000Z'),
      business: { name: 'Salone nuovo', vatNumber: '', phone: '', address: '' },
    }]]))
    localStorage.setItem(storageKeys.settings('fb-1'), JSON.stringify({
      ...blankSettings('auto', '2026-10-13T08:00:00.000Z'),
      business: { name: 'Vecchio', vatNumber: '', phone: '', address: '' },
      priceList: { id: 'pf1', fileName: 'l.pdf', mime: 'application/pdf', byteSize: 3, uploadedAt: '2026-10-13T08:00:00.000Z', dataUrl: 'data:application/pdf;base64,QUJD' },
    }))
    await client.resaveLocalMedia('fb-1')
    const stored = fs.store.get('salon/shared/settings')?.get('main') as { business: { name: string }; priceList: { id: string; dataUrl: string } }
    expect(stored.business.name).toBe('Salone nuovo')
    expect(stored.priceList.id).toBe('pf1')
    expect(stored.priceList.dataUrl).toMatch(/^file:/)
  })

  it('all’avvio un appuntamento locale più vecchio aggiunge solo la foto e non sovrascrive il salone', async () => {
    const dog = createDog('fb-1', dogWrite('Birba'))
    const appointment = createAppointment('fb-1', {
      dogId: dog.id,
      start: new Date('2026-10-03T09:30:00.000Z'),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const visits = JSON.parse(localStorage.getItem(storageKeys.appointments('fb-1')) ?? '{}') as Record<string, Record<string, unknown>>
    visits[appointment.id] = {
      ...visits[appointment.id],
      total: 30,
      updatedAt: '2026-10-13T08:00:00.000Z',
      photos: [{ id: 'p1', photo: 'data:image/jpeg;base64,Qw==', kind: 'prima' }],
    }
    localStorage.setItem(storageKeys.appointments('fb-1'), JSON.stringify(visits))
    fs.store.set('salon/shared/appointments', new Map([[appointment.id, {
      id: appointment.id,
      dogId: dog.id,
      start: Date.parse('2026-10-03T09:30:00.000Z'),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
      status: 'prenotato',
      createdAt: Date.parse('2026-10-01T00:00:00.000Z'),
      updatedAt: Date.parse('2026-10-13T12:00:00.000Z'),
      total: 50,
    }]]))
    await client.resaveLocalMedia('fb-1')
    const stored = fs.store.get('salon/shared/appointments')?.get(appointment.id) as { total: number; photos: Array<{ id: string; photo: string }> }
    expect(stored.total).toBe(50)
    expect(stored.photos.map((item) => item.id)).toEqual(['p1'])
    expect(stored.photos[0].photo).toMatch(/^file:/)
  })

  it('cancellare un cane cancella i file suoi e dei suoi appuntamenti', async () => {
    const dog = createDog('fb-1', dogWrite('Birba'))
    const appointment = createAppointment('fb-1', {
      dogId: dog.id,
      start: new Date('2026-10-03T09:30:00.000Z'),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    await client.saveDog('fb-1', { ...dog, photo: 'data:image/jpeg;base64,QQ==' })
    await client.saveAppointment('fb-1', { ...appointment, photos: [{ id: 'p1', photo: 'data:image/jpeg;base64,Qw==', kind: 'prima' }] })
    expect(fs.store.get('salon/shared/files')?.size).toBe(2)
    await client.removeDog('fb-1', dog.id)
    expect(fs.store.get('salon/shared/files')?.size ?? 0).toBe(0)
  })

  it('ritratto uguale alla prima foto della galleria scrive un solo file', async () => {
    const dog = createDog('fb-1', dogWrite('Birba'))
    await client.saveDog('fb-1', {
      ...dog,
      photo: 'data:image/jpeg;base64,QQ==',
      gallery: [{ id: 'g1', photo: 'data:image/jpeg;base64,QQ==', takenAt: new Date('2026-03-01T00:00:00.000Z') }],
    })
    expect(fs.store.get('salon/shared/files')?.size).toBe(1)
    const stored = fs.store.get('salon/shared/dogs')?.get(dog.id) as { photo: string; gallery: Array<{ photo: string }> }
    expect(stored.gallery[0].photo).toBe(stored.photo)
  })

  it('una foto nuova già tolta non viene scritta in files', async () => {
    const dog = createDog('fb-1', dogWrite('Birba'))
    const appointment = createAppointment('fb-1', {
      dogId: dog.id,
      start: new Date('2026-10-03T09:30:00.000Z'),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    await client.saveDog('fb-1', {
      ...dog,
      gallery: [{ id: 'g1', photo: 'data:image/jpeg;base64,QQ==', takenAt: new Date('2026-03-01T00:00:00.000Z') }],
      removedPhotoIds: ['g1'],
    })
    await client.saveAppointment('fb-1', {
      ...appointment,
      photos: [{ id: 'p1', photo: 'data:image/jpeg;base64,Qw==', kind: 'prima' }],
      removedPhotoIds: ['p1'],
    })
    expect(fs.store.get('salon/shared/files')?.size ?? 0).toBe(0)
    expect(fs.store.get('salon/shared/dogs')?.get(dog.id)?.gallery).toEqual([])
    expect(fs.store.get('salon/shared/appointments')?.get(appointment.id)?.photos).toEqual([])
  })

  async function dogWithProfileFile(updatedAt: Date) {
    const dog = createDog('fb-1', dogWrite('Birba'))
    await client.saveDog('fb-1', { ...dog, photo: 'data:image/jpeg;base64,QQ==', updatedAt })
    const ref = String(fs.store.get('salon/shared/dogs')?.get(dog.id)?.photo)
    return { dog, id: ref.slice(5) }
  }

  it('una copia più vecchia con un altro ritratto non cancella il file del ritratto nuovo', async () => {
    const { dog, id } = await dogWithProfileFile(new Date('2026-10-13T10:00:00.000Z'))
    await client.saveDog('fb-1', { ...dog, photo: 'file:vecchio', updatedAt: new Date('2026-10-13T09:00:00.000Z') })
    expect(fs.store.get('salon/shared/files')?.has(id)).toBe(true)
  })

  it('una copia più nuova con un altro ritratto cancella il file del ritratto vecchio', async () => {
    const { dog, id } = await dogWithProfileFile(new Date('2026-10-13T10:00:00.000Z'))
    await client.saveDog('fb-1', { ...dog, photo: 'file:nuovo', updatedAt: new Date('2026-10-13T11:00:00.000Z') })
    expect(fs.store.get('salon/shared/files')?.has(id)).toBe(false)
  })

  function cloudDog(id: string, extra: Record<string, unknown> = {}) {
    const doc = {
      id,
      name: 'Nuovo',
      species: 'cane',
      createdAt: Date.parse('2026-10-01T00:00:00.000Z'),
      updatedAt: Date.parse('2026-10-13T12:00:00.000Z'),
      gallery: [],
      ...extra,
    }
    fs.store.set('salon/shared/dogs', new Map([[id, doc]]))
    return doc
  }

  it('una copia più vecchia del cane non sovrascrive il nome e aggiunge solo la foto mancante', async () => {
    const dog = createDog('fb-1', dogWrite('Vecchio'))
    cloudDog(dog.id)
    await client.saveDog('fb-1', {
      ...dog,
      updatedAt: new Date('2026-10-13T08:00:00.000Z'),
      gallery: [{ id: 'g9', photo: 'data:image/jpeg;base64,QQ==', takenAt: new Date('2026-03-01T00:00:00.000Z') }],
    })
    const stored = fs.store.get('salon/shared/dogs')?.get(dog.id) as { name: string; updatedAt: number; gallery: Array<{ id: string; photo: string }> }
    expect(stored.name).toBe('Nuovo')
    expect(stored.updatedAt).toBe(Date.parse('2026-10-13T12:00:00.000Z'))
    expect(stored.gallery.map((item) => item.id)).toEqual(['g9'])
    expect(stored.gallery[0].photo).toMatch(/^file:/)
    expect(fs.store.get('salon/shared/files')?.size).toBe(1)
  })

  it('una copia più vecchia del cane non rimette una foto già tolta dal salone', async () => {
    const dog = createDog('fb-1', dogWrite('Vecchio'))
    const before = cloudDog(dog.id, { removedPhotoIds: ['g9'] })
    const snapshot = JSON.parse(JSON.stringify(before)) as Record<string, unknown>
    await client.saveDog('fb-1', {
      ...dog,
      updatedAt: new Date('2026-10-13T08:00:00.000Z'),
      gallery: [{ id: 'g9', photo: 'data:image/jpeg;base64,QQ==', takenAt: new Date('2026-03-01T00:00:00.000Z') }],
    })
    expect(fs.store.get('salon/shared/files')?.size ?? 0).toBe(0)
    expect(fs.store.get('salon/shared/dogs')?.get(dog.id)).toEqual(snapshot)
  })

  it('un appuntamento più vecchio salvato non sovrascrive il totale e aggiunge la foto', async () => {
    const dog = createDog('fb-1', dogWrite('Birba'))
    const appointment = createAppointment('fb-1', {
      dogId: dog.id,
      start: new Date('2026-10-03T09:30:00.000Z'),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    fs.store.set('salon/shared/appointments', new Map([[appointment.id, {
      id: appointment.id,
      dogId: dog.id,
      start: Date.parse('2026-10-03T09:30:00.000Z'),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
      status: 'prenotato',
      createdAt: Date.parse('2026-10-01T00:00:00.000Z'),
      updatedAt: Date.parse('2026-10-13T12:00:00.000Z'),
      total: 50,
    }]]))
    await client.saveAppointment('fb-1', {
      ...appointment,
      total: 30,
      updatedAt: new Date('2026-10-13T08:00:00.000Z'),
      photos: [{ id: 'p1', photo: 'data:image/jpeg;base64,Qw==', kind: 'prima' }],
    })
    const stored = fs.store.get('salon/shared/appointments')?.get(appointment.id) as { total: number; photos: Array<{ id: string; photo: string }> }
    expect(stored.total).toBe(50)
    expect(stored.photos.map((item) => item.id)).toEqual(['p1'])
    expect(stored.photos[0].photo).toMatch(/^file:/)
  })

  it('una copia più vecchia senza foto mancanti non scrive niente', async () => {
    const dog = createDog('fb-1', dogWrite('Vecchio'))
    const before = cloudDog(dog.id, { gallery: [{ id: 'g1', photo: 'file:g1', takenAt: Date.parse('2026-03-01T00:00:00.000Z') }] })
    const snapshot = JSON.parse(JSON.stringify(before)) as Record<string, unknown>
    fs.writes.length = 0
    await client.saveDog('fb-1', {
      ...dog,
      updatedAt: new Date('2026-10-13T08:00:00.000Z'),
      gallery: [{ id: 'g1', photo: 'data:image/jpeg;base64,QQ==', takenAt: new Date('2026-03-01T00:00:00.000Z') }],
    })
    expect(fs.writes.filter((item) => item.path.startsWith('salon/shared/dogs/'))).toHaveLength(0)
    expect(fs.store.get('salon/shared/dogs')?.get(dog.id)).toEqual(snapshot)
    expect(fs.store.get('salon/shared/files')?.size ?? 0).toBe(0)
  })

  it('impostazioni più vecchie senza listino non cancellano il file del listino', async () => {
    await client.saveSettings('fb-1', {
      ...blankSettings('auto', '2026-10-13T10:00:00.000Z'),
      priceList: { id: 'pf1', fileName: 'listino.pdf', mime: 'application/pdf', byteSize: 3, uploadedAt: '2026-10-13T10:00:00.000Z', dataUrl: 'data:application/pdf;base64,QUJD' },
    }, true)
    const ref = (fs.store.get('salon/shared/settings')?.get('main') as { priceList: { dataUrl: string } }).priceList.dataUrl
    await client.saveSettings('fb-1', blankSettings('auto', '2026-10-13T09:00:00.000Z'))
    expect(fs.store.get('salon/shared/settings')?.get('main')?.priceList).toBeUndefined()
    expect(fs.store.get('salon/shared/files')?.has(ref.slice(5))).toBe(true)
  })

  it('se il caricamento della foto fallisce non sostituisce la foto precedente', async () => {
    const dog = createDog('fb-1', dogWrite('Birba'))
    seedCloud('salon/shared/dogs', dog.id)
    fs.store.get('salon/shared/dogs')?.set(dog.id, { id: dog.id, name: 'Birba', photo: 'https://example.test/old.jpg' })
    fs.batchFail = true
    await expect(client.saveDog('fb-1', { ...dog, name: 'Nuova', photo: 'data:image/jpeg;base64,QQ==' })).rejects.toBeTruthy()
    expect(fs.store.get('salon/shared/dogs')?.get(dog.id)).toMatchObject({
      name: 'Birba',
      photo: 'https://example.test/old.jpg',
    })
  })
})
