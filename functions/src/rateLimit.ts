export const EMAIL_RATE_MAX = 3
export const EMAIL_RATE_WINDOW_MS = 15 * 60 * 1000

export function rateDecision(hits: unknown, now: number): { ok: boolean; next: number[] } {
  const recent = Array.isArray(hits)
    ? hits.filter((value): value is number => (
      typeof value === 'number' && Number.isFinite(value) && now - value < EMAIL_RATE_WINDOW_MS
    ))
    : []
  if (recent.length >= EMAIL_RATE_MAX) return { ok: false, next: recent }
  return { ok: true, next: [...recent, now] }
}
