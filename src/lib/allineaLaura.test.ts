import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  copiaBloccata,
  impronta,
  insiemeCancellazione,
  legacyAllineato,
  percorsiUguali,
  scrittureAccount,
  troddioniValido,
} from './allineaLaura'

describe('allineaLaura', () => {
  it('blocca la copia se in destinazione c\'è già un cane, un appuntamento o un file', () => {
    expect(copiaBloccata(['salons/l/settings/main'])).toBe(false)
    expect(copiaBloccata(['salons/l/dogs/rex'])).toBe(true)
    expect(copiaBloccata(['salons/l/appointments/a1'])).toBe(true)
    expect(copiaBloccata(['salons/l/files/f1/chunks/0'])).toBe(true)
  })

  it('confronta i percorsi relativi, non il prefisso del salone', () => {
    expect(percorsiUguali(
      ['salon/shared/dogs/rex', 'salon/shared/files/f1/chunks/0'],
      ['salons/laura/dogs/rex', 'salons/laura/files/f1/chunks/0'],
    )).toBe(true)
    expect(percorsiUguali(['salon/shared/dogs/rex'], ['salons/laura/dogs/lux'])).toBe(false)
  })

  it('legacy è falso solo se l\'email è già confermata', () => {
    expect(legacyAllineato(true)).toBe(false)
    expect(legacyAllineato(false)).toBe(true)
  })

  it('Laura è titolare, Roberto è socio con accesso anche a Pro spento', () => {
    const wrote = scrittureAccount({
      lauraUid: 'laura',
      robertoUid: 'rob',
      lauraVerified: false,
      robertoVerified: true,
      laura: { firstName: 'Laura', lastName: 'Masala', email: ' Laura.Masala@tiscali.it ' },
      roberto: { firstName: 'Roberto', lastName: 'Masala', email: 'masala.roberto@hotmail.it' },
    })
    expect(wrote.laura).toMatchObject({ uid: 'laura', salonId: 'laura', role: 'titolare', legacy: true, email: 'laura.masala@tiscali.it' })
    expect(wrote.roberto).toMatchObject({ uid: 'rob', salonId: 'laura', role: 'socio', legacy: false })
    expect(wrote.membroLaura).toMatchObject({ uid: 'laura', role: 'titolare', status: 'attivo' })
    expect(wrote.membroLaura).not.toHaveProperty('accessWithoutPro')
    expect(wrote.membroRoberto).toMatchObject({ uid: 'rob', role: 'socio', status: 'attivo', accessWithoutPro: true })
    expect(wrote.pro).toEqual({ enabled: true, seats: 3 })
  })

  it('il salone puntato è l\'uid Firebase di Laura, non la stringa fissa laura', () => {
    const wrote = scrittureAccount({
      lauraUid: 'uidLaura9x',
      robertoUid: 'uidRob8y',
      lauraVerified: true,
      robertoVerified: true,
      laura: { firstName: 'Laura', lastName: 'Masala', email: 'laura.masala@tiscali.it' },
      roberto: { firstName: 'Roberto', lastName: 'Masala', email: 'masala.roberto@hotmail.it' },
    })
    expect(wrote.laura).toMatchObject({ uid: 'uidLaura9x', salonId: 'uidLaura9x', role: 'titolare' })
    expect(wrote.roberto).toMatchObject({ uid: 'uidRob8y', salonId: 'uidLaura9x', role: 'socio' })
  })

  it('Troddioni vale solo con quel nome e un salone suo', () => {
    expect(troddioniValido({ salonId: 't1', lauraUid: 'laura', businessName: ' Troddioni ' })).toBe(true)
    expect(troddioniValido({ salonId: 't1', lauraUid: 'laura', businessName: 'Altro' })).toBe(false)
    expect(troddioniValido({ salonId: 'shared', lauraUid: 'laura', businessName: 'Troddioni' })).toBe(false)
    expect(troddioniValido({ salonId: 'laura', lauraUid: 'laura', businessName: 'Troddioni' })).toBe(false)
    expect(troddioniValido({ salonId: '', lauraUid: 'laura', businessName: 'Troddioni' })).toBe(false)
  })

  it('l\'impronta è lo sha256 delle uid ordinate', () => {
    const body = ['b', 'a'].sort().join('\n')
    expect(impronta(['b', 'a'])).toBe(createHash('sha256').update(body).digest('hex'))
  })

  it('non cancella shared, Laura, Roberto, Troddioni, e si ferma se Troddioni non torna', () => {
    const base = {
      authUids: [
        { uid: 'laura', email: 'laura.masala@tiscali.it' },
        { uid: 'rob', email: 'masala.roberto@hotmail.it' },
        { uid: 't1', email: 'robmass83@gmail.com' },
        { uid: 'altro', email: 'altro@salone.it' },
      ],
      salonIds: ['laura', 'rob', 't1', 'vuoto', 'shared'],
      lauraUid: 'laura',
      robertoUid: 'rob',
      troddioniUid: 't1',
      troddioniSalonId: 't1',
      troddioniOk: true,
    }
    const ready = insiemeCancellazione(base)
    expect(ready?.uids).toEqual(['altro'])
    expect(ready?.salonIds).toEqual(['rob', 'vuoto'])
    expect(insiemeCancellazione({ ...base, troddioniOk: false })).toBeNull()
  })
})
