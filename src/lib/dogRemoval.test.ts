import { describe, expect, it } from 'vitest'
import { finishDogRemoval } from './dogRemoval'

describe('finishDogRemoval', () => {
  it('toglie il cane anche se le visite falliscono, e non tocca le visite se il cane resta', () => {
    const order: string[] = []
    expect(finishDogRemoval({
      removeDog: () => { order.push('cane'); return true },
      dropVisits: () => { order.push('visite'); return false },
    })).toBe(true)
    expect(order).toEqual(['cane', 'visite'])

    const skipped: string[] = []
    expect(finishDogRemoval({
      removeDog: () => false,
      dropVisits: () => { skipped.push('visite'); return true },
    })).toBe(false)
    expect(skipped).toEqual([])

    expect(finishDogRemoval({
      removeDog: () => true,
      dropVisits: () => { throw new Error('archivio') },
    })).toBe(true)
  })
})
