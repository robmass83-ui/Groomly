import { describe, expect, it } from 'vitest'
import { membroTitolareMancante } from './titolareMembro'

const titolare = { salonId: 's1', role: 'titolare', email: ' Ana@X.it ', firstName: 'Ana', lastName: 'Bi' }

describe('membroTitolareMancante', () => {
  it('crea il titolare se manca', () => {
    expect(membroTitolareMancante('s1', false, titolare)).toEqual({
      uid: 's1',
      email: 'ana@x.it',
      role: 'titolare',
      firstName: 'Ana',
      lastName: 'Bi',
      status: 'attivo',
    })
  })

  it('già presente non tocca', () => {
    expect(membroTitolareMancante('s1', true, titolare)).toBeNull()
  })

  it('account mancante', () => {
    expect(membroTitolareMancante('s1', false, undefined)).toBeNull()
  })

  it('account non titolare', () => {
    expect(membroTitolareMancante('s1', false, { ...titolare, role: 'socio' })).toBeNull()
  })

  it('titolare entrato in un altro salone', () => {
    expect(membroTitolareMancante('s1', false, { ...titolare, salonId: 'altro' })).toBeNull()
  })

  it('campi mancanti', () => {
    expect(membroTitolareMancante('s1', false, { salonId: 's1', role: 'titolare' })).toEqual({
      uid: 's1',
      email: '',
      role: 'titolare',
      firstName: '',
      lastName: '',
      status: 'attivo',
    })
  })
})
