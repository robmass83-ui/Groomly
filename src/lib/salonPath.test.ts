import { describe, expect, it } from 'vitest'
import {
  accountCreateAllowed,
  canReadSalon,
  isLauraEmail,
  operatoreAutorizzato,
  isSharedEmail,
  lauraAccount,
  newOwnerAccount,
  salonCollection,
  sharedMemberAccount,
  usesOnlyCloudData,
} from './salonPath'

describe('salonPath', () => {
  it('shared resta salon/shared e un id nuovo sta sotto salons', () => {
    expect(salonCollection('shared')).toEqual(['salon', 'shared'])
    expect(salonCollection('uid-9')).toEqual(['salons', 'uid-9'])
  })

  it('riconosce solo l’email di Laura, in qualunque maiuscolo', () => {
    expect(isLauraEmail(' Laura.Masala@tiscali.it ')).toBe(true)
    expect(isLauraEmail('robmass83@gmail.com')).toBe(false)
    expect(isLauraEmail('robmass83@gmail.com')).toBe(false)
  })

  it('Laura e robmass83 sono condivise in qualunque maiuscolo, la hotmail no', () => {
    expect(isSharedEmail(' Laura.Masala@tiscali.it ')).toBe(true)
    expect(isSharedEmail(' RobMass83@gmail.com ')).toBe(true)
    expect(isSharedEmail('masala.roberto@hotmail.it')).toBe(false)
  })

  it('decide solo il claim, mai l’email', () => {
    expect(operatoreAutorizzato({ admin: true })).toBe(true)
    expect(operatoreAutorizzato({ admin: false })).toBe(false)
    expect(operatoreAutorizzato({})).toBe(false)
  })

  it('solo robmass83 dentro shared usa solo il cloud: Laura, un altro salone e le altre email no', () => {
    expect(usesOnlyCloudData(' RobMass83@gmail.com ', 'shared')).toBe(true)
    expect(usesOnlyCloudData('robmass83@gmail.com', 'uid-9')).toBe(false)
    expect(usesOnlyCloudData('robmass83@gmail.com', '')).toBe(false)
    expect(usesOnlyCloudData('laura.masala@tiscali.it', 'shared')).toBe(false)
    expect(usesOnlyCloudData('masala.roberto@hotmail.it', 'shared')).toBe(false)
    expect(usesOnlyCloudData(null, 'shared')).toBe(false)
  })

  it('robmass83 può il documento shared e ne conserva il nome', () => {
    const roberto = sharedMemberAccount('robmass83@gmail.com', { firstName: ' Roberto ', lastName: ' Masala ' })
    expect(roberto).toEqual({
      firstName: 'Roberto',
      lastName: 'Masala',
      email: 'robmass83@gmail.com',
      salonId: 'shared',
      role: 'titolare',
      legacy: true,
    })
    expect(accountCreateAllowed('rob', 'robmass83@gmail.com', roberto)).toBe(true)
    expect(accountCreateAllowed('uid-9', 'altro@example.com', { ...roberto, email: 'altro@example.com' })).toBe(false)
    expect(canReadSalon('robmass83@gmail.com', null, 'shared')).toBe(true)
  })

  it('un titolare nuovo ha id uguale all’utente e legacy falso', () => {
    expect(newOwnerAccount('uid-9', { firstName: ' Ada ', lastName: ' Neri ', email: 'Ada@Salone.it' })).toEqual({
      firstName: 'Ada',
      lastName: 'Neri',
      email: 'ada@salone.it',
      salonId: 'uid-9',
      role: 'titolare',
      legacy: false,
    })
  })

  it('Laura può il documento shared; un altro no. Il nuovo può solo il suo id', () => {
    const laura = lauraAccount('laura.masala@tiscali.it')
    const ada = newOwnerAccount('uid-9', { firstName: 'Ada', lastName: 'Neri', email: 'ada@salone.it' })
    expect(accountCreateAllowed('laura', 'laura.masala@tiscali.it', laura)).toBe(true)
    expect(accountCreateAllowed('uid-9', 'ada@salone.it', { ...ada, salonId: 'shared', legacy: true })).toBe(false)
    expect(accountCreateAllowed('uid-9', 'ada@salone.it', ada)).toBe(true)
    expect(canReadSalon('laura.masala@tiscali.it', null, 'shared')).toBe(true)
    expect(canReadSalon('ada@salone.it', ada, 'shared')).toBe(false)
    expect(canReadSalon('ada@salone.it', ada, 'uid-9')).toBe(true)
  })
})
