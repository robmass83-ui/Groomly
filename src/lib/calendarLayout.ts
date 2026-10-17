export function contentMinHeightPx(input: {
  serviceCount: number
  hasNote: boolean
  hasMark: boolean
  compact: boolean
}): number {
  if (input.compact) {
    return 18
  }
  let height = 6 + 18 // nome: almeno l'altezza dell'adesivo temperamento (18px)
  if (input.hasMark) height += 2 + 14
  // ChipRow va a capo: stima prudente di una riga da 22px per servizio (telefoni stretti)
  if (input.serviceCount > 0) height += 2 + 22 * input.serviceCount
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

export const EMPTY_HOUR_PX = 36
export const MARK_MIN_PX = 16

export interface DayLayoutItem {
  id: string
  startMin: number
  durationMin: number
  contentPx: number
  column: number
  columnCount: number
}

export interface DayMark { minute: number; top: number }

export interface DayEmpty {
  kind: 'empty'
  hour: number
  top: number
  height: number
}

export interface DayGroup {
  kind: 'group'
  startMin: number
  endMin: number
  top: number
  height: number
  marks: DayMark[]
  items: { id: string; top: number; height: number; column: number; columnCount: number }[]
}

export type DaySegment = DayEmpty | DayGroup

function rangesOverlap(start: number, end: number, otherStart: number, otherEnd: number): boolean {
  return start < otherEnd && otherStart < end
}

function clustersOf(items: DayLayoutItem[]): { startMin: number; endMin: number; items: DayLayoutItem[] }[] {
  const sorted = [...items].sort((left, right) => left.startMin - right.startMin || left.id.localeCompare(right.id))
  const clusters: { startMin: number; endMin: number; items: DayLayoutItem[] }[] = []
  for (const item of sorted) {
    const start = item.startMin
    const end = start + Math.max(item.durationMin, 1)
    const last = clusters[clusters.length - 1]
    if (!last || start >= last.endMin) clusters.push({ startMin: start, endMin: end, items: [item] })
    else {
      last.endMin = Math.max(last.endMin, end)
      last.items.push(item)
    }
  }
  return clusters
}

function hourOverlaps(hour: number, startMin: number, endMin: number): boolean {
  return rangesOverlap(hour * 60, hour * 60 + 60, startMin, endMin)
}

function pushGroup(
  segments: DaySegment[],
  cluster: { startMin: number; endMin: number; items: DayLayoutItem[] },
  top: number,
): number {
  const marks: number[] = []
  for (let minute = cluster.startMin; minute < cluster.endMin; minute += 60) marks.push(minute)
  if (marks.length === 0) marks.push(cluster.startMin)
  const count = marks.length
  const placed = cluster.items.map((item) => {
    let markIndex = 0
    for (let index = 0; index < marks.length; index += 1) {
      if (marks[index] <= item.startMin) markIndex = index
    }
    return { item, markIndex }
  })
  let height = count * MARK_MIN_PX
  for (const entry of placed) {
    const room = 1 - entry.markIndex / count
    if (room > 0) height = Math.max(height, entry.item.contentPx / room)
  }
  const chips = placed.map(({ item, markIndex }) => ({
    id: item.id,
    height: item.contentPx,
    column: item.column,
    columnCount: item.columnCount,
    markIndex,
    startMin: item.startMin,
    top,
  }))
  const columns = new Map<number, typeof chips>()
  for (const chip of chips) {
    const list = columns.get(chip.column)
    if (list) list.push(chip)
    else columns.set(chip.column, [chip])
  }
  for (const list of columns.values()) {
    list.sort((left, right) => left.startMin - right.startMin || left.id.localeCompare(right.id))
  }
  const placeAt = (bandHeight: number) => {
    for (const chip of chips) chip.top = top + (chip.markIndex / count) * bandHeight
    for (const list of columns.values()) {
      for (let index = 1; index < list.length; index += 1) {
        const previous = list[index - 1]
        const markTop = top + (list[index].markIndex / count) * bandHeight
        list[index].top = Math.max(markTop, previous.top + previous.height + 2)
      }
    }
  }
  for (let pass = 0; pass < 8; pass += 1) {
    placeAt(height)
    let needed = height
    for (const chip of chips) {
      const bottom = chip.top + chip.height - top
      if (bottom > needed) needed = bottom
    }
    if (needed <= height) break
    height = needed
  }
  segments.push({
    kind: 'group',
    startMin: cluster.startMin,
    endMin: cluster.endMin,
    top,
    height,
    marks: marks.map((minute, index) => ({ minute, top: top + (index / count) * height })),
    items: chips.map((chip) => ({
      id: chip.id,
      top: chip.top,
      height: chip.height,
      column: chip.column,
      columnCount: chip.columnCount,
    })),
  })
  return top + height
}

export function daySegments(items: DayLayoutItem[], startHour: number, endHour: number): { segments: DaySegment[]; height: number } {
  const clusters = clustersOf(items)
  const segments: DaySegment[] = []
  let top = 0
  let hour = startHour
  for (const cluster of clusters) {
    if (cluster.endMin <= startHour * 60) continue
    if (cluster.startMin >= endHour * 60) break
    if (cluster.startMin >= hour * 60) {
      while (hour < endHour && !hourOverlaps(hour, cluster.startMin, cluster.endMin)) {
        segments.push({ kind: 'empty', hour, top, height: EMPTY_HOUR_PX })
        top += EMPTY_HOUR_PX
        hour += 1
      }
    }
    top = pushGroup(segments, cluster, top)
    if (cluster.endMin <= hour * 60) continue
    while (hour < endHour && hourOverlaps(hour, cluster.startMin, cluster.endMin)) hour += 1
  }
  while (hour < endHour) {
    segments.push({ kind: 'empty', hour, top, height: EMPTY_HOUR_PX })
    top += EMPTY_HOUR_PX
    hour += 1
  }
  return { segments, height: top }
}

export function yAtMinute(segments: DaySegment[], minute: number): number {
  for (const segment of segments) {
    if (segment.kind === 'empty') {
      const start = segment.hour * 60
      if (minute >= start && minute < start + 60) return segment.top + ((minute - start) / 60) * segment.height
    } else if (minute >= segment.startMin && minute < segment.endMin) {
      const span = Math.max(segment.endMin - segment.startMin, 1)
      return segment.top + ((minute - segment.startMin) / span) * segment.height
    }
  }
  for (const segment of segments) {
    if (segment.kind !== 'group') continue
    const firstHour = Math.floor(segment.startMin / 60)
    const lastHour = Math.floor((segment.endMin - 1) / 60)
    const minuteHour = Math.floor(minute / 60)
    if (minuteHour < firstHour || minuteHour > lastHour) continue
    if (minute < segment.startMin) return segment.top
    return segment.top + segment.height
  }
  if (segments.length === 0) return 0
  const last = segments[segments.length - 1]
  return last.top + last.height
}
