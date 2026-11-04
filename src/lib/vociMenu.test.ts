import { describe, expect, it } from 'vitest'
import { hrefVoce, vociMenuPiani } from './vociMenu'

describe('voci del menu piani', () => {
  it('con il flag spento restano strumenti, privacy e elimina account', () => {
    expect(vociMenuPiani(false)).toEqual(['formStrumenti', 'privacy', 'eliminaAccount'])
    expect(vociMenuPiani(false)).not.toContain('abbIlTuoPiano')
    expect(vociMenuPiani(false)).not.toContain('team')
    expect(vociMenuPiani(false)).not.toContain('messaggi')
  })

  it('con il flag acceso compaiono le sezioni', () => {
    expect(vociMenuPiani(true)).toEqual([
      'abbIlTuoPiano',
      'team',
      'messaggi',
      'formStrumenti',
      'privacy',
      'eliminaAccount',
    ])
  })

  it('ogni voce ha una route', () => {
    expect(hrefVoce('privacy')).toBe('/impostazioni/privacy')
    expect(hrefVoce('eliminaAccount')).toBe('/impostazioni/account/elimina')
    expect(hrefVoce('team')).toBe('/impostazioni/team')
    expect(hrefVoce('formStrumenti')).toBe('/impostazioni/abbonamento')
  })
})
