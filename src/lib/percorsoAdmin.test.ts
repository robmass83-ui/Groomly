import { describe, expect, it } from 'vitest'
import { percorsoAdminDaUtenti } from './percorsoAdmin'

describe('percorsoAdminDaUtenti', () => {
  it('porta i link vecchi al nuovo percorso mantenendo i parametri', () => {
    expect(percorsoAdminDaUtenti('')).toBe('/impostazioni/admin-manager')
    expect(percorsoAdminDaUtenti('?tab=feedback')).toBe('/impostazioni/admin-manager?tab=feedback')
    expect(percorsoAdminDaUtenti('?zona=salone&id=ada')).toBe('/impostazioni/admin-manager?id=ada&tab=saloni')
    expect(percorsoAdminDaUtenti('?zona=coda&cat=bug')).toBe('/impostazioni/admin-manager?cat=bug&tab=suggerimenti')
  })
})
