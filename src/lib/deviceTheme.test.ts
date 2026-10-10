import { beforeEach, describe, expect, it } from 'vitest'
import { readDeviceTheme, writeDeviceTheme } from './deviceTheme'

describe('tema del telefono', () => {
  beforeEach(() => localStorage.clear())

  it('senza chiave vale auto e una scelta resta sulla chiave', () => {
    expect(readDeviceTheme()).toBe('auto')
    writeDeviceTheme('dark')
    expect(localStorage.getItem('groomly.theme')).toBe('dark')
    expect(readDeviceTheme()).toBe('dark')
  })

  it('un valore sconosciuto vale auto', () => {
    localStorage.setItem('groomly.theme', 'blu')
    expect(readDeviceTheme()).toBe('auto')
  })
})
