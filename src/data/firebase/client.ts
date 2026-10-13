/**
 * Passi da eseguire a mano. Questo task non crea il progetto, non esegue
 * `firebase login` e non fa il deploy.
 *
 * 1. Creare un progetto su console.firebase.google.com.
 * 2. Authentication → email/password → attiva.
 * 3. Creare Firestore in modalità produzione.
 * 4. Storage serve solo al backup giornaliero.
 * 5. Copiare la config in `.env.local` come `VITE_FIREBASE_API_KEY`,
 *    `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
 *    `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`,
 *    `VITE_FIREBASE_APP_ID`.
 * 6. `npx firebase deploy --only firestore:rules,firestore:indexes,hosting`
 *    dopo `firebase login`.
 */
import type { FirebaseApp } from 'firebase/app'
import type { Auth, User } from 'firebase/auth'
import type { DocumentData, Firestore, UpdateData } from 'firebase/firestore'
import type { FirebaseStorage } from 'firebase/storage'
import { getAccount, type LocalAccount } from '../local/auth'
import { forgetLocalAppointments, listAppointments } from '../local/appointments'
import { listDogs, forgetLocalDog } from '../local/dogs'
import { listServices } from '../local/services'
import { getSettings, blankSettings, type PriceFile, type SettingsMain } from '../local/settings'
import { storageKeys } from '../local/storage'
import { AppError } from '../errors'
import { SERVICE_SEED } from '../seed/services'
import { shouldFallbackToSignIn } from '../../lib/authAction'
import { backupDay, dailyBackupDue, isEmptyBackup, readRestoreBundle, type BackupBundle } from '../../lib/backupDoc'
import { isFileRef } from '../../lib/fileBytes'
import { verifyPassword } from '../../lib/password'
import {
  appointmentFromDoc,
  appointmentToDoc,
  dogFromDoc,
  dogToDoc,
  serviceFromDoc,
  serviceToDoc,
  settingsFromDoc,
  settingsToDoc,
  storagePaths,
} from '../../lib/firebaseMap'
import type { Appointment, Dog, Service } from '../../types/models'
import {
  firebaseEnabled,
  isCloudReady,
  isSalonMirror,
  localDataUid,
  localDataUids,
  markCloudReady,
  notifySaveFailed,
} from './enabled'
import { createFileStore, type FileOwner, type FileStore, type FileVariant } from './files'
import { appointmentsToLocalMap, dogsToLocalMap, servicesToLocalMap, withLocalKey } from './localSeed'
import { createUploadQueue } from './taskQueue'
import { shouldSeedServices } from '../../lib/salonListen'
import {
  filterAppointments,
  filterDogs,
  mergeTombstone,
  readDeletion,
  readTombstone,
  rememberDeletion,
  tombstoneRejectsAppointment,
  tombstoneRejectsDog,
  type Tombstone,
} from '../../lib/tombstone'
import { backupLastAtPatch } from '../../lib/uploadPatch'

export { firebaseEnabled } from './enabled'

let appPromise: Promise<FirebaseApp> | null = null
let authPromise: Promise<Auth> | null = null
let dbPromise: Promise<Firestore> | null = null
let storagePromise: Promise<FirebaseStorage> | null = null
let knownUid: string | null = null
let migrationTask: Promise<boolean> | null = null
let cloudReplaceDepth = 0
let shareTask: Promise<void> | null = null
let shareUid: string | null = null

function sharedPath(kind: string, id: string): string[] {
  return ['salon', 'shared', kind, id]
}

// Coda solo in memoria: un refresh la perde e non aggiunge chiavi localStorage.
// Un upload fallito chiama notifySaveFailed («Salvataggio non riuscito»).
const uploadQueue = createUploadQueue(() => {
  notifySaveFailed()
})

function firebaseConfig() {
  const env = import.meta.env as Record<string, string | undefined>
  return {
    apiKey: env.VITE_FIREBASE_API_KEY ?? '',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: env.VITE_FIREBASE_APP_ID ?? '',
  }
}

function firebaseCode(error: unknown): string {
  if (!error || typeof error !== 'object' || !('code' in error)) return ''
  return String((error as { code: unknown }).code)
}

function mapAuthError(error: unknown): AppError {
  const code = firebaseCode(error)
  if (code === 'auth/network-request-failed' && !knownUid) {
    return new AppError('Connessione assente', 'auth_offline')
  }
  if (code === 'auth/invalid-credential') {
    return new AppError('Email o password non corretti', 'auth_invalid')
  }
  if (code === 'auth/email-already-in-use') {
    return new AppError('Account già presente', 'auth_exists')
  }
  if (error instanceof AppError) return error
  return new AppError('Email o password non corretti', 'auth_invalid')
}

async function firebaseApp(): Promise<FirebaseApp> {
  if (!appPromise) {
    appPromise = (async () => {
      const { getApps, initializeApp } = await import('firebase/app')
      return getApps()[0] ?? initializeApp(firebaseConfig())
    })().catch((error: unknown) => {
      appPromise = null
      throw error
    })
  }
  return appPromise
}

async function auth(): Promise<Auth> {
  if (!authPromise) {
    authPromise = (async () => {
      const { getAuth } = await import('firebase/auth')
      return getAuth(await firebaseApp())
    })().catch((error: unknown) => {
      authPromise = null
      throw error
    })
  }
  return authPromise
}

let firestoreNs: Promise<typeof import('firebase/firestore')> | null = null

function loadFirestore(): Promise<typeof import('firebase/firestore')> {
  if (!firestoreNs) {
    firestoreNs = import('firebase/firestore').catch((error: unknown) => {
      firestoreNs = null
      throw error
    })
  }
  return firestoreNs
}

async function database(): Promise<Firestore> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const app = await firebaseApp()
      const { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } = await loadFirestore()
      try {
        return initializeFirestore(app, {
          localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
        })
      } catch {
        return getFirestore(app)
      }
    })().catch((error: unknown) => {
      dbPromise = null
      throw error
    })
  }
  return dbPromise
}

