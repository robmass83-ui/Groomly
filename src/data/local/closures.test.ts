import { beforeEach, describe, expect, it } from 'vitest'
import type { Closure } from '../../lib/closures'
import { deleteClosureLocal, listClosures, saveClosureLocal } from './closures'

const closure = (partial: Partial<Closure> = {}): Closure => ({
  id: 'c1',
  reason: 'Ferie',
  startDay: '2026-08-20',
  endDay: '2026-08-24',
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-02T00:00:00.000Z'),
  ...partial,
})

describe('chiusure locali', () => {
  beforeEach(() => localStorage.clear())

  it('salva una chiusura, la rilegge, ne cancella una e non cancella l’altra', () => {
    const uid = 'uid-1'
    const first = closure()
    saveClosureLocal(uid, first)
    saveClosureLocal(uid, closure({
      id: 'c2',
      reason: 'Malattia',
      startDay: '2026-09-01',
      endDay: '2026-09-01',
    }))
    const listed = listClosures(uid)
    expect(listed).toHaveLength(2)
    expect(listed.find((item) => item.id === 'c1')).toEqual(first)
    deleteClosureLocal(uid, 'c1')
    expect(listClosures(uid).map((item) => item.id)).toEqual(['c2'])
  })

  it('un record con motivo vuoto o endDay precedente non entra in lista', () => {
    const uid = 'uid-1'
    saveClosureLocal(uid, closure({ id: 'vuoto', reason: '   ' }))
    saveClosureLocal(uid, closure({ id: 'prima', endDay: '2026-08-19' }))
    saveClosureLocal(uid, closure({ id: 'ok' }))
    expect(listClosures(uid).map((item) => item.id)).toEqual(['ok'])
  })
})
