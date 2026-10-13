export function contentMinHeightPx(input: {
  serviceCount: number
  hasNote: boolean
  hasMark: boolean
  compact: boolean
}): number {
  if (input.compact) {
    return 18
  }
  let height = 6 + 16
  if (input.hasMark) height += 2 + 14
  if (input.serviceCount > 0) height += 2 + 22
  if (input.hasNote) height += 2 + 16
  return height
}

export function pxPerMinuteForDay(
  items: { durationMin: number; contentMinPx: number }[],
  baseHourPx: number,
): number {
  let ppm = baseHourPx / 60
  for (const item of items) {
    const duration = Math.max(item.durationMin, 1)
    ppm = Math.max(ppm, item.contentMinPx / duration)
  }
  return ppm
}

export function blockGeometry(
  startMinutes: number,
  durationMin: number,
  boundsStartHour: number,
  pxPerMinute: number,
  minBlock: number,
): { top: number; height: number } {
  const top = (startMinutes - boundsStartHour * 60) * pxPerMinute
  const height = Math.max(durationMin * pxPerMinute, minBlock)
  return { top, height }
}
