const env = import.meta.env as Record<string, string | undefined>

let cloudReady = false
const sourceListeners = new Set<() => void>()
const failListeners = new Set<() => void>()

export function firebaseEnabled(): boolean {
  const key = env.VITE_FIREBASE_API_KEY
  return typeof key === 'string' && key.length > 0
}

const mirrorKey = (uid: string) => `groomly.mirror.${uid}`

export function markSalonMirror(uid: string): void {
  localStorage.setItem(mirrorKey(uid), '1')
}

export function isSalonMirror(uid: string): boolean {
  return localStorage.getItem(mirrorKey(uid)) === '1'
}

function userUid(key: string | null): string | null {
  const match = key?.match(/^groomly\.users\.([^.]+)\./)
  return match?.[1] ?? null
}

function pendingUserKey(key: string | null): boolean {
  const uid = userUid(key)
  return uid != null && !isSalonMirror(uid)
}

export function hasLocalUserData(): boolean {
  for (let index = 0; index < localStorage.length; index += 1) {
    if (pendingUserKey(localStorage.key(index))) return true
  }
  return false
}

export function readsLocal(): boolean {
  if (!firebaseEnabled()) return true
  if (cloudReady) return false
  return hasLocalUserData()
}

export function isCloudReady(): boolean {
  return cloudReady
}

export function markCloudReady(): void {
  cloudReady = true
  for (const listener of sourceListeners) listener()
}

export function subscribeSource(listener: () => void): () => void {
  sourceListeners.add(listener)
  return () => {
    sourceListeners.delete(listener)
  }
}

export function notifySaveFailed(): void {
  for (const listener of failListeners) listener()
}

export function subscribeSaveFailed(listener: () => void): () => void {
  failListeners.add(listener)
  return () => {
    failListeners.delete(listener)
  }
}

export function localDataUid(): string | null {
  const session = localStorage.getItem('groomly.session')
  if (session) return session
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    const match = key?.match(/^groomly\.users\.([^.]+)\./)
    if (match?.[1]) return match[1]
  }
  return null
}

export function localDataUids(): string[] {
  const ids = new Set<string>()
  for (let index = 0; index < localStorage.length; index += 1) {
    const uid = userUid(localStorage.key(index))
    if (uid && !isSalonMirror(uid)) ids.add(uid)
  }
  return [...ids]
}
