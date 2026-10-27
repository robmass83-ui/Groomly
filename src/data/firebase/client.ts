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
 * 7. La chiave Brevo sta nel secret, non nel codice:
 *    `firebase functions:secrets:set BREVO_API_KEY --project groomly-3128b`
 *    I modelli Brevo 3 e 4 hanno il mittente noreply@groomlyapp.it.
 *    I link nelle email puntano a https://groomlyapp.it/azione.
 */
import type { FirebaseApp } from 'firebase/app'
import type { Auth, User } from 'firebase/auth'
import type { DocumentData, Firestore, UpdateData } from 'firebase/firestore'
import type { FirebaseStorage } from 'firebase/storage'
import { getAccount, type LocalAccount } from '../local/auth'
import { forgetLocalAppointments, listAppointments } from '../local/appointments'
import { closuresToLocalMap, listClosures } from '../local/closures'
import { listDogs, forgetLocalDog } from '../local/dogs'
import { listServices } from '../local/services'
import { getSettings, blankSettings, type PriceFile, type SettingsMain } from '../local/settings'
import { storageKeys } from '../local/storage'
import { AppError } from '../errors'
import { SERVICE_SEED } from '../seed/services'
import { normalizeVat } from '../../lib/profile'
import { livelloElenco } from '../../lib/funzioniPiano'
import { businessName, summarizeDirectory, type DirectoryAccount, type SalonDirectory } from '../../lib/salonDirectory'
import { discardPendingPhotos } from '../../lib/pendingPhoto'
import { isLauraEmail, isSharedEmail, isSharedNonLauraEmail, newOwnerAccount, salonCollection, sharedMemberAccount, SHARED_SALON_ID, type AccountRole, type CloudAccount } from '../../lib/salonPath'
import type { SalonAccess, SalonMember } from '../../lib/salonRoster'
import { isSharedMirrorTrusted, trustSharedMirror } from '../../lib/sharedMirror'
import type { CategoriaSuggerimento } from '../../lib/categorieSuggerimento'
import { backupDay, dailyBackupDue, isEmptyBackup, readRestoreBundle, type BackupBundle } from '../../lib/backupDoc'
import { isFileRef } from '../../lib/fileBytes'
import { verifyPassword } from '../../lib/password'
import { readPushPrefs, type PushPrefs } from '../../lib/pushDue'
import { closureRangeOk, closureReasonOk, type Closure } from '../../lib/closures'
import { appointmentKind } from '../../lib/personal'
import { appointmentMatchedByDeletedDog, appointmentRemovedWithDog } from '../../lib/personalSync'
import {
  appointmentFromDocMaybe,
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
  notifyCloudUnavailable,
  notifySaveFailed,
} from './enabled'
import { createFileStore, type FileOwner, type FileStore, type FileVariant } from './files'
import { appointmentsToLocalMap, dogsToLocalMap, servicesToLocalMap, withLocalKey } from './localSeed'
import { bindSalon, clearSalon, currentSalonId, salonDocPath, salonRootPath } from './salonRoot'
import { createUploadQueue } from './taskQueue'
import { shouldSeedServices } from '../../lib/salonListen'
import {
  dogHiddenNow,
  filterAppointments,
  forgetPendingDogDeletion,
  mergeTombstone,
  readDeletion,
  readPendingDogDeletions,
  readTombstone,
  rememberDeletion,
  tombstoneRejectsAppointment,
  tombstoneRejectsDog,
  type Tombstone,
} from '../../lib/tombstone'
import { backupLastAtPatch } from '../../lib/uploadPatch'
import { onFinestraAgenda, pavimentoAgenda, pavimentoVistaRapida } from '../../lib/finestraAgenda'

export { firebaseEnabled } from './enabled'
export { currentSalonId } from './salonRoot'

let appPromise: Promise<FirebaseApp> | null = null
let authPromise: Promise<Auth> | null = null
let dbPromise: Promise<Firestore> | null = null
let storagePromise: Promise<FirebaseStorage> | null = null
let knownUid: string | null = null
let migrationTask: Promise<boolean> | null = null
let cloudReplaceDepth = 0
let shareTask: Promise<void> | null = null
let shareUid: string | null = null

let accountDoc: { uid: string; data: Record<string, unknown> } | null = null
let emailVerified = false
let registration: Promise<unknown> | null = null

function salonPath(...tail: string[]): [string, ...string[]] {
  const [head, ...rest] = [...salonRootPath(), ...tail]
  return [head, ...rest]
}

// Coda solo in memoria: un refresh la perde e non aggiunge chiavi localStorage.
// Un upload fallito chiama notifySaveFailed («Salvataggio non riuscito»).
const uploadQueue = createUploadQueue(() => {
  notifySaveFailed()
})

function firebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
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
    return new AppError('Questa email ha già un account', 'auth_email_taken')
  }
  if (error instanceof AppError) return error
  return new AppError('Email o password non corretti', 'auth_invalid')
}

function mapMailError(error: unknown): AppError {
  const code = firebaseCode(error)
  if (code === 'auth/network-request-failed' || code === 'functions/unavailable' || code === 'functions/deadline-exceeded') {
    return new AppError('Connessione assente', 'auth_offline')
  }
  if (
    code === 'auth/too-many-requests'
    || code === 'functions/resource-exhausted'
    || code === 'functions/internal'
    || code === 'functions/failed-precondition'
  ) {
    return new AppError('Aspetta un momento e riprova', 'auth_slow')
  }
  return mapAuthError(error)
}

async function attachEmulators(kind: 'auth' | 'firestore' | 'functions', target: unknown): Promise<void> {
  if (import.meta.env.VITE_EMULATORS !== '1') return
  if (kind === 'auth') {
    const { connectAuthEmulator } = await import('firebase/auth')
    connectAuthEmulator(target as Auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    return
  }
  if (kind === 'firestore') {
    const { connectFirestoreEmulator } = await import('firebase/firestore')
    try {
      connectFirestoreEmulator(target as Firestore, '127.0.0.1', 8080)
    } catch {
      // già collegato
    }
    return
  }
  const { connectFunctionsEmulator } = await import('firebase/functions')
  try {
    connectFunctionsEmulator(target as Parameters<typeof connectFunctionsEmulator>[0], '127.0.0.1', 5001)
  } catch {
    // già collegato
  }
}

async function callCallable(name: string, data: Record<string, unknown>): Promise<void> {
  const { getFunctions, httpsCallable } = await import('firebase/functions')
  const functions = getFunctions(await firebaseApp(), 'europe-west1')
  await attachEmulators('functions', functions)
  await httpsCallable(functions, name)(data)
}

export async function callSetSalonPro(salonId: string, enabled: boolean): Promise<void> {
  await callCallable('setSalonPro', { salonId, enabled })
}

export async function callInviaCampione(): Promise<{ spedite: number; motivo?: string }> {
  const { getFunctions, httpsCallable } = await import('firebase/functions')
  const functions = getFunctions(await firebaseApp(), 'europe-west1')
  await attachEmulators('functions', functions)
  const result = await httpsCallable(functions, 'inviaCampioneEmail')({})
  const data = result && typeof result === 'object' && 'data' in result ? result.data : null
  if (!data || typeof data !== 'object') return { spedite: 0 }
  const spedite = 'spedite' in data && typeof data.spedite === 'number' ? data.spedite : 0
  const motivo = 'motivo' in data && typeof data.motivo === 'string' ? data.motivo : undefined
  return motivo ? { spedite, motivo } : { spedite }
}

export async function callAvviaProva(): Promise<void> {
  await callCallable('avviaProva', {})
}

export async function callGestisciPrenotazione(id: string, token: string, azione: 'accettata' | 'rifiutata'): Promise<void> {
  await callCallable('gestisciPrenotazione', { salonId: currentSalonId() ?? '', id, token, azione })
}

export async function callFermaCoda(id: string): Promise<void> {
  const { getFunctions, httpsCallable } = await import('firebase/functions')
  const functions = getFunctions(await firebaseApp(), 'europe-west1')
  await attachEmulators('functions', functions)
  await httpsCallable(functions, 'fermaCoda')({ id })
}

export async function callInviaSubito(id: string): Promise<{ stato: 'in_coda' | 'fermata' | 'inviata' | 'non_inviata' | 'chiusa'; motivo: string }> {
  const { getFunctions, httpsCallable } = await import('firebase/functions')
  const functions = getFunctions(await firebaseApp(), 'europe-west1')
  await attachEmulators('functions', functions)
  const result = await httpsCallable(functions, 'inviaSubito')({ id })
  const data = result && typeof result === 'object' && 'data' in result ? result.data : null
  const stato = data && typeof data === 'object' && 'stato' in data ? data.stato : ''
  const motivo = data && typeof data === 'object' && 'motivo' in data && typeof data.motivo === 'string' ? data.motivo : ''
  if (stato !== 'in_coda' && stato !== 'fermata' && stato !== 'inviata' && stato !== 'non_inviata' && stato !== 'chiusa') {
    throw new Error('invio')
  }
  return { stato, motivo }
}

export async function listenRichiesteNuove(onData: (righe: { id: string; nome: string; token: string }[]) => void): Promise<() => void> {
  const db = await database()
  const { collection, onSnapshot, query, where } = await loadFirestore()
  const q = query(collection(db, ...salonPath('richieste')), where('status', '==', 'nuova'))
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((doc) => {
      const data = doc.data() as { nome?: unknown; token?: unknown }
      return {
        id: doc.id,
        nome: typeof data.nome === 'string' ? data.nome : '',
        token: typeof data.token === 'string' ? data.token : '',
      }
    }))
  }, () => onData([]))
}

