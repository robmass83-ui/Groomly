import { describe, expect, it } from 'vitest'
import { pinchScale } from './pinchScale'

describe('pinchScale', () => {
  it('ingrandisce con le dita e non esce da 1–4', () => {
    expect(pinchScale(100, 200, 1)).toBe(2)
    expect(pinchScale(100, 0, 2)).toBe(2)
    expect(pinchScale(100, 900, 1)).toBe(4)
    expect(pinchScale(100, 10, 1)).toBe(1)
  })
})