async function bucket(): Promise<FirebaseStorage> {
  if (!storagePromise) {
    storagePromise = (async () => {
      const { getStorage } = await import('firebase/storage')
      return getStorage(await firebaseApp())
    })().catch((error: unknown) => {
      storagePromise = null
      throw error
    })
  }
  return storagePromise
}

let filesPromise: Promise<FileStore> | null = null

async function fileStore(): Promise<FileStore> {
  if (!filesPromise) {
    filesPromise = (async () => {
      const fs = await loadFirestore()
      const { photoFromDataUrl } = await import('../../lib/photoCodec')
      return createFileStore(fs, await database(), { fromDataUrl: photoFromDataUrl })
    })().catch((error: unknown) => {
      filesPromise = null
      throw error
    })
  }
  return filesPromise
}

async function storeFile(owner: FileOwner, kind: 'foto' | 'file', dataUrl: string, name = ''): Promise<string> {
  const createdBy = knownUid ?? (await auth()).currentUser?.uid ?? ''
  return (await fileStore()).write({ owner, kind, dataUrl, name, createdBy })
}

export async function readStoredFile(ref: string, variant: FileVariant): Promise<{ bytes: Uint8Array; mime: string }> {
  return (await fileStore()).read(ref, variant)
}

async function dropFiles(refs: Iterable<string>): Promise<void> {
  const doomed = [...new Set(refs)].filter(isFileRef)
  if (doomed.length === 0) return
  const store = await fileStore()
  await Promise.all(doomed.map((ref) => store.remove(ref).catch(() => undefined)))
}

function enqueueTask(task: () => Promise<void>): void {
  uploadQueue.enqueue(task)
}

// La promessa resta aperta se il tentativo fallisce: il toast è onFail della coda,
// e un rifiuto qui farebbe suonare di nuovo notifySaveFailed nel catch del hook.
function enqueueFirstTask(task: () => Promise<void>): Promise<void> {
  return new Promise((resolve) => {
    uploadQueue.enqueueFirst(() => task().then(() => {
      resolve()
    }))
  })
}

function containsDataUrl(value: unknown): boolean {
  if (typeof value === 'string') return value.startsWith('data:')
  if (Array.isArray(value)) return value.some(containsDataUrl)
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(containsDataUrl)
  }
  return false
}

function containsNonImageDataUrl(value: unknown): boolean {
  if (typeof value === 'string') return value.startsWith('data:') && !value.startsWith('data:image/')
  if (Array.isArray(value)) return value.some(containsNonImageDataUrl)
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(containsNonImageDataUrl)
  }
  return false
}

function isDataUrl(value: string | undefined): value is string {
  return typeof value === 'string' && value.startsWith('data:')
}

async function readDoc(path: string[], fromServer = false): Promise<Record<string, unknown> | null> {
  const { doc, getDoc } = await loadFirestore()
  const ref = doc(await database(), path[0], ...path.slice(1))
  const read = getDoc as (target: typeof ref, options?: { source: 'server' }) => ReturnType<typeof getDoc>
  const snap = await read(ref, fromServer ? { source: 'server' } : undefined)
  if (!snap.exists()) return null
  return snap.data() as Record<string, unknown>
}

function updatedMillis(data: Record<string, unknown>): number {
  const value = data.updatedAt
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function withoutDataUrls(value: unknown): unknown {
  if (typeof value === 'string') {
    if (value.startsWith('data:') && !value.startsWith('data:image/')) return undefined
    return value
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const next = withoutDataUrls(item)
      return next === undefined ? [] : [next]
    })
  }
  if (value && typeof value === 'object') {
    const next: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = withoutDataUrls(item)
      if (cleaned !== undefined) next[key] = cleaned
    }
    return next
  }
  return value
}

function copyableDoc(data: Record<string, unknown>): Record<string, unknown> {
  const next = withoutDataUrls(data) as Record<string, unknown>
  delete next.passwordHash
  if (next.backup && typeof next.backup === 'object' && !Array.isArray(next.backup)) {
    const backup = { ...(next.backup as Record<string, unknown>) }
    delete backup.snapshot
    next.backup = backup
  }
  return next
}

function serviceMatchesSeed(id: string, data: Record<string, unknown>): boolean {
  const seed = SERVICE_SEED.find((item) => item.id === id)
  if (!seed || data.name !== seed.name) return false
  const price = data.price
  if (!price || typeof price !== 'object') return false
  const record = price as Record<string, unknown>
  return record.piccola === seed.price.piccola && record.media === seed.price.media && record.grande === seed.price.grande
}

function settingsBlank(data: Record<string, unknown>): boolean {
  const business = data.business
  const name = business && typeof business === 'object' ? (business as { name?: unknown }).name : ''
  const history = Array.isArray(data.priceListHistory) ? data.priceListHistory.length : 0
  return (typeof name !== 'string' || name.trim() === '') && !data.priceList && history === 0
}

function shouldCopy(kind: string, id: string, incoming: Record<string, unknown>, current: Record<string, unknown> | null): boolean {
  if (!current) return true
  if (kind === 'services' && serviceMatchesSeed(id, current) && !serviceMatchesSeed(id, incoming)) return true
  if (kind === 'settings' && settingsBlank(current) && !settingsBlank(incoming)) return true
  return updatedMillis(current) < updatedMillis(incoming)
}

async function deletedDogIds(): Promise<Set<string>> {
  const data = await readDoc(sharedPath('meta', 'deleted-dogs'), true)
  const ids = Array.isArray(data?.ids) ? data.ids : []
  return new Set(ids.filter((item): item is string => typeof item === 'string'))
}

