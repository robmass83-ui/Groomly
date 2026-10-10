/**
 * Passi da eseguire a mano. Questo task non crea il progetto, non esegue
 * `firebase login` e non fa il deploy.
 *
 * 1. Creare un progetto su console.firebase.google.com.
 * 2. Authentication → email/password → attiva.
 * 3. Creare Firestore in modalità produzione.
 * 4. Creare Storage.
 * 5. Copiare la config in `.env.local` come `VITE_FIREBASE_API_KEY`,
 *    `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
 *    `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`,
 *    `VITE_FIREBASE_APP_ID`.
 * 6. `npx firebase deploy --only firestore:rules,firestore:indexes,storage`
 *    dopo `firebase login`.
 */
import type { FirebaseApp } from 'firebase/app'
import type { Auth, User } from 'firebase/auth'
import type { DocumentData, Firestore, UpdateData } from 'firebase/firestore'
import type { FirebaseStorage } from 'firebase/storage'
import { getAccount, type LocalAccount } from '../local/auth'
import { listAppointments } from '../local/appointments'
import { listDogs } from '../local/dogs'
import { listServices } from '../local/services'
import { getSettings, blankSettings, type PriceFile, type SettingsMain } from '../local/settings'
import { storageKeys } from '../local/storage'
import { AppError } from '../errors'
import { SERVICE_SEED } from '../seed/services'
import { shouldFallbackToSignIn } from '../../lib/authAction'
import { backupDay, dailyBackupDue, isEmptyBackup, readRestoreBundle, type BackupBundle } from '../../lib/backupDoc'
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
  localDataUid,
  localDataUids,
  markCloudReady,
  notifySaveFailed,
} from './enabled'
import { appointmentsToLocalMap, dogsToLocalMap, servicesToLocalMap, withLocalKey } from './localSeed'
import { createUploadQueue } from './taskQueue'
import { appointmentMediaPatch, backupLastAtPatch, dogMediaPatch, settingsMediaPatch } from '../../lib/uploadPatch'

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

async function database(): Promise<Firestore> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const app = await firebaseApp()
      const { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } = await import('firebase/firestore')
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

function enqueueTask(task: () => Promise<void>): void {
  uploadQueue.enqueue(task)
}

function containsDataUrl(value: unknown): boolean {
  if (typeof value === 'string') return value.startsWith('data:')
  if (Array.isArray(value)) return value.some(containsDataUrl)
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(containsDataUrl)
  }
  return false
}

function isDataUrl(value: string | undefined): value is string {
  return typeof value === 'string' && value.startsWith('data:')
}

function remoteUrl(value: string | undefined): string | undefined {
  if (typeof value !== 'string' || value.length === 0 || value.startsWith('data:')) return undefined
  return value
}

