import { describe, expect, it } from 'vitest'
import {
  accountCreateAllowed,
  canReadSalon,
  isLauraEmail,
  isOperator,
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
    expect(isLauraEmail('masala.roberto@hotmail.it')).toBe(false)
  })

  it('le due email del salone sono condivise e operatrici, in qualunque maiuscolo', () => {
    expect(isSharedEmail(' Laura.Masala@tiscali.it ')).toBe(true)
    expect(isOperator(' MASALA.ROBERTO@hotmail.it ')).toBe(true)
    expect(isSharedEmail('robmass83@gmail.com')).toBe(false)
    expect(isOperator('robmass83@gmail.com')).toBe(false)
  })

  it('solo Roberto dentro shared usa solo il cloud: Laura, un altro salone e le altre email no', () => {
    expect(usesOnlyCloudData(' MASALA.ROBERTO@hotmail.it ', 'shared')).toBe(true)
    expect(usesOnlyCloudData('masala.roberto@hotmail.it', 'uid-9')).toBe(false)
    expect(usesOnlyCloudData('masala.roberto@hotmail.it', '')).toBe(false)
    expect(usesOnlyCloudData('laura.masala@tiscali.it', 'shared')).toBe(false)
    expect(usesOnlyCloudData('robmass83@gmail.com', 'shared')).toBe(false)
    expect(usesOnlyCloudData(null, 'shared')).toBe(false)
  })

  it('Roberto può il documento shared e ne conserva il nome', () => {
    const roberto = sharedMemberAccount('masala.roberto@hotmail.it', { firstName: ' Roberto ', lastName: ' Masala ' })
    expect(roberto).toEqual({
      firstName: 'Roberto',
      lastName: 'Masala',
      email: 'masala.roberto@hotmail.it',
      salonId: 'shared',
      role: 'titolare',
      legacy: true,
    })
    expect(accountCreateAllowed('rob', 'masala.roberto@hotmail.it', roberto)).toBe(true)
    expect(accountCreateAllowed('uid-9', 'robmass83@gmail.com', { ...roberto, email: 'robmass83@gmail.com' })).toBe(false)
    expect(canReadSalon('masala.roberto@hotmail.it', null, 'shared')).toBe(true)
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
