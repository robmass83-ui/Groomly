import { getAccount } from '../data/local/auth'
import { listDogs } from '../data/local/dogs'
import { firebaseEnabled, readsLocal } from '../data/firebase/enabled'
import { appointmentBackTarget, isSheetPath } from '../lib/sheetRoute'

export function dogExistsFor(uid: string | null | undefined): (id: string) => boolean {
  if (!uid) return () => true
  if (firebaseEnabled() && !readsLocal()) return () => true
  try {
    const known = new Set(listDogs(uid).map((dog) => dog.id))
    return (id) => known.has(id)
  } catch {
    return () => true
  }
}

function pathnameOf(target: string): string {
  const cut = target.search(/[?#]/)
  return cut >= 0 ? target.slice(0, cut) : target
}

function searchOf(target: string): string {
  const hashAt = target.indexOf('#')
  const rest = hashAt >= 0 ? target.slice(0, hashAt) : target
  const at = rest.indexOf('?')
  return at >= 0 ? rest.slice(at) : ''
}

export function sheetEntries(initialPath: string): string[] {
  if (!isSheetPath(pathnameOf(initialPath))) return [initialPath]
  const back = appointmentBackTarget(searchOf(initialPath), dogExistsFor(getAccount()?.uid))
  return [back, initialPath]
}

export function prepareBrowserHistory(): void {
  if (typeof window === 'undefined') return
  const { pathname, search, hash } = window.location
  if (!isSheetPath(pathname)) return
  const state = window.history.state as { idx?: unknown } | null
  if (state && typeof state.idx === 'number' && state.idx > 0) return
  const back = appointmentBackTarget(search, dogExistsFor(getAccount()?.uid))
  window.history.replaceState({ usr: null, key: 'sheet-under', idx: 0 }, '', back)
  window.history.pushState({ usr: null, key: 'sheet-top', idx: 1 }, '', `${pathname}${search}${hash}`)
}