async function copyUserKind(uid: string, kind: 'dogs' | 'appointments' | 'services'): Promise<void> {
  const { collection, getDocs } = await loadFirestore()
  const db = await database()
  const readDocs = getDocs as (target: ReturnType<typeof collection>, options?: { source: 'server' }) => ReturnType<typeof getDocs>
  const snap = await readDocs(collection(db, 'users', uid, kind), { source: 'server' })
  const stone = kind === 'dogs' || kind === 'appointments'
    ? mergeTombstone(readDeletion(), readTombstone(await readDoc(sharedPath('meta', 'deleted-dogs'), true)))
    : null
  for (const item of snap.docs) {
    const data = item.data() as Record<string, unknown>
    const dogId = typeof data.dogId === 'string' ? data.dogId : ''
    const droppedDog = stone
      ? (kind === 'dogs' ? tombstoneRejectsDog(stone, item.id) : tombstoneRejectsAppointment(stone, item.id, dogId))
      : false
    if (droppedDog) continue
    const kept = copyableDoc(data)
    const current = await readDoc(sharedPath(kind, item.id), true)
    if (current) continue
    const ready = kind === 'dogs'
      ? await liftDogDoc(uid, item.id, kept)
      : kind === 'appointments'
        ? await liftVisitDoc(uid, item.id, kept)
        : kept
    if (containsDataUrl(ready)) throw new AppError('Salvataggio non riuscito', 'storage_write')
    await putDoc(sharedPath(kind, item.id), ready)
  }
}

async function copyUserSettings(uid: string): Promise<void> {
  const data = await readDoc(['users', uid, 'settings', 'main'], true)
  if (!data) return
  const incoming = copyableDoc(data)
  delete incoming.theme
  const current = await readDoc(sharedPath('settings', 'main'), true)
  if (current && !settingsBlank(current)) return
  if (!shouldCopy('settings', 'main', incoming, current)) return
  await putDoc(sharedPath('settings', 'main'), incoming)
}

function asRecords(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
}

function unionById(primary: unknown, extra: unknown, removed: ReadonlySet<string>): Record<string, unknown>[] {
  const first = asRecords(primary).filter((item) => !removed.has(String(item.id ?? '')))
  const ids = new Set(first.map((item) => String(item.id ?? '')))
  return [...first, ...asRecords(extra).filter((item) => {
    const id = String(item.id ?? '')
    return !ids.has(id) && !removed.has(id)
  })]
}

function removedIds(...docs: Array<Record<string, unknown> | null>): string[] {
  const ids = docs.flatMap((doc) => (Array.isArray(doc?.removedPhotoIds) ? doc.removedPhotoIds : []))
  return [...new Set(ids.filter((id): id is string => typeof id === 'string'))]
}

function mediaRefs(doc: Record<string, unknown> | null): string[] {
  if (!doc) return []
  const refs: string[] = []
  if (isFileRef(doc.photo)) refs.push(doc.photo)
  for (const item of [...asRecords(doc.gallery), ...asRecords(doc.photos)]) {
    if (isFileRef(item.photo)) refs.push(item.photo)
  }
  return refs
}

function priceRefs(doc: Record<string, unknown> | null): string[] {
  if (!doc) return []
  const files = [...(doc.priceList && typeof doc.priceList === 'object' ? [doc.priceList as Record<string, unknown>] : []), ...asRecords(doc.priceListHistory)]
  return files.map((file) => file.dataUrl).filter(isFileRef)
}

async function withKeptMedia(path: string[], data: Record<string, unknown>, fields: Array<'photo' | 'gallery' | 'photos'>): Promise<{ next: Record<string, unknown>; dropped: string[] }> {
  const current = await readDoc(path)
  if (!current) return { next: data, dropped: [] }
  const removedList = removedIds(data, current)
  const removed = new Set(removedList)
  const next = { ...data }
  if (removedList.length > 0) next.removedPhotoIds = removedList
  if (fields.includes('photo') && (typeof next.photo !== 'string' || next.photo.length === 0) && typeof current.photo === 'string') {
    next.photo = current.photo
  }
  if (fields.includes('gallery')) {
    next.gallery = unionById(next.gallery, current.gallery, removed)
    const droppedGallery = new Set(asRecords(current.gallery).filter((item) => removed.has(String(item.id ?? ''))).map((item) => item.photo))
    const stillShown = new Set(asRecords(next.gallery).map((item) => item.photo))
    if (fields.includes('photo') && droppedGallery.has(next.photo) && !stillShown.has(next.photo)) delete next.photo
  }
  if (fields.includes('photos')) next.photos = unionById(next.photos, current.photos, removed)
  const kept = new Set(mediaRefs(next))
  const explicit = new Set([...asRecords(current.gallery), ...asRecords(current.photos)]
    .filter((item) => removed.has(String(item.id ?? '')))
    .map((item) => item.photo))
  const fresh = !isStaleWrite(data, current)
  return { next, dropped: mediaRefs(current).filter((ref) => !kept.has(ref) && (fresh || explicit.has(ref))) }
}

function isStaleWrite(incoming: Record<string, unknown>, current: Record<string, unknown> | null, iso = false): boolean {
  const at = (data: Record<string, unknown>): number | null => {
    const value = data.updatedAt
    if (iso) return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null
    return typeof value === 'number' && Number.isFinite(value) ? value : null
  }
  const before = current ? at(current) : null
  if (before === null) return false
  return (at(incoming) ?? 0) < before
}

async function restoreAccount(uid: string): Promise<void> {
  await putDoc(sharedPath('members', uid), { uid, at: Date.now() })
  const marker = await readDoc(sharedPath('meta', `restored-${uid}`), true)
  if (marker?.done !== true) {
    await copyUserKind(uid, 'dogs')
    await copyUserKind(uid, 'appointments')
    await copyUserKind(uid, 'services')
    await copyUserSettings(uid)
    await putDoc(sharedPath('meta', `restored-${uid}`), { done: true, at: Date.now() })
  }
}

