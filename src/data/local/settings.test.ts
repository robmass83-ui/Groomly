import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSettings, rememberDog, setTheme } from './settings'
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

  it('legge un json vecchio con i default e non lo riscrive', () => {
    localStorage.setItem(storageKeys.settings('uid-1'), JSON.stringify({ theme: 'dark', updatedAt: '2026-10-01T00:00:00.000Z' }))
    const before = localStorage.getItem(storageKeys.settings('uid-1'))
    const settings = getSettings('uid-1')
    expect(settings.theme).toBe('dark')
    expect(settings.monthlyReminder).toEqual({ enabled: true, time: '18:30', daysBefore: 7 })
    expect(settings.backup).toEqual({ autoDaily: false })
    expect(settings.ageThresholds).toEqual({ giovaneFrom: 1, adultoFrom: 3, anzianoFrom: 8 })
    expect(settings.recentDogIds).toEqual([])
    expect(localStorage.getItem(storageKeys.settings('uid-1'))).toBe(before)
  })

  it('rememberDog mette in cima e tiene otto id', () => {
    const settings = getSettings('uid-1')
    const first = rememberDog(settings, 'a')
    const second = rememberDog({ ...first, recentDogIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] }, 'a')
    expect(second.recentDogIds[0]).toBe('a')
    expect(second.recentDogIds).toHaveLength(8)
    expect(second.recentDogIds.filter((id) => id === 'a')).toHaveLength(1)
  })
})
