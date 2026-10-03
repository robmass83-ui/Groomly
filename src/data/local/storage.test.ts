import { beforeEach, describe, expect, it } from 'vitest'
import { findCorruptGroomlyKey, storageKeys } from './storage'

describe('storage cani', () => {
  beforeEach(() => localStorage.clear())

  it('riconosce la mappa cani illeggibile e non la cancella', () => {
    const key = storageKeys.dogs('uid-1')
    localStorage.setItem(key, '{')
    expect(findCorruptGroomlyKey()).toBe(key)
    expect(localStorage.getItem(key)).toBe('{')
  })

  it('riconosce ancora i servizi illeggibili', () => {
    const key = storageKeys.services('uid-1')
    localStorage.setItem(key, '{')
    expect(findCorruptGroomlyKey()).toBe(key)
  })
})