async function replayLocalDeletion(): Promise<void> {
  const pending = readDeletion()
  if (pending.ids.length === 0 && pending.appointmentIds.length === 0) return
  const task = async () => {
    const local = readDeletion()
    if (local.ids.length === 0 && local.appointmentIds.length === 0) return
    const cloud = readTombstone(await readDoc(sharedPath('meta', 'deleted-dogs'), true))
    const dogIds = local.ids.filter((id) => !cloud.ids.includes(id))
    const visitIds = local.appointmentIds.filter((id) => !cloud.appointmentIds.includes(id))
    if (dogIds.length === 0 && visitIds.length === 0) return
    const { collection, deleteDoc, doc, getDocs } = await loadFirestore()
    const db = await database()
    const found: string[] = []
    if (dogIds.length > 0) {
      const snap = await getDocs(collection(db, 'salon', 'shared', 'appointments'))
      for (const item of snap.docs) {
        const dogId = (item.data() as { dogId?: unknown }).dogId
        if (typeof dogId === 'string' && dogIds.includes(dogId) && !visitIds.includes(item.id) && !cloud.appointmentIds.includes(item.id)) {
          found.push(item.id)
        }
      }
    }
    const appointmentIds = [...visitIds, ...found]
    await writeDeletionSign(dogIds, appointmentIds)
    await Promise.all([
      ...dogIds.map((id) => deleteDoc(doc(db, 'salon', 'shared', 'dogs', id))),
      ...appointmentIds.map((id) => deleteDoc(doc(db, 'salon', 'shared', 'appointments', id))),
    ])
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    void enqueueFirstTask(task)
    return
  }
  await enqueueFirstTask(task)
}

function ensureShared(uid: string): Promise<void> {
  if (shareTask && shareUid === uid) return shareTask
  shareUid = uid
  shareTask = restoreAccount(uid).then(() => replayLocalDeletion()).then(() => {
    void resaveLocalMedia(uid).catch(() => undefined)
  }).catch((error: unknown) => {
    shareTask = null
    shareUid = null
    throw error
  })
  return shareTask
}

async function writeUploadPatch(path: string[], patch: Record<string, unknown>): Promise<void> {
  if (Object.keys(patch).length === 0) return
  if (containsDataUrl(patch)) throw new AppError('Salvataggio non riuscito', 'storage_write')
  const { doc, updateDoc } = await loadFirestore()
  await updateDoc(doc(await database(), path[0], ...path.slice(1)), patch as UpdateData<DocumentData>)
}

async function putDoc(path: string[], data: Record<string, unknown>): Promise<void> {
  if (containsNonImageDataUrl(data)) throw new AppError('Salvataggio non riuscito', 'storage_write')
  const { doc, setDoc } = await loadFirestore()
  await setDoc(doc(await database(), path[0], ...path.slice(1)), data)
}

async function writeDeletionSign(ids: string[], appointmentIds: string[]): Promise<void> {
  const { arrayUnion, doc, setDoc } = await loadFirestore()
  const data: Record<string, unknown> = {}
  const dogIds = [...new Set(ids)]
  const visitIds = [...new Set(appointmentIds)]
  if (dogIds.length > 0) data.ids = arrayUnion(...dogIds)
  if (visitIds.length > 0) data.appointmentIds = arrayUnion(...visitIds)
  if (Object.keys(data).length === 0) return
  await setDoc(doc(await database(), 'salon', 'shared', 'meta', 'deleted-dogs'), data, { merge: true })
}

function photoSaver(owner: FileOwner): (dataUrl: string) => Promise<string> {
  const saved = new Map<string, string>()
  return async (dataUrl) => {
    const known = saved.get(dataUrl)
    if (known) return known
    const ref = await storeFile(owner, 'foto', dataUrl)
    saved.set(dataUrl, ref)
    return ref
  }
}

async function uploadDogMedia(_uid: string, dog: Dog): Promise<Dog> {
  const save = photoSaver(`dog:${dog.id}`)
  const removed = new Set(dog.removedPhotoIds ?? [])
  const photo = isDataUrl(dog.photo) ? await save(dog.photo) : dog.photo
  const gallery = []
  for (const item of dog.gallery) {
    if (removed.has(item.id)) continue
    const next = isDataUrl(item.photo) ? await save(item.photo) : item.photo
    gallery.push({ ...item, photo: next })
  }
  return { ...dog, photo, gallery }
}

async function uploadAppointmentMedia(_uid: string, appointment: Appointment): Promise<Appointment> {
  const photos = appointment.photos ?? []
  if (photos.length === 0) return appointment
  const removed = new Set(appointment.removedPhotoIds ?? [])
  const next = []
  for (const item of photos) {
    if (removed.has(item.id)) continue
    const photo = isDataUrl(item.photo) ? await storeFile(`appointment:${appointment.id}`, 'foto', item.photo) : item.photo
    next.push({ ...item, photo })
  }
  return { ...appointment, photos: next }
}

async function liftDogDoc(_uid: string, dogId: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const save = photoSaver(`dog:${dogId}`)
  const next = { ...data }
  if (typeof next.photo === 'string' && isDataUrl(next.photo)) {
    next.photo = await save(next.photo)
  }
  if (Array.isArray(next.gallery)) {
    const gallery = []
    for (const item of next.gallery) {
      if (!item || typeof item !== 'object') {
        gallery.push(item)
        continue
      }
      const row = { ...(item as Record<string, unknown>) }
      if (typeof row.photo === 'string' && isDataUrl(row.photo) && typeof row.id === 'string') {
        row.photo = await save(row.photo)
      }
      gallery.push(row)
    }
    next.gallery = gallery
  }
  return next
}

async function liftVisitDoc(_uid: string, appointmentId: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!Array.isArray(data.photos)) return data
  const photos = []
  for (const item of data.photos) {
    if (!item || typeof item !== 'object') {
      photos.push(item)
      continue
    }
    const row = { ...(item as Record<string, unknown>) }
    const kind = row.kind === 'prima' || row.kind === 'dopo' || row.kind === 'altro' ? row.kind : null
    if (typeof row.photo === 'string' && isDataUrl(row.photo) && typeof row.id === 'string' && kind) {
      row.photo = await storeFile(`appointment:${appointmentId}`, 'foto', row.photo)
    }
    photos.push(row)
  }
  return { ...data, photos }
}

