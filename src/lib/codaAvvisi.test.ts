import { describe, expect, it } from 'vitest'
import { codaDomani, segnaInviato } from './codaAvvisi'

const oggi = new Date(2026, 9, 25, 18, 0)
const domani = new Date(2026, 9, 26, 9, 0)

function visita(id: string, ora: number, status = 'programmato') {
  return { id, start: new Date(2026, 9, 26, ora, 0), status, dogId: id }
}

describe('coda avvisi', () => {
  it('domani con tre telefoni fa una coda di tre e il secondo parte dopo il primo', () => {
    const appuntamenti = [visita('a', 9), visita('b', 11), visita('c', 15), { ...visita('d', 16), status: 'disdetto' }]
    const telefoni = { a: '333 111 1111', b: '333 222 2222', c: '333 333 3333', d: '333 444 4444' }
    const coda = codaDomani(appuntamenti, telefoni, oggi, {})
    expect(coda.map((item) => item.id)).toEqual(['a', 'b', 'c'])
    const dopo = codaDomani(appuntamenti, telefoni, oggi, segnaInviato({}, coda[0].chiave))
    expect(dopo.map((item) => item.id)).toEqual(['b', 'c'])
    expect(codaDomani([{ ...visita('z', 9), start: domani }], { z: '' }, oggi, {})).toEqual([])
  })
})
