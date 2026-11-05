import { describe, expect, it } from 'vitest'
import { haParametriVecchi, percorsoAdminDaVecchio, percorsoSalone } from './percorsoAdmin'

describe('percorsoAdminDaVecchio', () => {
  it.each([
    ['', '/admin'],
    ['?tab=panoramica', '/admin'],
    ['?tab=saloni', '/admin/saloni'],
    ['?tab=saloni&id=X&vista=storico', '/admin/saloni/X?vista=storico'],
    ['?tab=beta&stato=invitato', '/admin/beta?stato=invitato'],
    ['?tab=beta&id=X', '/admin/saloni/X'],
    ['?tab=feedback', '/admin/assistenza?fonte=feedback'],
    ['?tab=suggerimenti&cat=bug', '/admin/assistenza?cat=bug&fonte=suggerimenti'],
    ['?tab=piani', '/admin/piani'],
    ['?zona=saloni', '/admin/saloni'],
    ['?zona=salone&id=ada', '/admin/saloni/ada'],
    ['?zona=note', '/admin/assistenza?fonte=suggerimenti'],
    ['?zona=coda&cat=bug', '/admin/assistenza?cat=bug&fonte=suggerimenti'],
  ])('%s porta a %s', (vecchio, nuovo) => {
    expect(percorsoAdminDaVecchio(vecchio)).toBe(nuovo)
  })

  it('tab vince su zona, come prima', () => {
    expect(percorsoAdminDaVecchio('?zona=note&tab=piani')).toBe('/admin/piani')
  })

  it('conserva i parametri sconosciuti', () => {
    expect(percorsoAdminDaVecchio('?tab=saloni&utm=mail')).toBe('/admin/saloni?utm=mail')
  })

  it('un tab sconosciuto porta alla Panoramica', () => {
    expect(percorsoAdminDaVecchio('?tab=boh')).toBe('/admin')
  })

  it('il risultato non ha più parametri vecchi: niente rimbalzi', () => {
    expect(haParametriVecchi(percorsoAdminDaVecchio('?tab=boh&zona=x'))).toBe(false)
  })

  it('un id strano resta dentro la rotta', () => {
    expect(percorsoSalone('a/b')).toBe('/admin/saloni/a%2Fb')
  })
})
