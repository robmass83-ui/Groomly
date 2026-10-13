import { describe, expect, it } from 'vitest'
import { clampPan, pinchScale } from './pinchScale'

describe('pinchScale', () => {
  it('ingrandisce con le dita e non esce da 1–8', () => {
    expect(pinchScale(100, 200, 1)).toBe(2)
    expect(pinchScale(100, 0, 2)).toBe(2)
    expect(pinchScale(100, 900, 1)).toBe(8)
    expect(pinchScale(100, 10, 1)).toBe(1)
  })

  it('sposta la foto zoomata e la ferma ai bordi', () => {
    expect(clampPan(40, -20, 2, 100, 80)).toEqual({ x: 40, y: -20 })
    expect(clampPan(400, -400, 2, 100, 80)).toEqual({ x: 50, y: -40 })
    expect(clampPan(30, 10, 1, 100, 80)).toEqual({ x: 0, y: 0 })
  })
})
