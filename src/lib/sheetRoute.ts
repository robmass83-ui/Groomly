import { localDayKey, parseDayParam } from './appointments'

export interface BackgroundLocation {
  pathname: string
  search: string
  hash: string
}

export const SWIPE_CLOSE_PX = 80

export function isSheetPath(pathname: string): boolean {
  return pathname === '/appuntamenti/nuovo'
    || /^\/appuntamenti\/[^/]+$/.test(pathname)
    || pathname === '/appuntamenti/personale/nuovo'
    || /^\/appuntamenti\/personale\/[^/]+$/.test(pathname)
    || pathname === '/chiusure/nuovo'
    || /^\/chiusure\/[^/]+$/.test(pathname)
}

export function backgroundOf(location: { pathname: string; search?: string; hash?: string }): BackgroundLocation {
  return { pathname: location.pathname, search: location.search ?? '', hash: location.hash ?? '' }
}

export function sheetState(location: { pathname: string; search?: string; hash?: string }): { background: BackgroundLocation } {
  return { background: backgroundOf(location) }
}

export function readBackground(state: unknown): BackgroundLocation | null {
  if (!state || typeof state !== 'object') return null
  const value = (state as { background?: unknown }).background
  if (!value || typeof value !== 'object') return null
  const { pathname, search, hash } = value as Partial<BackgroundLocation>
  if (typeof pathname !== 'string' || isSheetPath(pathname)) return null
  return { pathname, search: typeof search === 'string' ? search : '', hash: typeof hash === 'string' ? hash : '' }
}

export function splitTarget(target: string): BackgroundLocation {
  const hashAt = target.indexOf('#')
  const hash = hashAt >= 0 ? target.slice(hashAt) : ''
  const rest = hashAt >= 0 ? target.slice(0, hashAt) : target
  const searchAt = rest.indexOf('?')
  return {
    pathname: searchAt >= 0 ? rest.slice(0, searchAt) : rest,
    search: searchAt >= 0 ? rest.slice(searchAt) : '',
    hash,
  }
}

export function acceptedDay(value: string | null, now: Date): string | null {
  if (value === null) return null
  return localDayKey(parseDayParam(value, now)) === value ? value : null
}

export function appointmentBackTarget(search: string, dogExists: (id: string) => boolean, now: Date = new Date()): string {
  const params = new URLSearchParams(search)
  if (params.get('da') === 'mensili') return '/mensili'
  const cane = params.get('cane')
  if (cane && dogExists(cane)) return `/animali/${cane}`
  const day = acceptedDay(params.get('data'), now)
  if (day) return `/calendario?data=${day}`
  return '/'
}
