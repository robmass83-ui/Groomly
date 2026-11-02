import { INVITE_DAYS } from '../../lib/salonAccess'

// L'invito aperto da chi non è ancora dentro resta sul telefono finché non viene accettato o scade,
// così registrarsi o entrare non lo fa perdere. Il token è lo stesso del link (64 esadecimali minuscoli).
const KEY = 'groomly.invitoInSospeso'
const TOKEN_RE = /^[0-9a-f]{64}$/
const DAY_MS = 24 * 60 * 60 * 1000

export function ricordaInvito(token: string, adesso: Date = new Date()): void {
  if (!TOKEN_RE.test(token)) return
  try {
    localStorage.setItem(KEY, JSON.stringify({ token, at: adesso.getTime() }))
  } catch {
    return
  }
}

export function invitoInSospeso(adesso: Date = new Date()): string | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Record<string, unknown> | null
    if (!value || typeof value !== 'object') return null
    const { token, at } = value
    if (typeof token !== 'string' || !TOKEN_RE.test(token)) return null
    if (typeof at !== 'number' || !Number.isFinite(at)) return null
    if (adesso.getTime() - at > INVITE_DAYS * DAY_MS) return null
    return token
  } catch {
    return null
  }
}

export function dimenticaInvito(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    return
  }
}