function fromCacheOf(snap: { metadata?: { fromCache?: boolean } }): boolean {
  return snap.metadata?.fromCache === true
}

async function mergedDeletion(): Promise<Tombstone | null> {
  try {
    const cloud = readTombstone(await readDoc(sharedPath('meta', 'deleted-dogs')))
    const merged = mergeTombstone(readDeletion(), cloud)
    if (merged.ids.length > 0 || merged.appointmentIds.length > 0) rememberDeletion(merged)
    return merged
  } catch {
    return null
  }
}

export async function saveDog(uid: string, dog: Dog, _waitForUploads = false): Promise<void> {
  const stone = mergeTombstone(readDeletion(), readTombstone(await readDoc(sharedPath('meta', 'deleted-dogs'))))
  if (tombstoneRejectsDog(stone, dog.id)) return
  const uploaded = await uploadDogMedia(uid, dog)
  const kept = await withKeptMedia(['salon', 'shared', 'dogs', dog.id], dogToDoc(uploaded), ['photo', 'gallery'])
  const data = await liftDogDoc(uid, dog.id, kept.next)
  if (containsDataUrl(data)) throw new AppError('Salvataggio non riuscito', 'storage_write')
  await putDoc(['salon', 'shared', 'dogs', dog.id], data)
  await dropFiles(kept.dropped)
}

export async function removeDog(_uid: string, id: string): Promise<void> {
  await enqueueFirstTask(async () => {
    const cloud = readTombstone(await readDoc(sharedPath('meta', 'deleted-dogs')))
    const merged = mergeTombstone(readDeletion(), cloud)
    const ids = merged.ids.includes(id) ? merged.ids : [...merged.ids, id]
    const { collection, deleteDoc, doc, getDocs } = await loadFirestore()
    const db = await database()
    const dogDoc = await readDoc(sharedPath('dogs', id))
    const snap = await getDocs(collection(db, 'salon', 'shared', 'appointments'))
    const doomed = snap.docs.filter((item) => {
      const dogId = (item.data() as { dogId?: unknown }).dogId
      return merged.appointmentIds.includes(item.id) || dogId === id
    })
    const refs = [...mediaRefs(dogDoc), ...doomed.flatMap((item) => mediaRefs(item.data() as Record<string, unknown>))]
    const appointmentIds = [...new Set([...merged.appointmentIds, ...doomed.map((item) => item.id)])]
    await writeDeletionSign(ids, appointmentIds)
    await deleteDoc(doc(db, 'salon', 'shared', 'dogs', id))
    await Promise.all(doomed.map((item) => deleteDoc(item.ref)))
    await dropFiles(refs)
  })
}

export async function listenDogs(uid: string, onData: (dogs: Dog[], fromCache?: boolean) => void): Promise<() => void> {
  const db = await database()
  void ensureShared(uid).catch(() => notifySaveFailed())
  const { collection, onSnapshot } = await loadFirestore()
  let seq = 0
  return onSnapshot(collection(db, 'salon', 'shared', 'dogs'), (snap) => {
    const cached = fromCacheOf(snap)
    if (snap.empty && cached) return
    const mine = ++seq
    void (async () => {
      const stone = await mergedDeletion()
      if (mine !== seq || !stone) return
      const dogs = snap.docs.map((item) => dogFromDoc(item.id, item.data() as Record<string, unknown>))
      dogs.sort((a, b) => a.name.localeCompare(b.name, 'it') || a.id.localeCompare(b.id))
      onData(filterDogs(dogs, stone), cached)
    })().catch(() => notifySaveFailed())
  }, () => {
    notifySaveFailed()
  })
}

export async function saveAppointment(uid: string, appointment: Appointment, _waitForUploads = false): Promise<void> {
  const stone = mergeTombstone(readDeletion(), readTombstone(await readDoc(sharedPath('meta', 'deleted-dogs'))))
  if (tombstoneRejectsAppointment(stone, appointment.id, appointment.dogId)) return
  const uploaded = await uploadAppointmentMedia(uid, appointment)
  const kept = await withKeptMedia(['salon', 'shared', 'appointments', appointment.id], appointmentToDoc(uploaded), ['photos'])
  const data = await liftVisitDoc(uid, appointment.id, kept.next)
  if (containsDataUrl(data)) throw new AppError('Salvataggio non riuscito', 'storage_write')
  await putDoc(['salon', 'shared', 'appointments', appointment.id], data)
  await dropFiles(kept.dropped)
}

export async function removeAppointment(_uid: string, id: string): Promise<void> {
  await enqueueFirstTask(async () => {
    const cloud = readTombstone(await readDoc(sharedPath('meta', 'deleted-dogs')))
    const merged = mergeTombstone(readDeletion(), cloud)
    const appointmentIds = merged.appointmentIds.includes(id) ? merged.appointmentIds : [...merged.appointmentIds, id]
    await writeDeletionSign(merged.ids, appointmentIds)
    const { doc, deleteDoc } = await loadFirestore()
    const db = await database()
    const current = await readDoc(sharedPath('appointments', id))
    await deleteDoc(doc(db, 'salon', 'shared', 'appointments', id))
    await dropFiles(mediaRefs(current))
  })
}

export async function listenAppointments(uid: string, onData: (appointments: Appointment[], fromCache?: boolean) => void): Promise<() => void> {
  const db = await database()
  void ensureShared(uid).catch(() => notifySaveFailed())
  const { collection, onSnapshot } = await loadFirestore()
  let seq = 0
  return onSnapshot(collection(db, 'salon', 'shared', 'appointments'), (snap) => {
    const cached = fromCacheOf(snap)
    if (snap.empty && cached) return
    const mine = ++seq
    void (async () => {
      const stone = await mergedDeletion()
      if (mine !== seq || !stone) return
      const appointments = snap.docs.map((item) => appointmentFromDoc(item.id, item.data() as Record<string, unknown>))
      appointments.sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id))
      onData(filterAppointments(appointments, stone), cached)
    })().catch(() => notifySaveFailed())
  }, () => {
    notifySaveFailed()
  })
}

