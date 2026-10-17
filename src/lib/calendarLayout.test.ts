import { describe, expect, it } from 'vitest'
import { blockGeometry, contentMinHeightPx, daySegments, pxPerMinuteForDay, yAtMinute, type DayLayoutItem } from './calendarLayout'

function item(partial: Partial<DayLayoutItem> & Pick<DayLayoutItem, 'id' | 'startMin'>): DayLayoutItem {
  return { durationMin: 60, contentPx: 48, column: 0, columnCount: 1, ...partial }
}

describe('calendarLayout', () => {
  it('contentMinHeightPx cresce con servizi e nota', () => {
    const bare = contentMinHeightPx({ serviceCount: 0, hasNote: false, hasMark: false, compact: false })
    const rich = contentMinHeightPx({ serviceCount: 2, hasNote: true, hasMark: true, compact: false })
    expect(rich).toBeGreaterThan(bare)
    expect(rich).toBeGreaterThan(50)
    expect(bare).toBe(24)
    // 6 + 18 nome, +16 segno, +46 (2 + 22*2) servizi, +18 nota
    expect(rich).toBe(24 + 16 + 46 + 18)
  })

  it('contentMinHeightPx riserva una riga da 22px per ogni servizio (chip a capo)', () => {
    const one = contentMinHeightPx({ serviceCount: 1, hasNote: false, hasMark: false, compact: false })
    const three = contentMinHeightPx({ serviceCount: 3, hasNote: false, hasMark: false, compact: false })
    expect(three - one).toBe(44)
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

  it('un appuntamento 9–12 tiene la chip al contenuto e i segni 9, 10, 11', () => {
    const { segments, height } = daySegments([item({ id: 'a', startMin: 9 * 60, durationMin: 180, contentPx: 48 })], 8, 19)
    const group = segments.find((segment) => segment.kind === 'group')
    expect(group).toMatchObject({ kind: 'group', startMin: 9 * 60, endMin: 12 * 60 })
    if (group?.kind !== 'group') throw new Error('manca il gruppo')
    expect(group.marks.map((mark) => mark.minute)).toEqual([9 * 60, 10 * 60, 11 * 60])
    expect(group.items[0].height).toBe(48)
    expect(group.height).toBeGreaterThanOrEqual(48)
    expect(group.height).toBe(16 * 3)
    const empty = segments.filter((segment) => segment.kind === 'empty')
    expect(empty).toHaveLength(8)
    expect(empty.map((segment) => segment.kind === 'empty' && segment.hour)).toEqual([8, 12, 13, 14, 15, 16, 17, 18])
    expect(height).toBe(8 * 36 + 48)
  })

  it('le 10:30 per tre ore non lasciano la riga delle 10 e segnano 10:30, 11:30, 12:30', () => {
    const { segments } = daySegments([item({ id: 'a', startMin: 10 * 60 + 30, durationMin: 180, contentPx: 40 })], 8, 19)
    const hours = segments.filter((segment) => segment.kind === 'empty').map((segment) => segment.kind === 'empty' && segment.hour)
    expect(hours).not.toContain(10)
    expect(hours).toContain(8)
    expect(hours).toContain(13)
    const group = segments.find((segment) => segment.kind === 'group')
    if (group?.kind !== 'group') throw new Error('manca il gruppo')
    expect(group.marks.map((mark) => mark.minute)).toEqual([10 * 60 + 30, 11 * 60 + 30, 12 * 60 + 30])
  })

  it('due appuntamenti sovrapposti stanno nello stesso gruppo e il secondo si aggancia alle 10', () => {
    const { segments } = daySegments([
      item({ id: 'a', startMin: 9 * 60, durationMin: 180, contentPx: 40 }),
      item({ id: 'b', startMin: 10 * 60, durationMin: 60, contentPx: 80, column: 1, columnCount: 2 }),
    ], 8, 19)
    const group = segments.find((segment) => segment.kind === 'group')
    if (group?.kind !== 'group') throw new Error('manca il gruppo')
    expect(group.marks.map((mark) => mark.minute)).toEqual([9 * 60, 10 * 60, 11 * 60])
    const second = group.items.find((entry) => entry.id === 'b')
    const ten = group.marks[1]
    expect(second?.top).toBeCloseTo(ten.top, 5)
    expect(second?.height).toBe(80)
    expect(group.height).toBeGreaterThanOrEqual(80)
  })

  it('yAtMinute cade nella riga vuota e nel gruppo', () => {
    const { segments } = daySegments([item({ id: 'a', startMin: 9 * 60, durationMin: 180, contentPx: 48 })], 8, 19)
    expect(yAtMinute(segments, 8 * 60 + 30)).toBeCloseTo(18, 5)
    const group = segments.find((segment) => segment.kind === 'group')
    if (group?.kind !== 'group') throw new Error('manca il gruppo')
    expect(yAtMinute(segments, 10 * 60 + 30)).toBeGreaterThan(group.top)
    expect(yAtMinute(segments, 10 * 60 + 30)).toBeLessThan(group.top + group.height)
  })
})
