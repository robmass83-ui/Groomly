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
import type { Firestore } from 'firebase/firestore'
import type { FirebaseStorage } from 'firebase/storage'
import { getAccount, type LocalAccount } from '../local/auth'
import { listAppointments } from '../local/appointments'
import { listDogs } from '../local/dogs'
import { listServices } from '../local/services'
import { getSettings, blankSettings, type PriceFile, type SettingsMain } from '../local/settings'
import { storageKeys } from '../local/storage'
import { AppError } from '../errors'
import { SERVICE_SEED } from '../seed/services'
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
import { appointmentsToLocalMap, dogsToLocalMap, servicesToLocalMap } from './localSeed'
import { createUploadQueue } from './taskQueue'

export { firebaseEnabled } from './enabled'

let appPromise: Promise<FirebaseApp> | null = null
let authPromise: Promise<Auth> | null = null
let dbPromise: Promise<Firestore> | null = null
let storagePromise: Promise<FirebaseStorage> | null = null
let knownUid: string | null = null
let migrationTask: Promise<boolean> | null = null

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
    await putDoc(['users', uid, 'dogs', dog.id], dogToDoc(uploaded))
    return
  }
  await putDoc(['users', uid, 'dogs', dog.id], dogToDoc(dog))
  if (!dogHasBinary(dog)) return
  enqueueTask(async () => {
    const uploaded = await uploadDogMedia(uid, dog)
    await putDoc(['users', uid, 'dogs', dog.id], dogToDoc(uploaded))
  })
}

export async function removeDog(uid: string, id: string): Promise<void> {
  const { doc, deleteDoc } = await import('firebase/firestore')
  await deleteDoc(doc(await database(), 'users', uid, 'dogs', id))
}

export async function listenDogs(uid: string, onData: (dogs: Dog[]) => void): Promise<() => void> {
  const { collection, onSnapshot } = await import('firebase/firestore')
  return onSnapshot(collection(await database(), 'users', uid, 'dogs'), (snap) => {
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
    await putDoc(['users', uid, 'appointments', appointment.id], appointmentToDoc(uploaded))
    return
  }
  await putDoc(['users', uid, 'appointments', appointment.id], appointmentToDoc(appointment))
  if (!appointmentHasBinary(appointment)) return
  enqueueTask(async () => {
    const uploaded = await uploadAppointmentMedia(uid, appointment)
    await putDoc(['users', uid, 'appointments', appointment.id], appointmentToDoc(uploaded))
  })
}

export async function removeAppointment(uid: string, id: string): Promise<void> {
  const { doc, deleteDoc } = await import('firebase/firestore')
  await deleteDoc(doc(await database(), 'users', uid, 'appointments', id))
}

export async function listenAppointments(uid: string, onData: (appointments: Appointment[]) => void): Promise<() => void> {
  const { collection, onSnapshot } = await import('firebase/firestore')
  return onSnapshot(collection(await database(), 'users', uid, 'appointments'), (snap) => {
    const appointments = snap.docs.map((item) => appointmentFromDoc(item.id, item.data() as Record<string, unknown>))
    appointments.sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id))
    onData(appointments)
  }, () => {
    notifySaveFailed()
  })
}

export async function saveService(uid: string, service: Service): Promise<void> {
  await putDoc(['users', uid, 'services', service.id], serviceToDoc(service))
}

export async function saveServices(uid: string, services: Service[]): Promise<void> {
  await Promise.all(services.map((service) => saveService(uid, service)))
}

async function seedServices(uid: string): Promise<void> {
  const now = new Date()
  await saveServices(uid, SERVICE_SEED.map((service) => ({ ...service, createdAt: now, updatedAt: now })))
}

export async function listenServices(uid: string, onData: (services: Service[]) => void): Promise<() => void> {
  const { collection, onSnapshot } = await import('firebase/firestore')
  let seeding = false
  return onSnapshot(collection(await database(), 'users', uid, 'services'), (snap) => {
    if (snap.empty) {
      if (seeding) return
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
    await putDoc(['users', uid, 'settings', 'main'], settingsToDoc(uploaded))
    return
  }
  await putDoc(['users', uid, 'settings', 'main'], settingsToDoc(settings))
  if (!settingsHaveBinary(settings)) return
  enqueueTask(async () => {
    const uploaded = await withUploadedPrices(uid, settings)
    await putDoc(['users', uid, 'settings', 'main'], settingsToDoc(uploaded))
  })
}

export async function listenSettings(uid: string, onData: (settings: SettingsMain) => void): Promise<() => void> {
  const { doc, onSnapshot } = await import('firebase/firestore')
  const ref = doc(await database(), 'users', uid, 'settings', 'main')
  let seeding = false
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      if (seeding) return
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
  if (ok) return toAccount(user)
  return localFallback((user.email ?? '').toLowerCase()) ?? toAccount(user)
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
  const { createUserWithEmailAndPassword } = await import('firebase/auth')
  try {
    const cred = await createUserWithEmailAndPassword(firebaseAuth, email.trim().toLowerCase(), password)
    return finishUser(cred.user)
  } catch (error) {
    throw mapAuthError(error)
  }
}

export async function signOutEmail(): Promise<void> {
  const firebaseAuth = await auth()
  const { signOut } = await import('firebase/auth')
  await signOut(firebaseAuth)
  knownUid = null
  if (!isCloudReady()) migrationTask = null
}

export async function watchAuth(onAccount: (account: LocalAccount | null) => void): Promise<() => void> {
  const firebaseAuth = await auth()
  const { onAuthStateChanged } = await import('firebase/auth')
  return onAuthStateChanged(firebaseAuth, (user) => {
    if (!user) {
      knownUid = null
      onAccount(null)
      return
    }
    void finishUser(user).then(onAccount).catch(() => {
      notifySaveFailed()
      onAccount(localFallback((user.email ?? '').toLowerCase()))
    })
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

export async function loadCloudBackup(uid: string): Promise<BackupBundle> {
  const { collection, doc, getDoc, getDocs } = await import('firebase/firestore')
  const db = await database()
  const [dogsSnap, appointmentsSnap, servicesSnap, settingsSnap] = await Promise.all([
    getDocs(collection(db, 'users', uid, 'dogs')),
    getDocs(collection(db, 'users', uid, 'appointments')),
    getDocs(collection(db, 'users', uid, 'services')),
    getDoc(doc(db, 'users', uid, 'settings', 'main')),
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
  const snap = await getDoc(doc(await database(), 'users', uid, 'settings', 'main'))
  if (!snap.exists()) return
  const settings = settingsFromDoc(snap.data() as Record<string, unknown>)
  if (!dailyBackupDue(settings.backup, now)) return
  const bundle = await loadCloudBackup(uid)
  if (isEmptyBackup(bundle)) return
  const json = JSON.stringify(bundle)
  const day = backupDay(now)
  enqueueTask(async () => {
    await uploadBackupFile(uid, day, json)
    await saveSettings(uid, {
      ...settings,
      updatedAt: now.toISOString(),
      backup: { autoDaily: true, lastAt: now.toISOString() },
    }, true)
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