export async function saveService(_uid: string, service: Service): Promise<void> {
  await putDoc(['salon', 'shared', 'services', service.id], serviceToDoc(service))
}

export async function saveServices(uid: string, services: Service[]): Promise<void> {
  await Promise.all(services.map((service) => saveService(uid, service)))
}

async function seedServices(uid: string): Promise<void> {
  const now = new Date()
  await saveServices(uid, SERVICE_SEED.map((service) => ({ ...service, createdAt: now, updatedAt: now })))
}

export async function listenServices(uid: string, onData: (services: Service[], fromCache?: boolean) => void): Promise<() => void> {
  const db = await database()
  void ensureShared(uid).catch(() => notifySaveFailed())
  const { collection, onSnapshot } = await loadFirestore()
  let seeding = false
  return onSnapshot(collection(db, 'salon', 'shared', 'services'), (snap) => {
    const cached = fromCacheOf(snap)
    if (snap.empty) {
      if (!shouldSeedServices(true, cached) || seeding || cloudReplaceDepth > 0) return
      seeding = true
      void seedServices(uid).catch(() => {
        seeding = false
        notifySaveFailed()
      })
      return
    }
    seeding = false
    const services = snap.docs.map((item) => serviceFromDoc(item.id, item.data() as Record<string, unknown>))
    services.sort((a, b) => a.order - b.order)
    onData(services, cached)
  }, () => {
    notifySaveFailed()
  })
}

async function uploadPrice(_uid: string, file: PriceFile): Promise<PriceFile> {
  if (!isDataUrl(file.dataUrl)) return file
  return { ...file, dataUrl: await storeFile('listino', 'file', file.dataUrl, file.fileName) }
}

function settingsHaveBinary(settings: SettingsMain): boolean {
  return isDataUrl(settings.priceList?.dataUrl) || settings.priceListHistory.some((file) => isDataUrl(file.dataUrl))
}

async function withUploadedPrices(uid: string, settings: SettingsMain): Promise<SettingsMain> {
  const priceList = settings.priceList ? await uploadPrice(uid, settings.priceList) : undefined
  const priceListHistory = []
  for (const file of settings.priceListHistory) priceListHistory.push(await uploadPrice(uid, file))
  return { ...settings, priceList, priceListHistory }
}

function priceDataUrlsAreRemote(settings: SettingsMain): boolean {
  const files = [...(settings.priceList ? [settings.priceList] : []), ...settings.priceListHistory]
  return files.every((file) => file.dataUrl.startsWith('https://') || isFileRef(file.dataUrl))
}

async function putSettings(written: Record<string, unknown>): Promise<void> {
  const current = await readDoc(['salon', 'shared', 'settings', 'main'])
  await putDoc(['salon', 'shared', 'settings', 'main'], written)
  if (isStaleWrite(written, current, true)) return
  const kept = new Set(priceRefs(written))
  await dropFiles(priceRefs(current).filter((ref) => !kept.has(ref)))
}

async function publishUploadedSettings(uid: string, settings: SettingsMain): Promise<void> {
  const uploaded = await withUploadedPrices(uid, settings)
  if (!priceDataUrlsAreRemote(uploaded)) return
  await putSettings(settingsToDoc(uploaded))
}

export async function saveSettings(uid: string, settings: SettingsMain, waitForUploads = false): Promise<void> {
  if (settingsHaveBinary(settings)) {
    if (waitForUploads) {
      await publishUploadedSettings(uid, settings)
      return
    }
    enqueueTask(() => publishUploadedSettings(uid, settings))
    return
  }
  await putSettings(settingsToDoc(settings))
}

async function visitWithLocalMedia(local: Appointment): Promise<Appointment | null> {
  const cloud = await readDoc(sharedPath('appointments', local.id))
  if (!cloud || local.updatedAt.getTime() >= updatedMillis(cloud)) return local
  const merged = appointmentFromDoc(local.id, cloud)
  const present = new Set(merged.photos?.map((item) => item.id) ?? [])
  const removed = new Set([...(merged.removedPhotoIds ?? []), ...(local.removedPhotoIds ?? [])])
  const missing = (local.photos ?? []).filter((item) => isDataUrl(item.photo) && !present.has(item.id) && !removed.has(item.id))
  if (missing.length === 0) return null
  return { ...merged, photos: [...(merged.photos ?? []), ...missing] }
}

async function settingsWithLocalMedia(local: SettingsMain): Promise<SettingsMain | null> {
  const cloud = await readDoc(['salon', 'shared', 'settings', 'main'])
  if (!cloud) return local
  const merged = settingsFromDoc(cloud)
  const present = new Set([...(merged.priceList ? [merged.priceList] : []), ...merged.priceListHistory].map((file) => file.id))
  const missing = (file: PriceFile | undefined): file is PriceFile => !!file && isDataUrl(file.dataUrl) && !present.has(file.id)
  let changed = false
  if (missing(local.priceList)) {
    if (merged.priceList) merged.priceListHistory = [...merged.priceListHistory, local.priceList]
    else merged.priceList = local.priceList
    present.add(local.priceList.id)
    changed = true
  }
  for (const file of local.priceListHistory) {
    if (!missing(file)) continue
    merged.priceListHistory = [...merged.priceListHistory, file]
    present.add(file.id)
    changed = true
  }
  return changed ? merged : null
}

export async function resaveLocalMedia(uid: string): Promise<void> {
  for (const appointment of listAppointments(uid)) {
    if (!containsDataUrl(appointment.photos ?? [])) continue
    const next = await visitWithLocalMedia(appointment).catch(() => null)
    if (next) await saveAppointment(uid, next, true).catch(() => undefined)
  }
  if (localStorage.getItem(storageKeys.settings(uid)) != null) {
    const settings = getSettings(uid)
    if (containsDataUrl([settings.priceList, ...settings.priceListHistory])) {
      const next = await settingsWithLocalMedia(settings).catch(() => null)
      if (next) await saveSettings(uid, next, true).catch(() => undefined)
    }
  }
}

