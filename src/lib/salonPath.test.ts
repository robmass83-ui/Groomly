import { describe, expect, it } from 'vitest'
import {
  accountCreateAllowed,
  canReadSalon,
  isLauraEmail,
  lauraAccount,
  newOwnerAccount,
  salonCollection,
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
