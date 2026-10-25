import { describe, expect, it } from 'vitest'
import { hrefVoce, vociMenuPiani } from './vociMenu'

describe('voci del menu piani', () => {
  it('con il flag spento restano solo privacy e elimina account', () => {
    expect(vociMenuPiani(false)).toEqual(['Privacy e termini', 'Elimina account'])
    expect(vociMenuPiani(false)).not.toContain('Il tuo piano')
    expect(vociMenuPiani(false)).not.toContain('Team')
  })

  it('con il flag acceso compaiono le sezioni', () => {
    expect(vociMenuPiani(true)).toEqual([
      'Il tuo piano',
      'Team',
      'Messaggi ai clienti',
      'Strumenti',
      'Privacy e termini',
      'Elimina account',
    ])
  })

  it('ogni voce ha una route', () => {
    expect(hrefVoce('Privacy e termini')).toBe('/impostazioni/privacy')
    expect(hrefVoce('Elimina account')).toBe('/impostazioni/account/elimina')
    expect(hrefVoce('Team')).toBe('/impostazioni/team')
  })
})
