import { describe, expect, it } from 'vitest'
import { accessoSospeso } from './accessoSospeso'
import type { SalonAccess } from './salonRoster'

const spento: SalonAccess = {
  enabled: false,
  openInviteExpiries: [],
  members: [{
    uid: 'c1',
    email: 'c@salone.it',
    role: 'collaboratore',
    firstName: 'Ciro',
    lastName: 'Zeta',
    status: 'attivo',
  }],
}

describe('accesso sospeso', () => {
  it('il collaboratore con il piano spento è sospeso', () => {
    expect(accessoSospeso('collaboratore', spento, 'c1')).toBe(true)
  })

  it('il titolare non è sospeso', () => {
    expect(accessoSospeso('titolare', spento, 'c1')).toBe(false)
  })

  it('accessWithoutPro tiene l’accesso', () => {
    const access: SalonAccess = {
      ...spento,
      members: [{ ...spento.members[0], uid: 'rob', accessWithoutPro: true }],
    }
    expect(accessoSospeso('socio', access, 'rob')).toBe(false)
  })

  it('finché i membri non arrivano non decide', () => {
    expect(accessoSospeso('collaboratore', { ...spento, members: [] }, 'c1')).toBe(false)
    expect(accessoSospeso('collaboratore', null, 'c1')).toBe(false)
  })
})
