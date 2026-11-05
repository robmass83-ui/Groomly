import { describe, expect, it } from 'vitest'
import { percorsoAdminDaUtenti } from './percorsoAdmin'

describe('percorsoAdminDaUtenti', () => {
  it('porta i link vecchi al nuovo percorso mantenendo i parametri', () => {
    expect(percorsoAdminDaUtenti('')).toBe('/admin')
    expect(percorsoAdminDaUtenti('?tab=feedback')).toBe('/admin?tab=feedback')
    expect(percorsoAdminDaUtenti('?zona=salone&id=ada')).toBe('/admin?id=ada&tab=saloni')
    expect(percorsoAdminDaUtenti('?zona=coda&cat=bug')).toBe('/admin?cat=bug&tab=suggerimenti')
  })
})
