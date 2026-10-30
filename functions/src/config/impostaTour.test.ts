import { describe, expect, it } from 'vitest'
import { configTourDopo, impostaTourPer } from './impostaTour'

describe('interruttore del tour', () => {
  const adesso = new Date('2026-10-30T10:00:00Z')

  it('rifiuta Laura se l’email non è verificata', async () => {
    await expect(impostaTourPer({
      operatorEmail: 'laura.masala@tiscali.it',
      emailVerified: false,
      acceso: true,
    })).rejects.toThrow('Accesso negato')
  })

  it('accendere aggiorna sempre dal', () => {
    expect(configTourDopo(true, adesso, { dal: 'vecchio' })).toEqual({ acceso: true, dal: '2026-10-30T10:00:00.000Z' })
  })

  it('spegnere conserva il dal attuale', () => {
    expect(configTourDopo(false, adesso, { dal: 'x' })).toEqual({ acceso: false, dal: 'x' })
    expect(configTourDopo(false, adesso, null)).toEqual({ acceso: false, dal: null })
  })
})