export async function inviaSuggerimento(input: {
  email: string
  categoria: CategoriaSuggerimento
  testo: string
  lingua: string
  versione: string
}): Promise<void> {
  const user = (await auth()).currentUser
  if (!user) throw new Error('auth')
  const db = await database()
  const { addDoc, collection, serverTimestamp } = await loadFirestore()
  await addDoc(collection(db, 'suggerimenti'), {
    uid: user.uid,
    salonId: currentSalonId() ?? user.uid,
    email: input.email,
    categoria: input.categoria,
    testo: input.testo,
    lingua: input.lingua,
    versione: input.versione,
    creato: serverTimestamp(),
  })
}

export const LIMITE_SUGGERIMENTI = 400

export type SuggerimentoArrivato = {
  id: string
  email: string
  categoria: string
  testo: string
  salonId: string
  creato: number | null
}

function millisecondi(value: unknown): number | null {
  if (!value || typeof value !== 'object' || !('toMillis' in value)) return null
  const toMillis = (value as { toMillis?: unknown }).toMillis
  if (typeof toMillis !== 'function') return null
  const n = toMillis.call(value) as unknown
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

export async function elencoSuggerimenti(): Promise<SuggerimentoArrivato[]> {
  const db = await database()
  const { collection, getDocs, limit, orderBy, query } = await loadFirestore()
  const snap = await getDocs(query(collection(db, 'suggerimenti'), orderBy('creato', 'desc'), limit(LIMITE_SUGGERIMENTI)))
  return snap.docs.map((doc) => {
    const data = doc.data() as { email?: unknown; categoria?: unknown; testo?: unknown; salonId?: unknown; creato?: unknown }
    return {
      id: doc.id,
      email: typeof data.email === 'string' ? data.email : '',
      categoria: typeof data.categoria === 'string' ? data.categoria : '',
      testo: typeof data.testo === 'string' ? data.testo : '',
      salonId: typeof data.salonId === 'string' ? data.salonId : '',
      creato: millisecondi(data.creato),
    }
  })
}

export async function callEliminaAccount(): Promise<void> {
  await callCallable('eliminaAccount', {})
}

export async function callPubblicaSalone(nome: string): Promise<void> {
  await callCallable('pubblicaSalone', { nome })
}

export async function callImpostaPiano(salonId: string, azione: 'prova' | 'pro' | 'salone' | 'base'): Promise<void> {
  await callCallable('impostaPianoManuale', { salonId, azione })
}

export async function callImpostaFunzione(salonId: string, chiave: string, acceso: boolean): Promise<void> {
  await callCallable('impostaFunzione', { salonId, chiave, acceso })
}

export async function callCreateInvite(email: string, role: 'socio' | 'collaboratore'): Promise<void> {
  await callCallable('createInvite', { email, role })
}

export async function callRevokeMember(uid: string): Promise<void> {
  await callCallable('revokeMember', { uid })
}

export async function callChangeMemberRole(uid: string, role: 'socio' | 'collaboratore'): Promise<void> {
  await callCallable('changeMemberRole', { uid, role })
}

export async function callAcceptInvite(token: string): Promise<void> {
  await callCallable('acceptInvite', { token })
}

async function callAuthMail(name: 'sendVerificationEmail' | 'sendPasswordResetEmail', data: Record<string, unknown> = {}): Promise<{ alreadyVerified: boolean }> {
  const { getFunctions, httpsCallable } = await import('firebase/functions')
  const functions = getFunctions(await firebaseApp(), 'europe-west1')
  await attachEmulators('functions', functions)
  const result = await httpsCallable(functions, name)(data)
  const payload = result && typeof result === 'object' && 'data' in result ? result.data : undefined
  const alreadyVerified = !!payload && typeof payload === 'object' && 'alreadyVerified' in payload && payload.alreadyVerified === true
  return { alreadyVerified }
}

async function firebaseApp(): Promise<FirebaseApp> {
  if (!appPromise) {
    appPromise = (async () => {
      const { getApps, initializeApp } = await import('firebase/app')
      const { preparaAppCheck } = await import('../../lib/appCheck')
      const app = getApps()[0] ?? initializeApp(firebaseConfig())
      await preparaAppCheck(app, 'app')
      return app
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
      const session = getAuth(await firebaseApp())
      await attachEmulators('auth', session)
      return session
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
      let db: Firestore
      try {
        db = initializeFirestore(app, {
          localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
        })
      } catch {
        db = getFirestore(app)
      }
      await attachEmulators('firestore', db)
      return db
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

// Un task in coda calcola il percorso del salone quando parte, non quando è nato.
// Si ricorda il salone di chi l'ha messo in coda: se al via il salone è un altro, esce senza scrivere
// e senza lanciare, perché un errore lo rimetterebbe in coda e partirebbe sul salone nuovo.
function forSalon(task: () => Promise<void>): () => Promise<void> {
  const salon = currentSalonId()
  return async () => {
    if (currentSalonId() !== salon) return
    await task()
  }
}

function enqueueTask(task: () => Promise<void>): void {
  uploadQueue.enqueue(forSalon(task))
}

// La promessa resta aperta se il tentativo fallisce: il toast è onFail della coda,
// e un rifiuto qui farebbe suonare di nuovo notifySaveFailed nel catch del hook.
function enqueueFirstTask(task: () => Promise<void>): Promise<void> {
  const guarded = forSalon(task)
  return new Promise((resolve) => {
    uploadQueue.enqueueFirst(() => guarded().then(() => {
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

function errorCode(error: unknown): string {
  if (!error || typeof error !== 'object' || !('code' in error)) return ''
  return String((error as { code: unknown }).code)
}

function isPermissionDenied(error: unknown): boolean {
  const code = errorCode(error)
  return code === 'permission-denied' || code === 'firestore/permission-denied'
}

function isOfflineFailure(error: unknown): boolean {
  if (isPermissionDenied(error)) return false
  const code = errorCode(error)
  if (code === 'unavailable' || code === 'firestore/unavailable' || code === 'failed-precondition' || code === 'firestore/failed-precondition') return true
  const message = error instanceof Error ? error.message : ''
  return /rete|offline|unavailable|network/i.test(message)
}

async function readDoc(path: string[], fromServer = false): Promise<Record<string, unknown> | null> {
  const { doc, getDoc } = await loadFirestore()
  const ref = doc(await database(), path[0], ...path.slice(1))
  const read = getDoc as (target: typeof ref, options?: { source: 'server' | 'cache' }) => ReturnType<typeof getDoc>
  try {
    const snap = await read(ref, fromServer ? { source: 'server' } : undefined)
    if (!snap.exists()) return null
    return snap.data() as Record<string, unknown>
  } catch (error) {
    if (fromServer || !isOfflineFailure(error)) throw error
    try {
      const cached = await read(ref, { source: 'cache' })
      if (!cached.exists()) return null
      return cached.data() as Record<string, unknown>
    } catch {
      return null
    }
  }
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
  const data = await readDoc(salonDocPath('meta', 'deleted-dogs'), true)
  const ids = Array.isArray(data?.ids) ? data.ids : []
  return new Set(ids.filter((item): item is string => typeof item === 'string'))
}

async function copyUserKind(uid: string, kind: 'dogs' | 'appointments' | 'services'): Promise<void> {
  const { collection, getDocs } = await loadFirestore()
  const db = await database()
  const readDocs = getDocs as (target: ReturnType<typeof collection>, options?: { source: 'server' }) => ReturnType<typeof getDocs>
  const snap = await readDocs(collection(db, 'users', uid, kind), { source: 'server' })
  const stone = kind === 'dogs' || kind === 'appointments'
    ? mergeTombstone(readDeletion(), await cloudDeletion(true))
    : null
  for (const item of snap.docs) {
    const data = item.data() as Record<string, unknown>
    const dogId = typeof data.dogId === 'string' ? data.dogId : ''
    const fieldId = typeof data.id === 'string' ? data.id : ''
    const personal = kind === 'appointments' && data.kind === 'personale'
    const droppedDog = stone
      ? (kind === 'dogs'
        ? tombstoneRejectsDog(stone, item.id) || tombstoneRejectsDog(stone, fieldId)
        : tombstoneRejectsAppointment(stone, item.id, dogId, personal))
      : false
    if (droppedDog) continue
    const kept = copyableDoc(data)
    const current = await readDoc(salonDocPath(kind, item.id), true)
    if (current) continue
    const ready = kind === 'dogs'
      ? await liftDogDoc(uid, item.id, kept)
      : kind === 'appointments'
        ? await liftVisitDoc(uid, item.id, kept)
        : kept
    if (containsDataUrl(ready)) throw new AppError('Salvataggio non riuscito', 'storage_write')
    await putDoc(salonDocPath(kind, item.id), ready)
  }
}

async function copyUserSettings(uid: string): Promise<void> {
  const data = await readDoc(['users', uid, 'settings', 'main'], true)
  if (!data) return
  const incoming = copyableDoc(data)
  delete incoming.theme
  const current = await readDoc(salonDocPath('settings', 'main'), true)
  if (current && !settingsBlank(current)) return
  if (!shouldCopy('settings', 'main', incoming, current)) return
  await putDoc(salonDocPath('settings', 'main'), incoming)
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
  const refs = files.map((file) => file.dataUrl).filter(isFileRef)
  const sheet = doc.priceSheet
  const logo = sheet && typeof sheet === 'object' && !Array.isArray(sheet)
    ? (sheet as { intestazione?: { logo?: unknown } }).intestazione?.logo
    : undefined
  if (isFileRef(logo)) refs.push(logo)
  return refs
}

type MediaField = 'photo' | 'gallery' | 'photos'

function withKeptMedia(data: Record<string, unknown>, current: Record<string, unknown> | null, fields: MediaField[]): { next: Record<string, unknown>; dropped: string[] } {
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
  return { next, dropped: mediaRefs(current).filter((ref) => !kept.has(ref)) }
}

function withMissingMedia(incoming: Record<string, unknown>, current: Record<string, unknown>, fields: MediaField[]): Record<string, unknown> | null {
  const removed = new Set(removedIds(incoming, current))
  const next = { ...current }
  let changed = false
  for (const field of fields.filter((item) => item !== 'photo')) {
    const present = new Set(asRecords(current[field]).map((item) => String(item.id ?? '')))
    const missing = asRecords(incoming[field]).filter((item) => {
      const id = String(item.id ?? '')
      if (!isDataUrl(item.photo as string | undefined) || present.has(id) || removed.has(id)) return false
      present.add(id)
      return true
    })
    if (missing.length === 0) continue
    next[field] = [...asRecords(current[field]), ...missing]
    changed = true
  }
  const removedPhotos = new Set(asRecords(incoming.gallery).filter((item) => removed.has(String(item.id ?? ''))).map((item) => item.photo))
  const hasPhoto = typeof current.photo === 'string' && current.photo.length > 0
  if (fields.includes('photo') && !hasPhoto && isDataUrl(incoming.photo as string | undefined) && !removedPhotos.has(incoming.photo)) {
    next.photo = incoming.photo
    changed = true
  }
  return changed ? next : null
}

async function saveWithMedia(
  path: string[],
  incoming: Record<string, unknown>,
  fields: MediaField[],
  upload: () => Promise<Record<string, unknown>>,
  lift: (data: Record<string, unknown>) => Promise<Record<string, unknown>>,
  stillWanted: () => boolean | Promise<boolean> = () => true,
): Promise<void> {
  const current = await readDoc(path)
  const stale = current !== null && isStaleWrite(incoming, current)
  const kept = stale ? { next: withMissingMedia(incoming, current, fields), dropped: [] } : withKeptMedia(await upload(), current, fields)
  if (!kept.next || !(await stillWanted())) return
  const data = await lift(kept.next)
  if (containsDataUrl(data)) throw new AppError('Salvataggio non riuscito', 'storage_write')
  if (!(await stillWanted())) return
  await putDoc(path, data)
  await dropFiles(kept.dropped)
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
  await putDoc(salonDocPath('members', uid), { uid, at: Date.now() })
  const marker = await readDoc(salonDocPath('meta', `restored-${uid}`), true)
  if (marker?.done !== true) {
    await copyUserKind(uid, 'dogs')
    await copyUserKind(uid, 'appointments')
    await copyUserKind(uid, 'services')
    await copyUserSettings(uid)
    await putDoc(salonDocPath('meta', `restored-${uid}`), { done: true, at: Date.now() })
  }
}

async function replayLocalDeletion(): Promise<void> {
  const pending = readDeletion()
  if (pending.ids.length === 0 && pending.appointmentIds.length === 0) return
  const task = async () => {
    const local = readDeletion()
    if (local.ids.length === 0 && local.appointmentIds.length === 0) return
    const cloud = readTombstone(await readDoc(salonDocPath('meta', 'deleted-dogs'), true))
    const dogIds = local.ids.filter((id) => !cloud.ids.includes(id))
    const visitIds = local.appointmentIds.filter((id) => !cloud.appointmentIds.includes(id))
    if (dogIds.length === 0 && visitIds.length === 0) return
    const { collection, deleteDoc, doc, getDocs } = await loadFirestore()
    const db = await database()
    const found: string[] = []
    if (dogIds.length > 0) {
      const snap = await getDocs(collection(db, ...salonPath('appointments')))
      for (const item of snap.docs) {
        const data = item.data() as { dogId?: unknown; kind?: unknown }
        if (!appointmentMatchedByDeletedDog(data, dogIds)) continue
        if (!visitIds.includes(item.id) && !cloud.appointmentIds.includes(item.id)) found.push(item.id)
      }
    }
    const appointmentIds = [...visitIds, ...found]
    await writeDeletionSign(dogIds, appointmentIds)
    await Promise.all([
      ...dogIds.map((id) => deleteDoc(doc(db, ...salonPath('dogs', id)))),
      ...appointmentIds.map((id) => deleteDoc(doc(db, ...salonPath('appointments', id)))),
    ])
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    void enqueueFirstTask(task)
    return
  }
  await enqueueFirstTask(task)
}

async function markSharedMember(uid: string): Promise<void> {
  await putDoc(salonDocPath('members', uid), { uid, at: Date.now() })
}

function ensureShared(uid: string, email: string | null): Promise<void> {
  if (currentSalonId() !== SHARED_SALON_ID) return Promise.resolve()
  if (shareTask && shareUid === uid) return shareTask
  shareUid = uid
  const copy = isLauraEmail(email)
  shareTask = (copy ? restoreAccount(uid).then(() => replayLocalDeletion()) : markSharedMember(uid)).then(() => {
    if (copy) void resaveLocalMedia(uid).catch(() => undefined)
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
  await setDoc(doc(await database(), ...salonPath('meta', 'deleted-dogs')), data, { merge: true })
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

/** Con includeMetadataChanges un evento può non avere documenti nuovi: conta solo se fromCache cambia. */
function soloMetadati(snap: { docChanges?: () => unknown[] }, consegnati: boolean): boolean {
  if (!consegnati || typeof snap.docChanges !== 'function') return false
  return snap.docChanges().length === 0
}

function usesOnlyCloudDeletion(): boolean {
  const email = docText(accountDoc?.data ?? null, 'email')
  return currentSalonId() === SHARED_SALON_ID && isSharedEmail(email) && !isLauraEmail(email)
}

function deletionForActiveSalon(cloud: Tombstone): Tombstone {
  return usesOnlyCloudDeletion() ? cloud : mergeTombstone(readDeletion(), cloud)
}

// Unione di meta/deleted-dogs e degli id nella raccolta deletedDogs.
async function cloudDeletion(fromServer = false): Promise<Tombstone> {
  try {
    const legacy = readTombstone(await readDoc(salonDocPath('meta', 'deleted-dogs'), fromServer))
    const { collection, getDocs } = await loadFirestore()
    const readDocs = getDocs as (target: ReturnType<typeof collection>, options?: { source: 'server' }) => ReturnType<typeof getDocs>
    const snap = await readDocs(collection(await database(), ...salonPath('deletedDogs')), fromServer ? { source: 'server' } : undefined)
    return mergeTombstone(legacy, { ids: snap.docs.map((item) => item.id), appointmentIds: [] })
  } catch (error) {
    if (!isOfflineFailure(error)) throw error
    return readDeletion()
  }
}

async function readSignOrNull(): Promise<Tombstone | null> {
  const { collection, doc, getDoc, getDocs } = await loadFirestore()
  const db = await database()
  const ref = doc(db, ...salonPath('meta', 'deleted-dogs'))
  let legacy: Tombstone
  try {
    const snap = await getDoc(ref)
    legacy = readTombstone(snap.exists() ? snap.data() as Record<string, unknown> : null)
  } catch (error) {
    if (isPermissionDenied(error)) throw error
    return null
  }
  try {
    const readDocs = getDocs as (target: ReturnType<typeof collection>) => ReturnType<typeof getDocs>
    const snap = await readDocs(collection(db, ...salonPath('deletedDogs')))
    return mergeTombstone(legacy, { ids: snap.docs.map((item) => item.id), appointmentIds: [] })
  } catch (error) {
    if (isPermissionDenied(error)) throw error
    return null
  }
}

async function mergedDeletion(): Promise<Tombstone | null> {
  try {
    const cloud = await readSignOrNull()
    if (!cloud) return null
    const merged = deletionForActiveSalon(cloud)
    if (merged.ids.length > 0 || merged.appointmentIds.length > 0) rememberDeletion(merged)
    return merged
  } catch {
    return null
  }
}

function dogRejectedNow(stone: Tombstone, dog: Pick<Dog, 'id' | 'sourceDocId'>): boolean {
  const ids = [dog.id, dog.sourceDocId].filter((item): item is string => typeof item === 'string' && item.length > 0)
  return ids.some((item) => tombstoneRejectsDog(stone, item) || dogHiddenNow(item))
}

export async function saveDog(uid: string, dog: Dog, _waitForUploads = false): Promise<void> {
  const stone = deletionForActiveSalon(await cloudDeletion())
  if (dogRejectedNow(stone, dog)) return
  const stillWanted = async (): Promise<boolean> => {
    try {
      return !dogRejectedNow(deletionForActiveSalon(await cloudDeletion()), dog)
    } catch (error) {
      return !isPermissionDenied(error)
    }
  }
  await saveWithMedia(
    salonDocPath('dogs', dog.id),
    dogToDoc(dog),
    ['photo', 'gallery'],
    async () => dogToDoc(await uploadDogMedia(uid, dog)),
    (data) => liftDogDoc(uid, dog.id, data),
    stillWanted,
  )
}

export async function removeDog(_uid: string, id: string, sourceDocId?: string): Promise<void> {
  await enqueueFirstTask(async () => {
    const signIds = [...new Set([id, sourceDocId ?? ''].filter((item) => item.length > 0))]
    const { collection, deleteDoc, doc, getDocs } = await loadFirestore()
    const db = await database()
    // Il segno durevole prima di ogni lettura: se una lettura fallisce, il cane non rientra.
    for (const item of signIds) await putDoc(salonDocPath('deletedDogs', item), { at: Date.now() })
    const dogSnap = await getDocs(collection(db, ...salonPath('dogs')))
    const dogDocs = dogSnap.docs.filter((item) => {
      const fieldId = (item.data() as Record<string, unknown>).id
      return signIds.includes(item.id) || (typeof fieldId === 'string' && signIds.includes(fieldId))
    })
    const dogRefs = dogDocs.flatMap((item) => mediaRefs(item.data() as Record<string, unknown>))
    for (const item of dogDocs) await deleteDoc(item.ref)
    for (const item of signIds) {
      if (!dogDocs.some((found) => found.id === item)) await deleteDoc(doc(db, ...salonPath('dogs', item)))
    }
    const merged = deletionForActiveSalon(await cloudDeletion())
    const snap = await getDocs(collection(db, ...salonPath('appointments')))
    const doomed = snap.docs.filter((item) => appointmentRemovedWithDog(
      item.id,
      item.data() as { dogId?: unknown; kind?: unknown },
      id,
      merged.appointmentIds,
    ))
    const newVisitIds = doomed.map((item) => item.id).filter((item) => !merged.appointmentIds.includes(item))
    await writeDeletionSign(signIds, newVisitIds)
    let visitRefs: string[] = []
    try {
      await Promise.all(doomed.map((item) => deleteDoc(item.ref)))
      visitRefs = doomed.flatMap((item) => mediaRefs(item.data() as Record<string, unknown>))
    } catch {
      // Le visite non riportano il cane in lista.
    }
    await dropFiles([...dogRefs, ...visitRefs])
  })
}

export async function listenDogs(uid: string, onData: (dogs: Dog[], fromCache?: boolean) => void): Promise<() => void> {
  const db = await database()
  void ensureShared(uid, docText(accountDoc?.uid === uid ? accountDoc.data : null, 'email') || null).catch(() => notifySaveFailed())
  const { collection, onSnapshot } = await loadFirestore()
  let seq = 0
  const retried = new Set<string>()
  let consegnati = false
  let cachePrecedente: boolean | null = null
  let ultimi: Dog[] = []
  return onSnapshot(collection(db, ...salonPath('dogs')), { includeMetadataChanges: true }, (snap) => {
    const cached = fromCacheOf(snap)
    if (soloMetadati(snap, consegnati)) {
      if (cached !== cachePrecedente) {
        cachePrecedente = cached
        onData(ultimi, cached)
      }
      return
    }
    if (snap.empty && cached) return
    const mine = ++seq
    void (async () => {
      const stone = await mergedDeletion()
      if (mine !== seq || !stone) return
      for (const pending of readPendingDogDeletions()) {
        if (stone.ids.includes(pending)) forgetPendingDogDeletion(pending)
        else if (!retried.has(pending)) {
          retried.add(pending)
          void removeDog(uid, pending)
        }
      }
      const dogs = snap.docs.map((item) => dogFromDoc(item.id, item.data() as Record<string, unknown>))
      dogs.sort((a, b) => a.name.localeCompare(b.name, 'it') || a.id.localeCompare(b.id))
      const visibili = dogs.filter((dog) => !tombstoneRejectsDog(stone, dog.id) && !(dog.sourceDocId && tombstoneRejectsDog(stone, dog.sourceDocId)))
      ultimi = visibili
      consegnati = true
      cachePrecedente = cached
      onData(visibili, cached)
    })().catch(() => notifySaveFailed())
  }, () => {
    notifySaveFailed()
    notifyCloudUnavailable()
  })
}

export async function saveAppointment(uid: string, appointment: Appointment, _waitForUploads = false): Promise<void> {
  const stone = deletionForActiveSalon(readTombstone(await readDoc(salonDocPath('meta', 'deleted-dogs'))))
  const personal = appointmentKind(appointment) === 'personale'
  if (tombstoneRejectsAppointment(stone, appointment.id, appointment.dogId, personal)) return
  const stillWanted = () => !tombstoneRejectsAppointment(readDeletion(), appointment.id, appointment.dogId, personal)
  await saveWithMedia(
    salonDocPath('appointments', appointment.id),
    appointmentToDoc(appointment),
    ['photos'],
    async () => appointmentToDoc(await uploadAppointmentMedia(uid, appointment)),
    (data) => liftVisitDoc(uid, appointment.id, data),
    stillWanted,
  )
}

export async function removeAppointment(_uid: string, id: string): Promise<void> {
  await enqueueFirstTask(async () => {
    const cloud = readTombstone(await readDoc(salonDocPath('meta', 'deleted-dogs')))
    const merged = deletionForActiveSalon(cloud)
    const appointmentIds = merged.appointmentIds.includes(id) ? merged.appointmentIds : [...merged.appointmentIds, id]
    await writeDeletionSign(merged.ids, appointmentIds)
    const { doc, deleteDoc } = await loadFirestore()
    const db = await database()
    const current = await readDoc(salonDocPath('appointments', id))
    await deleteDoc(doc(db, ...salonPath('appointments', id)))
    await dropFiles(mediaRefs(current))
  })
}

export async function listenAppointments(uid: string, onData: (appointments: Appointment[], fromCache?: boolean, deletedAppointmentIds?: readonly string[], completa?: boolean) => void): Promise<() => void> {
  const db = await database()
  void ensureShared(uid, docText(accountDoc?.uid === uid ? accountDoc.data : null, 'email') || null).catch(() => notifySaveFailed())
  const { collection, onSnapshot, query, where } = await loadFirestore()
  let seq = 0
  let vistaIntera = false
  let stopSnap = () => {}
  const attach = () => {
    stopSnap()
    vistaIntera = false
    const stops: Array<() => void> = []
    let consegnati = false
    let cachePrecedente: boolean | null = null
    let ultimi: Appointment[] = []
    let ultimiCancellati: readonly string[] | undefined
    let ultimaCompleta = false
    const bind = (floor: number, intera: boolean) => {
      const source = query(collection(db, ...salonPath('appointments')), where('start', '>=', floor))
      stops.push(onSnapshot(source, { includeMetadataChanges: true }, (snap) => {
        if (!intera && vistaIntera) return
        if (intera) vistaIntera = true
        const cached = fromCacheOf(snap)
        if (soloMetadati(snap, consegnati)) {
          if (cached !== cachePrecedente) {
            cachePrecedente = cached
            onData(ultimi, cached, ultimiCancellati, ultimaCompleta)
          }
          return
        }
        if (snap.empty && cached) return
        const mine = ++seq
        const appointments = snap.docs.flatMap((item) => {
          const parsed = appointmentFromDocMaybe(item.id, item.data() as Record<string, unknown>)
          return parsed ? [parsed] : []
        })
        appointments.sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id))
        ultimi = appointments
        ultimiCancellati = undefined
        ultimaCompleta = intera
        consegnati = true
        cachePrecedente = cached
        onData(appointments, cached, undefined, intera)
        if (!intera && !cached && !annoAvviato) {
          annoAvviato = true
          bind(intero, true)
        }
        void (async () => {
          const stone = await mergedDeletion()
          if (mine !== seq || !stone) return
          const filtrati = filterAppointments(appointments, stone)
          ultimi = filtrati
          ultimiCancellati = stone.appointmentIds
          ultimaCompleta = intera
          consegnati = true
          cachePrecedente = cached
          onData(filtrati, cached, stone.appointmentIds, intera)
        })().catch(() => notifySaveFailed())
      }, () => {
        notifySaveFailed()
        notifyCloudUnavailable()
      }))
    }
    const intero = pavimentoAgenda()
    const rapido = Math.max(intero, pavimentoVistaRapida())
    let annoAvviato = false
    if (rapido > intero) bind(rapido, false)
    else bind(intero, true)
    stopSnap = () => {
      for (const stop of stops) stop()
    }
  }
  attach()
  const stopFloor = onFinestraAgenda(attach)
  return () => {
    stopFloor()
    stopSnap()
  }
}

const CLOSURE_DAY = /^\d{4}-\d{2}-\d{2}$/

function closureFieldsOk(reason: string, startDay: string, endDay: string): boolean {
  return closureReasonOk(reason)
    && CLOSURE_DAY.test(startDay)
    && CLOSURE_DAY.test(endDay)
    && closureRangeOk(startDay, endDay)
}

function closureFromDoc(id: string, data: Record<string, unknown>): Closure | null {
  const reason = typeof data.reason === 'string' ? data.reason.trim() : ''
  const startDay = typeof data.startDay === 'string' ? data.startDay : ''
  const endDay = typeof data.endDay === 'string' ? data.endDay : ''
  const createdAt = typeof data.createdAt === 'number' ? data.createdAt : Number.NaN
  const updatedAt = typeof data.updatedAt === 'number' ? data.updatedAt : Number.NaN
  if (!id || !closureFieldsOk(reason, startDay, endDay)) return null
  if (!Number.isFinite(createdAt) || !Number.isFinite(updatedAt)) return null
  return { id, reason, startDay, endDay, createdAt: new Date(createdAt), updatedAt: new Date(updatedAt) }
}

export async function saveClosure(_uid: string, closure: Closure): Promise<void> {
  const reason = closure.reason.trim()
  const datesOk = !Number.isNaN(closure.createdAt.getTime()) && !Number.isNaN(closure.updatedAt.getTime())
  if (!closure.id || !datesOk || !closureFieldsOk(reason, closure.startDay, closure.endDay)) return
  await putDoc(salonDocPath('closures', closure.id), {
    reason,
    startDay: closure.startDay,
    endDay: closure.endDay,
    createdAt: closure.createdAt.getTime(),
    updatedAt: closure.updatedAt.getTime(),
  })
}

export async function removeClosure(_uid: string, id: string): Promise<void> {
  const { deleteDoc, doc } = await loadFirestore()
  await deleteDoc(doc(await database(), ...salonPath('closures', id)))
}

export async function listenClosures(uid: string, onData: (closures: Closure[], fromCache?: boolean) => void): Promise<() => void> {
  const db = await database()
  void ensureShared(uid, docText(accountDoc?.uid === uid ? accountDoc.data : null, 'email') || null).catch(() => notifySaveFailed())
  const { collection, onSnapshot } = await loadFirestore()
  return onSnapshot(collection(db, ...salonPath('closures')), (snap) => {
    const cached = fromCacheOf(snap)
    if (snap.empty && cached) return
    const closures = snap.docs.flatMap((item) => {
      const parsed = closureFromDoc(item.id, item.data() as Record<string, unknown>)
      return parsed ? [parsed] : []
    })
    closures.sort((a, b) => a.startDay.localeCompare(b.startDay) || a.id.localeCompare(b.id))
    onData(closures, cached)
  }, () => {
    notifySaveFailed()
  })
}

export async function saveService(_uid: string, service: Service): Promise<void> {
  await putDoc(salonDocPath('services', service.id), serviceToDoc(service))
}

export async function saveServices(uid: string, services: Service[]): Promise<void> {
  await Promise.all(services.map((service) => saveService(uid, service)))
}

async function seedServices(uid: string): Promise<void> {
  const now = new Date()
  await saveServices(uid, SERVICE_SEED.map((service) => ({ ...service, createdAt: now, updatedAt: now })))
}

function canAutomaticallySeedSalon(): boolean {
  return !usesOnlyCloudDeletion()
}

export async function listenServices(uid: string, onData: (services: Service[], fromCache?: boolean) => void): Promise<() => void> {
  const db = await database()
  void ensureShared(uid, docText(accountDoc?.uid === uid ? accountDoc.data : null, 'email') || null).catch(() => notifySaveFailed())
  const { collection, onSnapshot } = await loadFirestore()
  let seeding = false
  return onSnapshot(collection(db, ...salonPath('services')), (snap) => {
    const cached = fromCacheOf(snap)
    if (snap.empty) {
      if (!canAutomaticallySeedSalon() || !shouldSeedServices(true, cached) || seeding || cloudReplaceDepth > 0) return
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
  return isDataUrl(settings.priceList?.dataUrl)
    || settings.priceListHistory.some((file) => isDataUrl(file.dataUrl))
    || isDataUrl(settings.priceSheet?.intestazione.logo)
}

async function withUploadedPrices(uid: string, settings: SettingsMain): Promise<SettingsMain> {
  const priceList = settings.priceList ? await uploadPrice(uid, settings.priceList) : undefined
  const priceListHistory = []
  for (const file of settings.priceListHistory) priceListHistory.push(await uploadPrice(uid, file))
  let priceSheet = settings.priceSheet
  const logo = priceSheet?.intestazione.logo
  if (priceSheet && isDataUrl(logo)) {
    priceSheet = {
      ...priceSheet,
      intestazione: { ...priceSheet.intestazione, logo: await storeFile('listino', 'foto', logo, 'logo') },
    }
  }
  return { ...settings, priceList, priceListHistory, priceSheet }
}

function priceDataUrlsAreRemote(settings: SettingsMain): boolean {
  const files = [...(settings.priceList ? [settings.priceList] : []), ...settings.priceListHistory]
  return files.every((file) => file.dataUrl.startsWith('https://') || isFileRef(file.dataUrl))
}

async function putSettings(written: Record<string, unknown>): Promise<void> {
  const current = await readDoc(salonDocPath('settings', 'main'))
  await putDoc(salonDocPath('settings', 'main'), written)
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

async function settingsWithLocalMedia(local: SettingsMain): Promise<SettingsMain | null> {
  const cloud = await readDoc(salonDocPath('settings', 'main'))
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
    await saveAppointment(uid, appointment, true).catch(() => undefined)
  }
  if (localStorage.getItem(storageKeys.settings(uid)) != null) {
    const settings = getSettings(uid)
    if (containsDataUrl([settings.priceList, ...settings.priceListHistory])) {
      const next = await settingsWithLocalMedia(settings).catch(() => null)
      if (next) await saveSettings(uid, next, true).catch(() => undefined)
    }
  }
}

export async function listenSettings(uid: string, onData: (settings: SettingsMain, fromCache?: boolean) => void): Promise<() => void> {
  const db = await database()
  void ensureShared(uid, docText(accountDoc?.uid === uid ? accountDoc.data : null, 'email') || null).catch(() => notifySaveFailed())
  const { doc, onSnapshot } = await loadFirestore()
  const ref = doc(db, ...salonPath('settings', 'main'))
  let seeding = false
  let consegnati = false
  let cachePrecedente: boolean | null = null
  let ultimi: SettingsMain | null = null
  let firma = ''
  return onSnapshot(ref, { includeMetadataChanges: true }, (snap) => {
    const cached = fromCacheOf(snap)
    const adesso = snap.exists() ? JSON.stringify(snap.data() ?? null) : ''
    if (consegnati && adesso === firma) {
      if (cached !== cachePrecedente && ultimi) {
        cachePrecedente = cached
        onData(ultimi, cached)
      }
      return
    }
    if (!snap.exists()) {
      if (!canAutomaticallySeedSalon() || !shouldSeedServices(true, fromCacheOf(snap)) || seeding || cloudReplaceDepth > 0) return
      seeding = true
      const created = blankSettings('auto', new Date().toISOString())
      ultimi = created
      firma = adesso
      consegnati = true
      cachePrecedente = cached
      onData(created)
      void saveSettings(uid, created).catch(() => {
        seeding = false
        notifySaveFailed()
      })
      return
    }
    seeding = false
    const settings = settingsFromDoc(snap.data() as Record<string, unknown>)
    ultimi = settings
    firma = adesso
    consegnati = true
    cachePrecedente = cached
    onData(settings, cached)
  }, () => {
    notifySaveFailed()
    notifyCloudUnavailable()
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
  const linkedEmail = docText(accountDoc?.uid === firebaseUid ? accountDoc.data : null, 'email')
  // I dati locali del telefono sono del salone di Laura: un altro salone parte vuoto e non li legge.
  if (currentSalonId() !== SHARED_SALON_ID || !isLauraEmail(linkedEmail)) {
    markCloudReady()
    return true
  }
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
    await ensureShared(firebaseUid, linkedEmail)
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

export function lastEmailVerified(): boolean {
  return emailVerified
}

function docText(data: Record<string, unknown> | null, key: string): string {
  const value = data?.[key]
  return typeof value === 'string' ? value : ''
}

export async function listSalonDirectory(): Promise<SalonDirectory> {
  if (!firebaseEnabled()) throw new AppError('Connessione assente', 'auth_offline')
  try {
    const { collection, doc, getDoc, getDocs } = await loadFirestore()
    const db = await database()
    const snap = await getDocs(collection(db, 'accounts'))
    const accounts: DirectoryAccount[] = snap.docs.map((item) => {
      const data = item.data() as Record<string, unknown>
      return {
        uid: item.id,
        firstName: docText(data, 'firstName'),
        lastName: docText(data, 'lastName'),
        email: docText(data, 'email'),
        salonId: docText(data, 'salonId'),
      }
    })
    const ids = [...new Set(accounts.map((item) => item.salonId.trim()).filter((id) => id !== ''))]
    const salonNames = new Map<string, string>()
    await Promise.all(ids.map(async (salonId) => {
      try {
        const path = salonId === SHARED_SALON_ID
          ? ['salon', 'shared', 'settings', 'main']
          : ['salons', salonId, 'settings', 'main']
        const read = await getDoc(doc(db, path[0], ...path.slice(1)))
        salonNames.set(salonId, read.exists() ? businessName(read.data() as Record<string, unknown>) : '')
      } catch {
        salonNames.set(salonId, '')
      }
    }))
    const pro = await Promise.all(accounts.map(async (account) => {
      const salonId = account.salonId.trim()
      let enabled = false
      if (salonId !== '' && !salonId.includes('/')) {
        try {
          const root = salonCollection(salonId)
          const read = await getDoc(doc(db, root[0], ...root.slice(1), 'pro', 'main'))
          const raw = read.exists() ? read.data() : null
          const data = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null
          enabled = data?.enabled === true
          const piano = data?.piano === 'base' || data?.piano === 'pro' || data?.piano === 'salone' ? data.piano : undefined
          const stato = data?.stato === 'attivo' || data?.stato === 'prova' || data?.stato === 'grazia' || data?.stato === 'sospeso' || data?.stato === 'disdetto' || data?.stato === 'scaduto' ? data.stato : undefined
          const fonte = data?.fonte === 'play' || data?.fonte === 'prova' || data?.fonte === 'omaggio' || data?.fonte === 'manuale' ? data.fonte : null
          const scadeIl = typeof data?.scadeIl === 'string' || data?.scadeIl === null ? data.scadeIl : undefined
          const funzioniRaw = data?.funzioni
          const funzioni: Record<string, boolean> = {}
          if (funzioniRaw && typeof funzioniRaw === 'object') {
            for (const [chiave, valore] of Object.entries(funzioniRaw)) {
              if (typeof valore === 'boolean') funzioni[chiave] = valore
            }
          }
          return {
            uid: account.uid,
            salonId,
            enabled,
            livello: livelloElenco({ piano, stato, fonte, scadeIl }),
            funzioni,
          }
        } catch {
          enabled = false
        }
      }
      return { uid: account.uid, salonId, enabled }
    }))
    return { ...summarizeDirectory(accounts, salonNames), pro }
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError('Connessione assente', 'auth_offline')
  }
}

function documentRole(data: Record<string, unknown> | null): AccountRole | undefined {
  const role = data?.role
  if (role === 'titolare' || role === 'socio' || role === 'collaboratore') return role
  return undefined
}

function toAccount(user: User): LocalAccount {
  emailVerified = user.emailVerified === true
  const data = accountDoc?.uid === user.uid ? accountDoc.data : null
  const role = documentRole(data)
  return {
    uid: user.uid,
    email: (user.email ?? '').toLowerCase(),
    passwordHash: '',
    salt: '',
    iterations: 0,
    createdAt: user.metadata.creationTime ?? new Date().toISOString(),
    firstName: docText(data, 'firstName'),
    lastName: docText(data, 'lastName'),
    salonId: docText(data, 'salonId'),
    ...(role ? { role } : {}),
    legacy: data?.legacy === true,
  }
}

function forgetAccount(): void {
  accountDoc = null
  emailVerified = false
  clearSalon()
}

function accountRecord(account: CloudAccount): Record<string, unknown> {
  const data: Record<string, unknown> = {
    firstName: account.firstName,
    lastName: account.lastName,
    email: account.email,
    salonId: account.salonId,
    role: account.role,
    legacy: account.legacy,
  }
  return data
}

// I dati del telefono stanno sotto l'uid, non sotto il salone: chi entra in shared senza essere Laura
// non deve portarli nel salone di Laura. Restano intatti il segno di cancellazione del telefono,
// servizi, impostazioni, file e ogni altro uid.
function discardPhoneData(user: User): void {
  if (!isSharedNonLauraEmail(user.email)) return
  if (isSharedMirrorTrusted(user.uid)) return
  try {
    localStorage.removeItem(storageKeys.dogs(user.uid))
    localStorage.removeItem(storageKeys.appointments(user.uid))
    discardPendingPhotos(user.uid)
    trustSharedMirror(user.uid)
  } catch {
    // Se lo spazio locale non risponde non c'è nulla da scrivere in shared da lì.
  }
}

// Il documento già scritto non si riscrive. La copia in memoria, se chi entra è shared,
// porta l'email di Auth: migrazione e protezioni cloud devono vedere quella persona.
// I dati del telefono si scartano solo se il salone aperto è shared, e solo in base all'email di Auth.
function openExistingSalon(user: User, data: Record<string, unknown>): void {
  const authEmail = user.email ?? ''
  const remembered = isSharedEmail(authEmail) && docText(data, 'email') !== authEmail
    ? { ...data, email: authEmail }
    : data
  accountDoc = { uid: user.uid, data: remembered }
  const salonId = docText(data, 'salonId')
  if (salonId) {
    if (salonId === SHARED_SALON_ID) discardPhoneData(user)
    bindSalon(salonId)
  } else {
    clearSalon()
  }
}

async function resolveSalon(user: User): Promise<void> {
  if (registration) await registration
  let data: Record<string, unknown> | null = null
  let readFailed = false
  try {
    data = await readDoc(['accounts', user.uid])
  } catch {
    readFailed = true
  }
  const salonId = docText(data, 'salonId')
  if (isSharedEmail(user.email)) {
    // Un account già scritto si apre così com'è, anche se salonId è ancora shared.
    // shared si crea solo finché il documento manca: un telefono non ancora puntato.
    if (data) {
      openExistingSalon(user, data)
      return
    }
    const next = sharedMemberAccount(user.email ?? '', {
      firstName: docText(data, 'firstName'),
      lastName: docText(data, 'lastName'),
    })
    const nextData = accountRecord(next)
    accountDoc = { uid: user.uid, data: nextData }
    discardPhoneData(user)
    bindSalon(SHARED_SALON_ID)
    if (!readFailed) void putDoc(['accounts', user.uid], nextData).catch(() => notifySaveFailed())
    return
  }
  if (data && salonId) {
    accountDoc = { uid: user.uid, data }
    bindSalon(salonId)
    return
  }
  accountDoc = null
  clearSalon()
}

async function dropAccountDoc(uid: string): Promise<void> {
  const { deleteDoc, doc } = await loadFirestore()
  await deleteDoc(doc(await database(), 'accounts', uid))
}

type OwnerProfile = { firstName: string; lastName: string; salonName: string; vatNumber: string; address: string }

// keepExisting vale per Riprova: le impostazioni si scrivono solo se una lettura le trova assenti,
// perché un secondo tentativo non deve sostituire quelle che l'utente ha già modificato.
async function writeOwnerSalon(user: User, input: OwnerProfile, keepExisting = false): Promise<void> {
  if (isSharedEmail(user.email)) {
    // Il documento sul server decide: la copia in memoria può essere di un accesso precedente.
    let existing: Record<string, unknown> | null = null
    try {
      existing = await readDoc(['accounts', user.uid], true)
    } catch {
      throw new AppError('Salvataggio non riuscito', 'storage_write')
    }
    if (existing) {
      openExistingSalon(user, existing)
      return
    }
    const account = sharedMemberAccount(user.email ?? '', {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
    })
    const accountData = accountRecord(account)
    await putDoc(['accounts', user.uid], accountData)
    accountDoc = { uid: user.uid, data: accountData }
    discardPhoneData(user)
    bindSalon(SHARED_SALON_ID)
    return
  }
  const account = { ...newOwnerAccount(user.uid, { firstName: input.firstName, lastName: input.lastName, email: user.email ?? '' }) }
  const base = blankSettings('auto', new Date().toISOString())
  const settings: SettingsMain = {
    ...base,
    business: {
      ...base.business,
      salonName: input.salonName.trim(),
      name: input.salonName.trim(),
      vatNumber: normalizeVat(input.vatNumber),
      address: input.address.trim(),
      taxCode: '',
    },
  }
  let accountWritten = false
  try {
    await putDoc(['accounts', user.uid], { ...account, termini: { accettati: true, at: new Date().toISOString() } })
    accountWritten = true
    bindSalon(user.uid)
    const present = keepExisting ? await readDoc(salonDocPath('settings', 'main'), true) : null
    if (!present) await putDoc(salonDocPath('settings', 'main'), settingsToDoc(settings))
  } catch {
    if (accountWritten) await dropAccountDoc(user.uid).catch(() => undefined)
    forgetAccount()
    throw new AppError('Salvataggio non riuscito', 'storage_write')
  }
  accountDoc = { uid: user.uid, data: account }
}

export async function registerOwner(input: OwnerProfile & { email: string; password: string }): Promise<LocalAccount> {
  const task = (async () => {
    const firebaseAuth = await auth()
    const { createUserWithEmailAndPassword } = await import('firebase/auth')
    let user: User
    try {
      user = (await createUserWithEmailAndPassword(firebaseAuth, input.email.trim().toLowerCase(), input.password)).user
    } catch (error) {
      throw mapAuthError(error)
    }
    knownUid = user.uid
    await writeOwnerSalon(user, input)
    await callAuthMail('sendVerificationEmail').catch(() => undefined)
    return toAccount(user)
  })()
  const pending = task.catch(() => undefined)
  registration = pending
  try {
    return await task
  } finally {
    if (registration === pending) registration = null
  }
}

async function currentUser(): Promise<User> {
  const user = (await auth()).currentUser
  if (!user) throw new AppError('Email o password non corretti', 'auth_invalid')
  return user
}

export async function repairOwnerSalon(input: OwnerProfile): Promise<void> {
  const user = await currentUser()
  // Rilegge l'account dal server: se il salone esiste già (l'accesso l'aveva solo mancato per la rete)
  // lo apre come l'ingresso, senza scrivere il documento.
  let existing: Record<string, unknown> | null
  try {
    existing = await readDoc(['accounts', user.uid], true)
  } catch {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    throw offline
      ? new AppError('Connessione assente', 'auth_offline')
      : new AppError('Salvataggio non riuscito', 'storage_write')
  }
  if (existing && docText(existing, 'salonId')) {
    openExistingSalon(user, existing)
    return
  }
  if (existing) accountDoc = { uid: user.uid, data: existing }
  await writeOwnerSalon(user, input, true)
  await callAuthMail('sendVerificationEmail').catch(() => undefined)
}

// Dopo acceptInvite il server ha già scritto salonId e role. La home legge il salone da qui,
// perché watchAuth non rilegge l'account finché l'accesso non cambia.
export async function reloadSignedInAccount(): Promise<LocalAccount | null> {
  const user = await currentUser()
  const data = await readDoc(['accounts', user.uid], true)
  if (!data) return null
  openExistingSalon(user, data)
  return toAccount(user)
}

export async function sendVerification(): Promise<{ alreadyVerified: boolean }> {
  await currentUser()
  try {
    return await callAuthMail('sendVerificationEmail')
  } catch (error) {
    throw mapMailError(error)
  }
}

export async function verificaPassword(attuale: string): Promise<void> {
  if (!firebaseEnabled()) {
    const { getAccount } = await import('../local/auth')
    const { verifyPassword } = await import('../../lib/password')
    const account = getAccount()
    if (!account) throw new AppError('Email o password non corretti', 'auth_invalid')
    const ok = await verifyPassword(attuale, account.salt, account.passwordHash, account.iterations)
    if (!ok) throw new AppError('Email o password non corretti', 'auth_invalid')
    return
  }
  const user = await currentUser()
  const { EmailAuthProvider, reauthenticateWithCredential } = await import('firebase/auth')
  if (!user.email) throw new AppError('Email o password non corretti', 'auth_invalid')
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, attuale))
}

export async function cambiaPassword(attuale: string, nuova: string): Promise<void> {
  if (!firebaseEnabled()) {
    const { cambiaPasswordLocale } = await import('../local/auth')
    await cambiaPasswordLocale(attuale, nuova)
    return
  }
  const user = await currentUser()
  const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import('firebase/auth')
  if (!user.email) throw new AppError('Email o password non corretti', 'auth_invalid')
  const cred = EmailAuthProvider.credential(user.email, attuale)
  await reauthenticateWithCredential(user, cred)
  await updatePassword(user, nuova)
}

export async function cambiaEmailAccesso(attuale: string, email: string): Promise<void> {
  if (!firebaseEnabled()) {
    const { cambiaEmailLocale } = await import('../local/auth')
    await cambiaEmailLocale(attuale, email)
    return
  }
  const user = await currentUser()
  const { EmailAuthProvider, reauthenticateWithCredential, verifyBeforeUpdateEmail } = await import('firebase/auth')
  if (!user.email) throw new AppError('Email o password non corretti', 'auth_invalid')
  const cred = EmailAuthProvider.credential(user.email, attuale)
  await reauthenticateWithCredential(user, cred)
  await verifyBeforeUpdateEmail(user, email.trim().toLowerCase())
}

export async function googleCollegato(): Promise<boolean> {
  if (!firebaseEnabled()) return false
  const user = await currentUser()
  return user.providerData.some((provider) => provider.providerId === 'google.com')
}

export async function collegaGoogle(): Promise<void> {
  const user = await currentUser()
  const { GoogleAuthProvider, linkWithPopup } = await import('firebase/auth')
  await linkWithPopup(user, new GoogleAuthProvider())
}

export async function scollegaGoogle(): Promise<void> {
  const user = await currentUser()
  const { unlink } = await import('firebase/auth')
  await unlink(user, 'google.com')
}

export async function esciAltriDispositivi(): Promise<void> {
  await callCallable('esciAltriDispositivi', {})
  const user = await currentUser()
  await user.getIdToken(true)
}

export async function sendPasswordReset(email: string): Promise<void> {
  try {
    await callAuthMail('sendPasswordResetEmail', { email: email.trim().toLowerCase() })
  } catch (error) {
    throw mapMailError(error)
  }
}

export async function reloadEmailVerified(): Promise<boolean> {
  const user = (await auth()).currentUser
  if (!user) return false
  const { reload } = await import('firebase/auth')
  try {
    await reload(user)
  } catch (error) {
    throw mapMailError(error)
  }
  emailVerified = user.emailVerified === true
  return emailVerified
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
  await resolveSalon(user)
  const ok = await migrate(user.uid)
  try {
    await ensureShared(user.uid, user.email ?? null)
  } catch {
    notifySaveFailed()
  }
  return accountFor(user, ok)
}

async function localPasswordOk(local: LocalAccount, password: string): Promise<boolean> {
  if (!local.salt || !local.passwordHash || local.iterations < 1) return false
  try {
    return await verifyPassword(password, local.salt, local.passwordHash, local.iterations)
  } catch {
    return false
  }
}

export async function signInEmail(email: string, password: string): Promise<LocalAccount> {
  const normalized = email.trim().toLowerCase()
  const local = getAccount()
  const firebaseAuth = await auth()
  const { createUserWithEmailAndPassword, signInWithEmailAndPassword } = await import('firebase/auth')
  try {
    const cred = await signInWithEmailAndPassword(firebaseAuth, normalized, password)
    return finishUser(cred.user)
  } catch (error) {
    // Il telefono può ricordare una password precedente. Vale solo per creare l'account cloud la prima volta.
    if (firebaseCode(error) !== 'auth/invalid-credential' || !local || local.email !== normalized) {
      throw mapAuthError(error)
    }
    if (!await localPasswordOk(local, password)) {
      throw new AppError('Email o password non corretti', 'auth_invalid')
    }
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
}

export async function registerEmail(email: string, password: string): Promise<LocalAccount> {
  const firebaseAuth = await auth()
  const { createUserWithEmailAndPassword } = await import('firebase/auth')
  const normalized = email.trim().toLowerCase()
  let user: User
  try {
    user = (await createUserWithEmailAndPassword(firebaseAuth, normalized, password)).user
  } catch (error) {
    throw mapAuthError(error)
  }
  return finishUser(user)
}

export async function signOutEmail(): Promise<void> {
  const firebaseAuth = await auth()
  const { signOut } = await import('firebase/auth')
  await signOut(firebaseAuth)
  forgetAccount()
  uploadQueue.clear()
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
      forgetAccount()
      uploadQueue.clear()
      onAccount(null)
      return
    }
    knownUid = user.uid
    void resolveSalon(user).then(async () => {
      if (mine !== generation) return
      if (currentSalonId() !== SHARED_SALON_ID) await migrate(user.uid)
      if (mine !== generation) return
      if (isCloudReady()) {
        onAccount(accountFor(user, true))
        void ensureShared(user.uid, user.email ?? null).catch(() => notifySaveFailed())
        return
      }
      onAccount(accountFor(user, false))
      const ok = await migrate(user.uid)
      if (mine !== generation) return
      onAccount(accountFor(user, ok))
      if (typeof navigator === 'undefined' || navigator.onLine !== false) {
        void ensureShared(user.uid, user.email ?? null).catch(() => notifySaveFailed())
      }
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
  const snap = await getDocs(collection(await database(), ...salonPath(name)))
  const removed = snap.docs.filter((item) => !keep.has(item.id))
  if (name === 'appointments' && removed.length > 0) {
    await writeDeletionSign([], removed.map((item) => item.id))
  }
  await Promise.all(removed.map((item) => deleteDoc(item.ref)))
}

export async function replaceCloudData(uid: string, bundle: BackupBundle): Promise<void> {
  const accepted = readRestoreBundle(bundle)
  if (!accepted) throw new AppError('Salvataggio non riuscito', 'storage_write')
  const dogs = withLocalKey(storageKeys.dogs(uid), accepted.dogs, () => listDogs(uid))
  const appointments = withLocalKey(storageKeys.appointments(uid), accepted.appointments, () => listAppointments(uid))
  const services = withLocalKey(storageKeys.services(uid), accepted.services, () => listServices(uid))
  const settings = withLocalKey(storageKeys.settings(uid), accepted.settings, () => getSettings(uid))
  const closures = accepted.closures === undefined
    ? null
    : withLocalKey(storageKeys.closures(uid), accepted.closures, () => listClosures(uid))
  cloudReplaceDepth += 1
  try {
    await Promise.all(dogs.map((dog) => saveDog(uid, dog, true)))
    await Promise.all(appointments.map((item) => saveAppointment(uid, item, true)))
    await saveServices(uid, services)
    await saveSettings(uid, settings, true)
    if (closures) await Promise.all(closures.map((item) => saveClosure(uid, item)))
    await deleteMissing(uid, 'dogs', new Set(dogs.map((dog) => dog.id)))
    await deleteMissing(uid, 'appointments', new Set(appointments.map((item) => item.id)))
    await deleteMissing(uid, 'services', new Set(services.map((service) => service.id)))
    if (closures) await deleteMissing(uid, 'closures', new Set(closures.map((item) => item.id)))
  } finally {
    cloudReplaceDepth -= 1
  }
}

function appointmentsBackupMap(appointments: Array<Appointment | null>): Record<string, unknown> {
  const visits: Appointment[] = []
  const personal: Record<string, unknown> = {}
  for (const appointment of appointments) {
    if (!appointment) continue
    if (appointmentKind(appointment) !== 'personale') {
      visits.push(appointment)
      continue
    }
    const stored: Record<string, unknown> = {
      id: appointment.id,
      kind: 'personale',
      title: (appointment.title ?? '').trim(),
      start: appointment.start.toISOString(),
      createdAt: appointment.createdAt.toISOString(),
      updatedAt: appointment.updatedAt.toISOString(),
    }
    if (appointment.plannedEnd) stored.plannedEnd = appointment.plannedEnd.toISOString()
    personal[appointment.id] = stored
  }
  return { ...appointmentsToLocalMap(visits), ...personal }
}

export async function loadCloudBackup(_uid: string): Promise<BackupBundle> {
  const { collection, doc, getDoc, getDocs } = await loadFirestore()
  const db = await database()
  const [dogsSnap, appointmentsSnap, servicesSnap, settingsSnap, closuresSnap] = await Promise.all([
    getDocs(collection(db, ...salonPath('dogs'))),
    getDocs(collection(db, ...salonPath('appointments'))),
    getDocs(collection(db, ...salonPath('services'))),
    getDoc(doc(db, ...salonPath('settings', 'main'))),
    getDocs(collection(db, ...salonPath('closures'))),
  ])
  const settings = settingsSnap.exists()
    ? settingsToDoc(settingsFromDoc(settingsSnap.data() as Record<string, unknown>))
    : {}
  return {
    dogs: dogsToLocalMap(dogsSnap.docs.map((item) => dogFromDoc(item.id, item.data() as Record<string, unknown>))),
    appointments: appointmentsBackupMap(appointmentsSnap.docs.map((item) => appointmentFromDocMaybe(item.id, item.data() as Record<string, unknown>))),
    services: servicesToLocalMap(servicesSnap.docs.map((item) => serviceFromDoc(item.id, item.data() as Record<string, unknown>))),
    settings,
    closures: closuresToLocalMap(closuresSnap.docs.flatMap((item) => {
      const parsed = closureFromDoc(item.id, item.data() as Record<string, unknown>)
      return parsed ? [parsed] : []
    })),
  }
}

export type SalonTransaction = {
  get(kind: string, id: string): Promise<Record<string, unknown> | null>
  set(kind: string, id: string, data: Record<string, unknown>): void
}

function salonRefPath(kind: string, id: string, sub: string[] = []): [string, ...string[]] {
  const [head, ...rest] = [...salonDocPath(kind, id), ...sub]
  return [head, ...rest]
}

export async function readSalonDoc(kind: string, id: string, ...sub: string[]): Promise<Record<string, unknown> | null> {
  const { doc, getDoc } = await loadFirestore()
  const snap = await getDoc(doc(await database(), ...salonRefPath(kind, id, sub)))
  return snap.exists() ? (snap.data() as Record<string, unknown>) : null
}

export async function readSalonCollection(kind: string): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const { collection, getDocs } = await loadFirestore()
  const [head, ...rest] = [...salonRootPath(), kind]
  const snap = await getDocs(collection(await database(), head, ...rest))
  return snap.docs.map((item) => ({ id: item.id, data: item.data() as Record<string, unknown> }))
}

export async function transactionSalon<T>(run: (tx: SalonTransaction) => Promise<T>): Promise<T> {
  const { doc, runTransaction } = await loadFirestore()
  const db = await database()
  return runTransaction(db, (tx) => run({
    async get(kind, id) {
      const snap = await tx.get(doc(db, ...salonRefPath(kind, id)))
      return snap.exists() ? (snap.data() as Record<string, unknown>) : null
    },
    set(kind, id, data) {
      tx.set(doc(db, ...salonRefPath(kind, id)), data)
    },
  }))
}

export async function runCloudDailyBackup(uid: string, now = new Date()): Promise<void> {
  const { doc, getDoc } = await loadFirestore()
  const snap = await getDoc(doc(await database(), ...salonPath('settings', 'main')))
  if (!snap.exists()) return
  const settings = settingsFromDoc(snap.data() as Record<string, unknown>)
  if (!dailyBackupDue(settings.backup, now)) return
  const bundle = await loadCloudBackup(uid)
  if (isEmptyBackup(bundle)) return
  const json = JSON.stringify(bundle)
  const day = backupDay(now)
  enqueueTask(async () => {
    await uploadBackupFile(uid, day, json)
    const current = await readDoc(salonDocPath('settings', 'main'))
    if (!current) return
    await writeUploadPatch(salonDocPath('settings', 'main'), backupLastAtPatch(now.toISOString()))
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

export async function listenAccountPush(
  uid: string,
  onData: (prefs: PushPrefs) => void,
): Promise<() => void> {
  const { doc, onSnapshot } = await loadFirestore()
  return onSnapshot(doc(await database(), 'accounts', uid, 'push', 'prefs'), (snap) => {
    onData(readPushPrefs(snap.data()))
  })
}

export async function writeAccountPush(uid: string, prefs: PushPrefs): Promise<void> {
  const { doc, setDoc } = await loadFirestore()
  await setDoc(doc(await database(), 'accounts', uid, 'push', 'prefs'), {
    ...readPushPrefs(prefs),
    updatedAt: new Date().toISOString(),
  }, { merge: false })
}

export async function writePushDevice(
  uid: string,
  deviceId: string,
  device: { token: string; appVersion: string } | null,
): Promise<void> {
  const { deleteDoc, doc, setDoc } = await loadFirestore()
  const ref = doc(await database(), 'accounts', uid, 'devices', deviceId)
  if (!device) {
    await deleteDoc(ref)
    return
  }
  await setDoc(ref, {
    token: device.token,
    platform: 'android',
    appVersion: device.appVersion,
    updatedAt: new Date().toISOString(),
  }, { merge: false })
}

export async function prendiPushTelefono(input: {
  token: string
  deviceId: string
  tieni: boolean
  appVersion?: string
}): Promise<void> {
  await callCallable('prendiPushTelefono', {
    token: input.token,
    deviceId: input.deviceId,
    tieni: input.tieni,
    appVersion: input.appVersion ?? '',
  })
}

export async function rilasciaPushDelTelefono(uid: string, deviceId: string, token: string): Promise<void> {
  if (!token) {
    await writePushDevice(uid, deviceId, null)
    return
  }
  try {
    await prendiPushTelefono({ token, deviceId, tieni: false })
  } catch {
    await writePushDevice(uid, deviceId, null)
  }
}

function openInviteExpiriesFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function memberFromDoc(id: string, data: Record<string, unknown>): SalonMember | null {
  const role = documentRole(data)
  const status = data.status === 'attivo' || data.status === 'revocato' ? data.status : null
  if (!role || !status) return null
  return {
    uid: docText(data, 'uid') || id,
    email: docText(data, 'email'),
    role,
    firstName: docText(data, 'firstName'),
    lastName: docText(data, 'lastName'),
    status,
    accessWithoutPro: data.accessWithoutPro === true,
  }
}

export async function watchSalonAccess(
  salonId: string,
  onChange: (access: SalonAccess) => void,
  viewerUid?: string,
): Promise<() => void> {
  const db = await database()
  const { collection, doc, onSnapshot } = await loadFirestore()
  const root = salonCollection(salonId)
  const path = [root[0], ...root.slice(1)] as [string, ...string[]]
  let proState: 'unknown' | 'absent' | 'present' = 'unknown'
  let enabled = false
  let members: SalonMember[] = []
  let membersSeen = false
  let ownMember: SalonMember | null = null
  let ownSeen = false
  let elencoNegato = false
  let openInviteExpiries: string[] = []
  let seats: number | undefined

  const publish = () => {
    if (proState === 'unknown') return
    const enabledNow = proState === 'present' && enabled
    if (viewerUid && !enabledNow && !membersSeen && !elencoNegato && !ownSeen) return
    const roster = membersSeen ? members : ownMember ? [ownMember] : []
    onChange({
      enabled: enabledNow,
      members: roster,
      openInviteExpiries: proState === 'present' ? openInviteExpiries : [],
      ...(typeof seats === 'number' ? { seats } : {}),
      ...(elencoNegato ? { elencoNegato: true } : {}),
    })
  }

  const denied = (error: unknown) => {
    if (!isPermissionDenied(error)) return
    elencoNegato = true
    publish()
  }

  const stopPro = onSnapshot(doc(db, ...path, 'pro', 'main'), (snap) => {
    if (!snap.exists()) {
      proState = 'absent'
      enabled = false
      openInviteExpiries = []
      seats = undefined
      publish()
      return
    }
    proState = 'present'
    const data = snap.data() as Record<string, unknown>
    enabled = data.enabled === true
    openInviteExpiries = openInviteExpiriesFrom(data.openInviteExpiries)
    seats = typeof data.seats === 'number' ? data.seats : undefined
    publish()
  }, (error) => {
    if (!isPermissionDenied(error)) return
    proState = 'present'
    enabled = false
    openInviteExpiries = []
    denied(error)
  })
  const stopMembers = onSnapshot(collection(db, ...path, 'members'), (snap) => {
    members = snap.docs.flatMap((item) => {
      const parsed = memberFromDoc(item.id, item.data() as Record<string, unknown>)
      return parsed ? [parsed] : []
    })
    membersSeen = true
    if (proState === 'unknown') return
    publish()
  }, denied)
  const stopOwn = viewerUid
    ? onSnapshot(doc(db, ...path, 'members', viewerUid), (snap) => {
      ownSeen = true
      const data = snap.exists() ? snap.data() as Record<string, unknown> : null
      ownMember = data ? memberFromDoc(viewerUid, data) : null
      if (proState === 'unknown') return
      publish()
    }, (error) => {
      ownSeen = true
      denied(error)
    })
    : () => undefined
  return () => {
    stopPro()
    stopMembers()
    stopOwn()
  }
}

export async function listenDocumentoPiano(
  onPro: (data: Record<string, unknown> | null) => void,
  onConfig: (data: Record<string, unknown> | null) => void,
): Promise<() => void> {
  const db = await database()
  const { doc, onSnapshot } = await loadFirestore()
  const stopPro = onSnapshot(doc(db, ...salonPath('pro', 'main')), (snap) => {
    onPro(snap.exists() ? snap.data() as Record<string, unknown> : null)
  }, () => onPro(null))
  const stopConfig = onSnapshot(doc(db, 'config', 'globale'), (snap) => {
    onConfig(snap.exists() ? snap.data() as Record<string, unknown> : null)
  }, () => onConfig(null))
  return () => {
    stopPro()
    stopConfig()
  }
}

export async function scriviInteresse(feature: string): Promise<void> {
  const firebaseAuth = await auth()
  const uid = firebaseAuth.currentUser?.uid
  if (!uid || !currentSalonId()) return
  const { doc, setDoc } = await loadFirestore()
  await setDoc(doc(await database(), ...salonPath('interesse', feature)), {
    feature,
    uid,
    at: new Date().toISOString(),
  })
}