export async function listenSettings(uid: string, onData: (settings: SettingsMain) => void): Promise<() => void> {
  const db = await database()
  void ensureShared(uid).catch(() => notifySaveFailed())
  const { doc, onSnapshot } = await loadFirestore()
  const ref = doc(db, 'salon', 'shared', 'settings', 'main')
  let seeding = false
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      if (!shouldSeedServices(true, fromCacheOf(snap)) || seeding || cloudReplaceDepth > 0) return
      seeding = true
      const created = blankSettings('auto', new Date().toISOString())
      onData(created)
      void saveSettings(uid, created).catch(() => {
        seeding = false
        notifySaveFailed()
      })
      return
    }
    seeding = false
    onData(settingsFromDoc(snap.data() as Record<string, unknown>))
  }, () => {
    notifySaveFailed()
  })
}

function removeMigratedKeys(): void {
  const keys: string[] = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    const uid = key?.match(/^groomly\.users\.([^.]+)\./)?.[1]
    if (!key?.startsWith('groomly.users.') || (uid != null && isSalonMirror(uid))) continue
    keys.push(key)
  }
  for (const key of keys) localStorage.removeItem(key)
  localStorage.removeItem(storageKeys.auth)
  localStorage.removeItem(storageKeys.session)
}

async function copyLocal(firebaseUid: string): Promise<void> {
  const removed = await deletedDogIds()
  for (const id of removed) forgetLocalDog(id)
  for (const localUid of localDataUids()) {
    for (const dog of listDogs(localUid)) {
      if (removed.has(dog.id)) continue
      await saveDog(firebaseUid, dog, true)
    }
    for (const appointment of listAppointments(localUid)) {
      if (removed.has(appointment.dogId)) continue
      await saveAppointment(firebaseUid, appointment, true)
    }
    forgetLocalAppointments(new Set(listAppointments(localUid).filter((item) => removed.has(item.dogId)).map((item) => item.id)))
    for (const service of listServices(localUid)) await saveService(firebaseUid, service)
    if (localStorage.getItem(storageKeys.settings(localUid)) != null) {
      await saveSettings(firebaseUid, getSettings(localUid), true)
    }
  }
}

async function runMigration(firebaseUid: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    if (localDataUids().length === 0) {
      markCloudReady()
      return true
    }
    notifySaveFailed()
    return false
  }
  try {
    await copyLocal(firebaseUid)
    await ensureShared(firebaseUid)
    removeMigratedKeys()
    markCloudReady()
    return true
  } catch {
    // Non impostare sessionStorage['groomly.migrate']: al prossimo accesso si riprova.
    notifySaveFailed()
    return false
  }
}

export function migrate(firebaseUid: string): Promise<boolean> {
  if (isCloudReady()) return Promise.resolve(true)
  if (!migrationTask) migrationTask = runMigration(firebaseUid)
  return migrationTask
}

function toAccount(user: User): LocalAccount {
  return {
    uid: user.uid,
    email: (user.email ?? '').toLowerCase(),
    passwordHash: '',
    salt: '',
    iterations: 0,
    createdAt: user.metadata.creationTime ?? new Date().toISOString(),
  }
}

function localFallback(email: string): LocalAccount | null {
  const account = getAccount()
  if (account) return account
  const uid = localDataUid()
  if (!uid) return null
  return {
    uid,
    email,
    passwordHash: '',
    salt: '',
    iterations: 0,
    createdAt: new Date().toISOString(),
  }
}

async function finishUser(user: User): Promise<LocalAccount> {
  knownUid = user.uid
  const ok = await migrate(user.uid)
  try {
    await ensureShared(user.uid)
  } catch {
    notifySaveFailed()
  }
  return accountFor(user, ok)
}

export async function signInEmail(email: string, password: string): Promise<LocalAccount> {
  const normalized = email.trim().toLowerCase()
  const local = getAccount()
  if (local && local.email === normalized) {
    const ok = await verifyPassword(password, local.salt, local.passwordHash, local.iterations)
    if (!ok) throw new AppError('Email o password non corretti', 'auth_invalid')
  }
  const firebaseAuth = await auth()
  const { createUserWithEmailAndPassword, signInWithEmailAndPassword } = await import('firebase/auth')
  try {
    const cred = await signInWithEmailAndPassword(firebaseAuth, normalized, password)
    return finishUser(cred.user)
  } catch (error) {
    if (firebaseCode(error) === 'auth/invalid-credential' && local && local.email === normalized) {
      try {
        const created = await createUserWithEmailAndPassword(firebaseAuth, normalized, password)
        return finishUser(created.user)
      } catch (createError) {
        if (firebaseCode(createError) === 'auth/email-already-in-use') {
          throw new AppError('Email o password non corretti', 'auth_invalid')
        }
        throw mapAuthError(createError)
      }
    }
    throw mapAuthError(error)
  }
}

export async function registerEmail(email: string, password: string): Promise<LocalAccount> {
  const firebaseAuth = await auth()
  const { createUserWithEmailAndPassword, signInWithEmailAndPassword } = await import('firebase/auth')
  const normalized = email.trim().toLowerCase()
  try {
    const cred = await createUserWithEmailAndPassword(firebaseAuth, normalized, password)
    return finishUser(cred.user)
  } catch (error) {
    if (!shouldFallbackToSignIn(firebaseCode(error))) throw mapAuthError(error)
    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth, normalized, password)
      return finishUser(cred.user)
    } catch (signInError) {
      throw mapAuthError(signInError)
    }
  }
}

