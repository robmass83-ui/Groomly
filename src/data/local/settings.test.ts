import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSettings, setTheme } from './settings'
import { readJson, storageKeys } from './storage'

describe('settings', () => {
  beforeEach(() => localStorage.clear())

  it('crea il tema auto se il documento manca', () => {
    const settings = getSettings('uid-1')
    expect(settings.theme).toBe('auto')
    expect(readJson(storageKeys.settings('uid-1'))).toMatchObject({ theme: 'auto' })
  })

  it('salva il tema scelto', () => {
    setTheme('uid-1', 'dark')
    expect(getSettings('uid-1').theme).toBe('dark')
  })

  it('se la scrittura fallisce non cambia il tema già letto', () => {
    setTheme('uid-1', 'light')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => setTheme('uid-1', 'dark')).toThrow()
    vi.restoreAllMocks()
    expect(getSettings('uid-1').theme).toBe('light')
  })
})
