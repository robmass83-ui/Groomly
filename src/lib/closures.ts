export interface Closure {
  id: string
  reason: string
  startDay: string
  endDay: string
  createdAt: Date
  updatedAt: Date
}

export function closureReasonOk(reason: string): boolean {
  const trimmed = reason.trim()
  return trimmed.length >= 1 && trimmed.length <= 40
}

export function closureRangeOk(startDay: string, endDay: string): boolean {
  return startDay <= endDay
}

export function closureCovers(closure: { startDay: string; endDay: string }, dayKey: string): boolean {
  return closure.startDay <= dayKey && dayKey <= closure.endDay
}

export function closuresOverlap(
  a: { startDay: string; endDay: string },
  b: { startDay: string; endDay: string },
): boolean {
  return a.startDay <= b.endDay && b.startDay <= a.endDay
}

export function closureOn(closures: Closure[], dayKey: string): Closure | null {
  return closures.find((closure) => closureCovers(closure, dayKey)) ?? null
}