export async function signOutEmail(): Promise<void> {
  const firebaseAuth = await auth()
  const { signOut } = await import('firebase/auth')
  await signOut(firebaseAuth)
  knownUid = null
  shareTask = null
  shareUid = null
  if (!isCloudReady()) migrationTask = null
}

function accountFor(user: User, migrated: boolean): LocalAccount {
  if (migrated) return toAccount(user)
  return localFallback((user.email ?? '').toLowerCase()) ?? toAccount(user)
}

export async function watchAuth(onAccount: (account: LocalAccount | null) => void): Promise<() => void> {
  const firebaseAuth = await auth()
  const { onAuthStateChanged } = await import('firebase/auth')
  let generation = 0
  return onAuthStateChanged(firebaseAuth, (user) => {
    const mine = ++generation
    if (!user) {
      knownUid = null
      onAccount(null)
      return
    }
    knownUid = user.uid
    onAccount(accountFor(user, isCloudReady()))
    if (isCloudReady()) {
      void ensureShared(user.uid).catch(() => notifySaveFailed())
      return
    }
    void migrate(user.uid).then((ok) => {
      if (mine !== generation) return
      onAccount(accountFor(user, ok))
    }).catch(() => {
      if (mine !== generation) return
      notifySaveFailed()
      onAccount(accountFor(user, false))
    })
  }, () => {
    generation += 1
    knownUid = null
    onAccount(null)
    notifySaveFailed()
  })
}

function jsonIsEmptyBackup(json: string): boolean {
  try {
    const bundle = readRestoreBundle(JSON.parse(json) as unknown)
    if (!bundle) return true
    return isEmptyBackup(bundle)
  } catch {
    return true
  }
}

async function uploadBackupFile(uid: string, day: string, json: string): Promise<void> {
  const { ref, uploadString } = await import('firebase/storage')
  const fileRef = ref(await bucket(), storagePaths(uid).backup(day))
  await uploadString(fileRef, json, 'raw', { contentType: 'application/json' })
}

async function deleteMissing(_uid: string, name: string, keep: Set<string>): Promise<void> {
  const { collection, getDocs, deleteDoc } = await loadFirestore()
  const snap = await getDocs(collection(await database(), 'salon', 'shared', name))
  await Promise.all(snap.docs.filter((item) => !keep.has(item.id)).map((item) => deleteDoc(item.ref)))
}

export async function replaceCloudData(uid: string, bundle: BackupBundle): Promise<void> {
  const accepted = readRestoreBundle(bundle)
  if (!accepted) throw new AppError('Salvataggio non riuscito', 'storage_write')
  const dogs = withLocalKey(storageKeys.dogs(uid), accepted.dogs, () => listDogs(uid))
  const appointments = withLocalKey(storageKeys.appointments(uid), accepted.appointments, () => listAppointments(uid))
  const services = withLocalKey(storageKeys.services(uid), accepted.services, () => listServices(uid))
  const settings = withLocalKey(storageKeys.settings(uid), accepted.settings, () => getSettings(uid))
  cloudReplaceDepth += 1
  try {
    await Promise.all(dogs.map((dog) => saveDog(uid, dog, true)))
    await Promise.all(appointments.map((item) => saveAppointment(uid, item, true)))
    await saveServices(uid, services)
    await saveSettings(uid, settings, true)
    await deleteMissing(uid, 'dogs', new Set(dogs.map((dog) => dog.id)))
    await deleteMissing(uid, 'appointments', new Set(appointments.map((item) => item.id)))
    await deleteMissing(uid, 'services', new Set(services.map((service) => service.id)))
  } finally {
    cloudReplaceDepth -= 1
  }
}

export async function loadCloudBackup(_uid: string): Promise<BackupBundle> {
  const { collection, doc, getDoc, getDocs } = await loadFirestore()
  const db = await database()
  const [dogsSnap, appointmentsSnap, servicesSnap, settingsSnap] = await Promise.all([
    getDocs(collection(db, 'salon', 'shared', 'dogs')),
    getDocs(collection(db, 'salon', 'shared', 'appointments')),
    getDocs(collection(db, 'salon', 'shared', 'services')),
    getDoc(doc(db, 'salon', 'shared', 'settings', 'main')),
  ])
  const settings = settingsSnap.exists()
    ? settingsToDoc(settingsFromDoc(settingsSnap.data() as Record<string, unknown>))
    : {}
  return {
    dogs: dogsToLocalMap(dogsSnap.docs.map((item) => dogFromDoc(item.id, item.data() as Record<string, unknown>))),
    appointments: appointmentsToLocalMap(appointmentsSnap.docs.map((item) => appointmentFromDoc(item.id, item.data() as Record<string, unknown>))),
    services: servicesToLocalMap(servicesSnap.docs.map((item) => serviceFromDoc(item.id, item.data() as Record<string, unknown>))),
    settings,
  }
}

export async function runCloudDailyBackup(uid: string, now = new Date()): Promise<void> {
  const { doc, getDoc } = await loadFirestore()
  const snap = await getDoc(doc(await database(), 'salon', 'shared', 'settings', 'main'))
  if (!snap.exists()) return
  const settings = settingsFromDoc(snap.data() as Record<string, unknown>)
  if (!dailyBackupDue(settings.backup, now)) return
  const bundle = await loadCloudBackup(uid)
  if (isEmptyBackup(bundle)) return
  const json = JSON.stringify(bundle)
  const day = backupDay(now)
  enqueueTask(async () => {
    await uploadBackupFile(uid, day, json)
    const current = await readDoc(['salon', 'shared', 'settings', 'main'])
    if (!current) return
    await writeUploadPatch(['salon', 'shared', 'settings', 'main'], backupLastAtPatch(now.toISOString()))
  })
}

export function enqueueBackup(day: string, json: string): void {
  if (!firebaseEnabled()) return
  if (jsonIsEmptyBackup(json)) return
  enqueueTask(async () => {
    const firebaseAuth = await auth()
    const uid = firebaseAuth.currentUser?.uid
    if (!uid) return
    await uploadBackupFile(uid, day, json)
  })
}
