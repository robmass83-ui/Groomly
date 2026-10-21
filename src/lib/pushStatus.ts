export type PushStatus = {
  permissionDenied: boolean
  unavailable: boolean
}

const PERMISSION_DENIED_KEY = 'groomly.pushPermissionDenied'
const UNAVAILABLE_KEY = 'groomly.pushUnavailable'
const listeners = new Set<() => void>()

function readFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

export function readPushStatus(): PushStatus {
  return {
    permissionDenied: readFlag(PERMISSION_DENIED_KEY),
    unavailable: readFlag(UNAVAILABLE_KEY),
  }
}

export function setPushStatus(next: Partial<PushStatus>): void {
  try {
    if (next.permissionDenied !== undefined) {
      if (next.permissionDenied) sessionStorage.setItem(PERMISSION_DENIED_KEY, '1')
      else sessionStorage.removeItem(PERMISSION_DENIED_KEY)
    }
    if (next.unavailable !== undefined) {
      if (next.unavailable) sessionStorage.setItem(UNAVAILABLE_KEY, '1')
      else sessionStorage.removeItem(UNAVAILABLE_KEY)
    }
  } catch {
    // Lo stato serve solo all'interfaccia; le push continuano anche senza sessionStorage.
  }
  for (const listener of listeners) listener()
}

export function subscribePushStatus(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
