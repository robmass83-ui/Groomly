import { describe, expect, it } from 'vitest'
import { blockGeometry, contentMinHeightPx, pxPerMinuteForDay } from './calendarLayout'

describe('calendarLayout', () => {
  it('contentMinHeightPx cresce con servizi e nota', () => {
    const bare = contentMinHeightPx({ serviceCount: 0, hasNote: false, hasMark: false, compact: false })
    const rich = contentMinHeightPx({ serviceCount: 2, hasNote: true, hasMark: true, compact: false })
    expect(rich).toBeGreaterThan(bare)
    expect(rich).toBeGreaterThan(50)
  })

  it('pxPerMinuteForDay alza la scala se un blocco breve ha molto contenuto', () => {
    const baseHour = 50
    const plain = pxPerMinuteForDay([{ durationMin: 60, contentMinPx: 40 }], baseHour)
    expect(plain).toBeCloseTo(50 / 60, 5)
    const tight = pxPerMinuteForDay([{ durationMin: 30, contentMinPx: 60 }], baseHour)
    expect(tight).toBeGreaterThan(50 / 60)
    expect(30 * tight).toBeGreaterThanOrEqual(60)
  })

  it('blockGeometry usa pxPerMinute per top e height con pavimento minBlock', () => {
    const geo = blockGeometry(9 * 60 + 30, 45, 8, 50 / 60, 18)
    expect(geo.top).toBeCloseTo(75, 5)
    expect(geo.height).toBeCloseTo(37.5, 5)
    const tiny = blockGeometry(9 * 60, 5, 8, 50 / 60, 18)
    expect(tiny.height).toBe(18)
  })
})
