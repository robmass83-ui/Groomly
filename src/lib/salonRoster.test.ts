import { describe, expect, it } from 'vitest'
import { pickerMembers, rosterLabel, type SalonAccess, type SalonMember } from './salonRoster'

function member(partial: Partial<SalonMember> & Pick<SalonMember, 'uid' | 'role'>): SalonMember {
  return {
    email: 'a@salone.it',
    firstName: '',
    lastName: '',
    status: 'attivo',
    ...partial,
  }
}

describe('salonRoster role', () => {
  it('un membro senza nome usa l’email', () => {
    expect(rosterLabel(member({
      uid: 'a',
      role: 'collaboratore',
      firstName: '',
      lastName: '',
      email: 'ada@salone.it',
    }))).toBe('ada@salone.it')
    expect(rosterLabel(member({
      uid: 'a',
      role: 'collaboratore',
      firstName: '  ',
      lastName: ' ',
      email: 'ada@salone.it',
    }))).toBe('ada@salone.it')
    expect(rosterLabel(member({
      uid: 'a',
      role: 'titolare',
      firstName: 'Ada',
      lastName: 'Neri',
      email: 'ada@salone.it',
    }))).toBe('Ada Neri')
  })

  it('l’ordine del selettore è titolare, socio, collaboratore e i revocati non entrano', () => {
    const access: SalonAccess = {
      enabled: true,
      members: [
        member({ uid: 'c2', role: 'collaboratore', firstName: 'Lia', lastName: 'Bianchi', email: 'lia@salone.it' }),
        member({ uid: 'rev', role: 'socio', firstName: 'Revo', lastName: 'Cato', email: 'revo@salone.it', status: 'revocato' }),
        member({ uid: 'c1', role: 'collaboratore', firstName: 'Ciro', lastName: 'Zeta', email: 'ciro@salone.it' }),
        member({ uid: 's2', role: 'socio', firstName: 'Zoe', lastName: 'Neri', email: 'zoe@salone.it' }),
        member({ uid: 't', role: 'titolare', firstName: 'Ada', lastName: 'Neri', email: 'ada@salone.it' }),
        member({ uid: 's1', role: 'socio', firstName: 'Anna', lastName: 'Bass', email: 'anna@salone.it' }),
      ],
    }
    expect(pickerMembers(access).map((item) => item.uid)).toEqual(['t', 's1', 's2', 'c1', 'c2'])
  })

  it('con Pro spento il selettore per role resta vuoto', () => {
    const access: SalonAccess = {
      enabled: false,
      members: [
        member({ uid: 't', role: 'titolare', firstName: 'Ada', lastName: 'Neri' }),
        member({ uid: 'c', role: 'collaboratore', firstName: 'Ciro', lastName: 'Zeta' }),
      ],
    }
    expect(pickerMembers(access)).toEqual([])
  })
})
