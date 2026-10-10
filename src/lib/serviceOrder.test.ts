import { describe, expect, it } from 'vitest'
import { permuteOrders } from './serviceOrder'

describe('permuteOrders', () => {
  it('sposta un id e riusa gli order già presenti', () => {
    expect(permuteOrders(['a', 'b', 'c'], [0, 2, 5], 0, 2)).toEqual([
      { id: 'b', order: 0 },
      { id: 'c', order: 2 },
      { id: 'a', order: 5 },
    ])
  })

  it('non cambia nulla se l’indice è lo stesso o fuori', () => {
    const same = [{ id: 'a', order: 0 }, { id: 'b', order: 2 }]
    expect(permuteOrders(['a', 'b'], [0, 2], 1, 1)).toEqual(same)
    expect(permuteOrders(['a', 'b'], [0, 2], 0, 4)).toEqual(same)
  })
})
