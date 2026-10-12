import { describe, expect, it } from 'vitest'
import { shouldSeedServices } from './salonListen'

describe('shouldSeedServices', () => {
  it('non semina uno snapshot vuoto della cache', () => {
    expect(shouldSeedServices(true, true)).toBe(false)
    expect(shouldSeedServices(false, false)).toBe(false)
    expect(shouldSeedServices(true, false)).toBe(true)
  })
})
