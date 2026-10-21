import { describe, expect, it } from 'vitest'
import { closureCovers, closureOn, closureRangeOk, closureReasonOk, closuresOverlap, type Closure } from './closures'

const closure = (partial: Partial<Closure>): Closure => ({
  id: 'c1',
  reason: 'Ferie',
  startDay: '2026-08-20',
  endDay: '2026-08-24',
  createdAt: new Date(2026, 7, 1),
  updatedAt: new Date(2026, 7, 1),
  ...partial,
})

describe('chiusure', () => {
  it('motivo e periodo', () => {
    expect(closureReasonOk('  Ferie ')).toBe(true)
    expect(closureReasonOk('   ')).toBe(false)
    expect(closureReasonOk('a'.repeat(41))).toBe(false)
    expect(closureRangeOk('2026-08-20', '2026-08-20')).toBe(true)
    expect(closureRangeOk('2026-08-20', '2026-08-19')).toBe(false)
  })

  it('il 24 e il 25 non si sovrappongono; il 24 ripetuto sì', () => {
    expect(closuresOverlap({ startDay: '2026-08-20', endDay: '2026-08-24' }, { startDay: '2026-08-25', endDay: '2026-08-25' })).toBe(false)
    expect(closuresOverlap({ startDay: '2026-08-20', endDay: '2026-08-24' }, { startDay: '2026-08-24', endDay: '2026-08-26' })).toBe(true)
    expect(closureCovers(closure({}), '2026-08-22')).toBe(true)
    expect(closureCovers(closure({}), '2026-08-25')).toBe(false)
  })

  it('closureOn restituisce la chiusura del giorno', () => {
    expect(closureOn([closure({})], '2026-08-21')?.reason).toBe('Ferie')
    expect(closureOn([closure({})], '2026-08-25')).toBeNull()
  })
})