async function readDoc(path: string[], fromServer = false): Promise<Record<string, unknown> | null> {
  const { doc, getDoc } = await import('firebase/firestore')
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
  if (typeof value === 'string') return value.startsWith('data:') ? undefined : value
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const next = withoutDataUrls(item)
      if (next === undefined) return []
      const hadDataPhoto = !!item && typeof item === 'object' && typeof (item as { photo?: unknown }).photo === 'string'
        && (item as { photo: string }).photo.startsWith('data:')
      if (hadDataPhoto) return []
      return [next]
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

async function copyUserKind(uid: string, kind: 'dogs' | 'appointments' | 'services'): Promise<void> {
  const { collection, getDocs, deleteDoc } = await import('firebase/firestore')
  const db = await database()
  const readDocs = getDocs as (target: ReturnType<typeof collection>, options?: { source: 'server' }) => ReturnType<typeof getDocs>
  const snap = await readDocs(collection(db, 'users', uid, kind), { source: 'server' })
  for (const item of snap.docs) {
    const data = copyableDoc(item.data() as Record<string, unknown>)
    const current = await readDoc(sharedPath(kind, item.id), true)
    if (!shouldCopy(kind, item.id, data, current)) continue
    await putDoc(sharedPath(kind, item.id), data)
  }
  if (kind !== 'services' || snap.empty) return
  const keep = new Set(snap.docs.map((item) => item.id))
  const salon = await readDocs(collection(db, 'salon', 'shared', 'services'), { source: 'server' })
  await Promise.all(salon.docs.filter((item) => {
    if (keep.has(item.id)) return false
    return serviceMatchesSeed(item.id, item.data() as Record<string, unknown>)
  }).map((item) => deleteDoc(item.ref)))
}

async function copyUserSettings(uid: string): Promise<void> {
  const data = await readDoc(['users', uid, 'settings', 'main'], true)
  if (!data) return
  const incoming = copyableDoc(data)
  const current = await readDoc(sharedPath('settings', 'main'), true)
  if (!shouldCopy('settings', 'main', incoming, current)) return
  await putDoc(sharedPath('settings', 'main'), incoming)
}

async function restoreAccount(uid: string): Promise<void> {
  const marker = await readDoc(sharedPath('meta', `restored-${uid}`), true)
  if (marker?.done === true) return
  await copyUserKind(uid, 'dogs')
  await copyUserKind(uid, 'appointments')
  await copyUserKind(uid, 'services')
  await copyUserSettings(uid)
  await putDoc(sharedPath('meta', `restored-${uid}`), { done: true, at: Date.now() })
}

function ensureShared(uid: string): Promise<void> {
  if (shareTask && shareUid === uid) return shareTask
  shareUid = uid
  shareTask = restoreAccount(uid).catch((error: unknown) => {
    shareTask = null
    shareUid = null
    throw error
  })
  return shareTask
}

async function writeUploadPatch(path: string[], patch: Record<string, unknown>): Promise<void> {
  if (Object.keys(patch).length === 0) return
  if (containsDataUrl(patch)) throw new AppError('Salvataggio non riuscito', 'storage_write')
  const { doc, updateDoc } = await import('firebase/firestore')
  await updateDoc(doc(await database(), path[0], ...path.slice(1)), patch as UpdateData<DocumentData>)
}

async function uploadDataUrl(path: string, dataUrl: string): Promise<string> {
  const { ref, uploadString, getDownloadURL } = await import('firebase/storage')
  const fileRef = ref(await bucket(), path)
  await uploadString(fileRef, dataUrl, 'data_url')
  return getDownloadURL(fileRef)
}

async function putDoc(path: string[], data: Record<string, unknown>): Promise<void> {
  if (containsDataUrl(data)) throw new AppError('Salvataggio non riuscito', 'storage_write')
  const { doc, setDoc } = await import('firebase/firestore')
  await setDoc(doc(await database(), path[0], ...path.slice(1)), data)
}

function dogHasBinary(dog: Dog): boolean {
  return isDataUrl(dog.photo) || dog.gallery.some((item) => isDataUrl(item.photo))
}

async function uploadDogMedia(uid: string, dog: Dog): Promise<Dog> {
  let photo = dog.photo
  if (isDataUrl(dog.photo)) photo = await uploadDataUrl(storagePaths(uid).profile(dog.id), dog.photo)
  const gallery = []
  for (const item of dog.gallery) {
    if (!isDataUrl(item.photo)) {
      gallery.push(item)
      continue
    }
    gallery.push({ ...item, photo: await uploadDataUrl(storagePaths(uid).gallery(dog.id, item.id), item.photo) })
  }
  return { ...dog, photo, gallery }
}

export async function saveDog(uid: string, dog: Dog, waitForUploads = false): Promise<void> {
  if (waitForUploads) {
    const uploaded = dogHasBinary(dog) ? await uploadDogMedia(uid, dog) : dog
    await putDoc(['salon', 'shared', 'dogs', dog.id], dogToDoc(uploaded))
    return
  }
  await putDoc(['salon', 'shared', 'dogs', dog.id], dogToDoc(dog))
  if (!dogHasBinary(dog)) return
  enqueueTask(async () => {
    const uploaded = await uploadDogMedia(uid, dog)
    const current = await readDoc(['salon', 'shared', 'dogs', dog.id])
    if (!current) return
    const gallery = []
    for (const item of dog.gallery) {
      if (!isDataUrl(item.photo)) continue
      const next = uploaded.gallery.find((entry) => entry.id === item.id)
      const photo = remoteUrl(next?.photo)
      if (!next || !photo) continue
      gallery.push({ id: next.id, photo, takenAt: next.takenAt.getTime() })
    }
    await writeUploadPatch(['salon', 'shared', 'dogs', dog.id], dogMediaPatch(current, {
      photo: isDataUrl(dog.photo) ? remoteUrl(uploaded.photo) : undefined,
      gallery,
    }))
  })
}

export async function removeDog(_uid: string, id: string): Promise<void> {
  const { doc, deleteDoc } = await import('firebase/firestore')
  await deleteDoc(doc(await database(), 'salon', 'shared', 'dogs', id))
}

export async function listenDogs(uid: string, onData: (dogs: Dog[]) => void): Promise<() => void> {
  await ensureShared(uid)
  const { collection, onSnapshot } = await import('firebase/firestore')
  return onSnapshot(collection(await database(), 'salon', 'shared', 'dogs'), (snap) => {
    const dogs = snap.docs.map((item) => dogFromDoc(item.id, item.data() as Record<string, unknown>))
    dogs.sort((a, b) => a.name.localeCompare(b.name, 'it') || a.id.localeCompare(b.id))
    onData(dogs)
  }, () => {
    notifySaveFailed()
  })
}

function appointmentHasBinary(appointment: Appointment): boolean {
  return appointment.photos?.some((item) => isDataUrl(item.photo)) === true
}

async function uploadAppointmentMedia(uid: string, appointment: Appointment): Promise<Appointment> {
  const photos = appointment.photos ? [...appointment.photos] : []
  for (let index = 0; index < photos.length; index += 1) {
    const photo = photos[index]
    if (!photo || !isDataUrl(photo.photo)) continue
    photos[index] = {
      ...photo,
      photo: await uploadDataUrl(storagePaths(uid).work(appointment.id, photo.id, photo.kind), photo.photo),
    }
  }
  return { ...appointment, photos }
}

export async function saveAppointment(uid: string, appointment: Appointment, waitForUploads = false): Promise<void> {
  if (waitForUploads) {
    const uploaded = appointmentHasBinary(appointment) ? await uploadAppointmentMedia(uid, appointment) : appointment
    await putDoc(['salon', 'shared', 'appointments', appointment.id], appointmentToDoc(uploaded))
    return
  }
  await putDoc(['salon', 'shared', 'appointments', appointment.id], appointmentToDoc(appointment))
  if (!appointmentHasBinary(appointment)) return
  enqueueTask(async () => {
    const uploaded = await uploadAppointmentMedia(uid, appointment)
    const current = await readDoc(['salon', 'shared', 'appointments', appointment.id])
    if (!current) return
    const photos = []
    for (const item of appointment.photos ?? []) {
      if (!isDataUrl(item.photo)) continue
      const next = uploaded.photos?.find((entry) => entry.id === item.id)
      const photo = remoteUrl(next?.photo)
      if (!next || !photo) continue
      photos.push({ id: next.id, photo, kind: next.kind })
    }
    await writeUploadPatch(['salon', 'shared', 'appointments', appointment.id], appointmentMediaPatch(current, photos))
  })
}

export async function removeAppointment(_uid: string, id: string): Promise<void> {
  const { doc, deleteDoc } = await import('firebase/firestore')
  await deleteDoc(doc(await database(), 'salon', 'shared', 'appointments', id))
}

export async function listenAppointments(uid: string, onData: (appointments: Appointment[]) => void): Promise<() => void> {
  await ensureShared(uid)
  const { collection, onSnapshot } = await import('firebase/firestore')
  return onSnapshot(collection(await database(), 'salon', 'shared', 'appointments'), (snap) => {
    const appointments = snap.docs.map((item) => appointmentFromDoc(item.id, item.data() as Record<string, unknown>))
    appointments.sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id))
    onData(appointments)
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

export async function listenServices(uid: string, onData: (services: Service[]) => void): Promise<() => void> {
  await ensureShared(uid)
  const { collection, onSnapshot } = await import('firebase/firestore')
  let seeding = false
  return onSnapshot(collection(await database(), 'salon', 'shared', 'services'), (snap) => {
    if (snap.empty) {
      if (seeding || cloudReplaceDepth > 0) return
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
    onData(services)
  }, () => {
    notifySaveFailed()
  })
}

async function uploadPrice(uid: string, file: PriceFile): Promise<PriceFile> {
  if (!isDataUrl(file.dataUrl)) return file
  return { ...file, dataUrl: await uploadDataUrl(storagePaths(uid).price(file.fileName), file.dataUrl) }
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

export async function saveSettings(uid: string, settings: SettingsMain, waitForUploads = false): Promise<void> {
  if (waitForUploads) {
    const uploaded = settingsHaveBinary(settings) ? await withUploadedPrices(uid, settings) : settings
    await putDoc(['salon', 'shared', 'settings', 'main'], settingsToDoc(uploaded))
    return
  }
  await putDoc(['salon', 'shared', 'settings', 'main'], settingsToDoc(settings))
  if (!settingsHaveBinary(settings)) return
  enqueueTask(async () => {
    const uploaded = await withUploadedPrices(uid, settings)
    const current = await readDoc(['salon', 'shared', 'settings', 'main'])
    if (!current) return
    const files: { id: string; dataUrl: string }[] = []
    if (settings.priceList && isDataUrl(settings.priceList.dataUrl) && uploaded.priceList) {
      files.push({ id: uploaded.priceList.id, dataUrl: uploaded.priceList.dataUrl })
    }
    for (const file of settings.priceListHistory) {
      if (!isDataUrl(file.dataUrl)) continue
      const next = uploaded.priceListHistory.find((item) => item.id === file.id)
      if (!next) continue
      files.push({ id: next.id, dataUrl: next.dataUrl })
    }
    await writeUploadPatch(['salon', 'shared', 'settings', 'main'], settingsMediaPatch(current, files))
  })
}

export async function listenSettings(uid: string, onData: (settings: SettingsMain) => void): Promise<() => void> {
  await ensureShared(uid)
  const { doc, onSnapshot } = await import('firebase/firestore')
  const ref = doc(await database(), 'salon', 'shared', 'settings', 'main')
  let seeding = false
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      if (seeding || cloudReplaceDepth > 0) return
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
    if (key?.startsWith('groomly.users.')) keys.push(key)
  }
  for (const key of keys) localStorage.removeItem(key)
  localStorage.removeItem(storageKeys.auth)
  localStorage.removeItem(storageKeys.session)
}

async function copyLocal(firebaseUid: string): Promise<void> {
  for (const localUid of localDataUids()) {
    for (const dog of listDogs(localUid)) await saveDog(firebaseUid, dog, true)
    for (const appointment of listAppointments(localUid)) await saveAppointment(firebaseUid, appointment, true)
    for (const service of listServices(localUid)) await saveService(firebaseUid, service)
    if (localStorage.getItem(storageKeys.settings(localUid)) != null) {
      await saveSettings(firebaseUid, getSettings(localUid), true)
    }
  }
}

async function runMigration(firebaseUid: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false && localDataUids().length > 0) {
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
  const { collection, getDocs, deleteDoc } = await import('firebase/firestore')
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
  const { collection, doc, getDoc, getDocs } = await import('firebase/firestore')
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
  const { doc, getDoc } = await import('firebase/firestore')
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
