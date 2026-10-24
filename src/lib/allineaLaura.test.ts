import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  cancellaConsentita,
  copiaBloccata,
  eseguiCopia,
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

  it('copia gli stessi percorsi e non tocca una destinazione già piena', () => {
    const origine = new Map<string, Record<string, unknown>>([
      ['salon/shared/dogs/rex', { name: 'Rex' }],
      ['salon/shared/files/f1/chunks/0', { n: 0 }],
    ])
    const piena = new Map<string, Record<string, unknown>>([['salons/laura/dogs/gia', { name: 'Gia' }]])
    expect(eseguiCopia(origine, piena, 'laura')).toEqual({ ok: false, reason: 'destino-pieno' })
    expect(piena.has('salons/laura/dogs/rex')).toBe(false)
    const vuota = new Map<string, Record<string, unknown>>()
    const copied = eseguiCopia(origine, vuota, 'laura')
    expect(copied.ok).toBe(true)
    if (copied.ok) {
      expect(copied.destinazione.get('salons/laura/dogs/rex')).toEqual({ name: 'Rex' })
      expect(copied.destinazione.get('salons/laura/files/f1/chunks/0')).toEqual({ n: 0 })
    }
  })

  describe('uid protetto', () => {
    const base = () => ({
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
    })

    it('lauraUid vuoto restituisce null', () => {
      const vuoto = base()
      vuoto.authUids = [...vuoto.authUids, { uid: '', email: 'vuoto@salone.it' }]
      expect(insiemeCancellazione({ ...vuoto, lauraUid: '' })).toBeNull()
      const spazi = base()
      spazi.authUids = [...spazi.authUids, { uid: '   ', email: 'spazi@salone.it' }]
      expect(insiemeCancellazione({ ...spazi, lauraUid: '   ' })).toBeNull()
    })

    it('un uid assente da authUids restituisce null', () => {
      const input = base()
      input.authUids = input.authUids.filter((entry) => entry.uid !== 'rob')
      expect(insiemeCancellazione(input)).toBeNull()
    })

    it('laura.masala@tiscali.it non è tra le uid da cancellare se l’uid non è lauraUid', () => {
      const input = base()
      input.authUids = [
        ...input.authUids,
        { uid: 'uid-sbagliato', email: ' Laura.Masala@tiscali.it ' },
        { uid: 'uid-rob-sbagliato', email: ' masala.roberto@hotmail.it ' },
        { uid: 'uid-troddioni-sbagliato', email: 'Robmass83@gmail.com' },
      ]
      const ready = insiemeCancellazione(input)
      expect(ready).not.toBeNull()
      expect(ready!.uids).toEqual(['altro'])
      expect(ready!.uids).not.toContain('uid-sbagliato')
      expect(ready!.fingerprint).toBe(impronta(['altro']))
      expect(ready!.salonIds).toEqual(['rob', 'vuoto'])
    })
  })

  it('un cane in un altro salone non dà destino-pieno, quello di Laura sì', () => {
    const origine = new Map<string, Record<string, unknown>>([
      ['salon/shared/dogs/rex', { name: 'Rex' }],
    ])
    const altro = new Map<string, Record<string, unknown>>([
      ['salons/altro/dogs/gia', { name: 'Gia' }],
    ])
    const copied = eseguiCopia(origine, altro, 'laura')
    expect(copied).not.toEqual({ ok: false, reason: 'destino-pieno' })
    expect(copied.ok).toBe(true)
    expect([...altro.keys()]).toEqual(['salons/altro/dogs/gia'])

    const laura = new Map<string, Record<string, unknown>>([
      ['salons/laura/dogs/gia', { name: 'Gia' }],
    ])
    expect(eseguiCopia(origine, laura, 'laura')).toEqual({ ok: false, reason: 'destino-pieno' })
    expect([...laura.keys()]).toEqual(['salons/laura/dogs/gia'])
  })

  it('cancella solo se l’impronta è quella dell’elenco', () => {
    const ready = insiemeCancellazione({
      authUids: [
        { uid: 'laura', email: 'laura.masala@tiscali.it' },
        { uid: 'rob', email: 'masala.roberto@hotmail.it' },
        { uid: 't1', email: 'robmass83@gmail.com' },
        { uid: 'altro', email: 'altro@salone.it' },
      ],
      salonIds: ['laura', 'altro'],
      lauraUid: 'laura',
      robertoUid: 'rob',
      troddioniUid: 't1',
      troddioniSalonId: 't1',
      troddioniOk: true,
    })
    expect(ready).not.toBeNull()
    expect(cancellaConsentita(ready!.fingerprint, ready!)).toBe(true)
    expect(cancellaConsentita('no', ready!)).toBe(false)
  })
})
