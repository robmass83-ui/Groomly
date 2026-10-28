export const EMAIL_RATE_MAX = 3
export const EMAIL_RATE_WINDOW_MS = 15 * 60 * 1000
export const PUSH_RATE_MAX = 8
export const PUSH_RATE_WINDOW_MS = 60 * 1000

export function rateDecisionWindow(hits: unknown, now: number, max: number, windowMs: number): { ok: boolean; next: number[] } {
  const recent = Array.isArray(hits)
    ? hits.filter((value): value is number => (
      typeof value === 'number' && Number.isFinite(value) && now - value < windowMs
    ))
    : []
  if (recent.length >= max) return { ok: false, next: recent }
  return { ok: true, next: [...recent, now] }
}

export function rateDecision(hits: unknown, now: number): { ok: boolean; next: number[] } {
  return rateDecisionWindow(hits, now, EMAIL_RATE_MAX, EMAIL_RATE_WINDOW_MS)
}

export function pushRateDecision(hits: unknown, now: number): { ok: boolean; next: number[] } {
  return rateDecisionWindow(hits, now, PUSH_RATE_MAX, PUSH_RATE_WINDOW_MS)
}
