import { describe, expect, it } from 'vitest'
import { ambienteValido, bersaglioSaloneProva, decidiCollega, decidiStacca, type StatoRobmass, type StatoStacco } from './passaggioAdmin'

const BASE: StatoRobmass = { uid: 'rob', salonId: 'rob', altrePersone: 0, membroAttivo: false, lauraUid: 'laura', lauraSalonId: 'laura' }
const STACCO: StatoStacco = { hotmailUid: 'hot', claimAdmin: true, robmassSalonId: 'laura', lauraUid: 'laura', robmassEntratoDopoCollegamento: true }

describe('collega', () => {
  it('con un salone di prova lo elimina, poi scrive account e membro', () => {
    expect(decidiCollega(BASE)).toEqual({ ok: true, passi: ['elimina-salone-prova', 'scrivi-account', 'scrivi-membro'] })
  })

  it('senza salone proprio scrive solo account e membro', () => {
    expect(decidiCollega({ ...BASE, salonId: null })).toEqual({ ok: true, passi: ['scrivi-account', 'scrivi-membro'] })
    expect(decidiCollega({ ...BASE, salonId: 'shared' })).toEqual({ ok: true, passi: ['scrivi-account', 'scrivi-membro'] })
  })

  it('già collegato non fa nulla, ma ripara il membro mancante', () => {
    expect(decidiCollega({ ...BASE, salonId: 'laura', membroAttivo: true })).toEqual({ ok: true, passi: [] })
    expect(decidiCollega({ ...BASE, salonId: 'laura' })).toEqual({ ok: true, passi: ['scrivi-account', 'scrivi-membro'] })
  })

  it('si ferma se robmass83 non esiste', () => {
    expect(decidiCollega({ ...BASE, uid: null }).ok).toBe(false)
  })

  it('si ferma se il salone di prova ha altre persone', () => {
    expect(decidiCollega({ ...BASE, altrePersone: 1 }).ok).toBe(false)
  })

  it('si ferma se l’account punta a un terzo salone', () => {
    expect(decidiCollega({ ...BASE, salonId: 'altro' }).ok).toBe(false)
  })

  it('si ferma se Laura non è dove ci si aspetta', () => {
    expect(decidiCollega({ ...BASE, lauraUid: null }).ok).toBe(false)
    expect(decidiCollega({ ...BASE, lauraSalonId: 'shared' }).ok).toBe(false)
    expect(decidiCollega({ ...BASE, lauraSalonId: null }).ok).toBe(false)
  })

  it('si ferma se robmass83 e Laura sono lo stesso uid', () => {
    expect(decidiCollega({ ...BASE, uid: 'laura', salonId: 'laura' }).ok).toBe(false)
  })
})

describe('bersaglio dell’eliminazione', () => {
  it('è solo il salone di robmass83', () => {
    expect(bersaglioSaloneProva('rob', 'laura')).toBe('salons/rob')
  })

  it.each([
    ['shared', 'laura'],
    ['laura', 'laura'],
    ['', 'laura'],
    ['a/b', 'laura'],
    ['rob', ''],
  ])('rifiuta %j con Laura %j', (uid, laura) => {
    expect(() => bersaglioSaloneProva(uid, laura)).toThrow()
  })
})

describe('stacca', () => {
  it('elimina account e membro della hotmail', () => {
    expect(decidiStacca(STACCO)).toEqual({ ok: true, passi: ['elimina-account-hotmail', 'elimina-membro-hotmail'] })
  })

  it('si ferma senza il claim: la hotmail resterebbe fuori da tutto', () => {
    expect(decidiStacca({ ...STACCO, claimAdmin: false }).ok).toBe(false)
  })

  it('si ferma se robmass83 non è nel salone di Laura', () => {
    expect(decidiStacca({ ...STACCO, robmassSalonId: 'rob' }).ok).toBe(false)
    expect(decidiStacca({ ...STACCO, robmassSalonId: null }).ok).toBe(false)
    expect(decidiStacca({ ...STACCO, lauraUid: null, robmassSalonId: null }).ok).toBe(false)
  })

  it('si ferma se robmass83 non è ancora entrato dopo il collegamento', () => {
    expect(decidiStacca({ ...STACCO, robmassEntratoDopoCollegamento: false }).ok).toBe(false)
  })

  it('si ferma se la hotmail non esiste', () => {
    expect(decidiStacca({ ...STACCO, hotmailUid: null }).ok).toBe(false)
  })
})

describe('ambiente dello script', () => {
  const FS = '127.0.0.1:8080'
  const AUTH = '127.0.0.1:9099'

  it('produzione senza emulatori, demo con entrambi', () => {
    expect(ambienteValido({ progetto: 'groomly-3128b' })).toBe(true)
    expect(ambienteValido({ progetto: 'demo-groomly', firestore: FS, auth: AUTH })).toBe(true)
  })

  it('mai un solo emulatore: un servizio finirebbe in produzione', () => {
    expect(ambienteValido({ progetto: 'groomly-3128b', auth: AUTH })).toBe(false)
    expect(ambienteValido({ progetto: 'groomly-3128b', firestore: FS })).toBe(false)
    expect(ambienteValido({ progetto: 'demo-groomly', auth: AUTH })).toBe(false)
  })

  it('emulatori e progetto devono coincidere', () => {
    expect(ambienteValido({ progetto: 'groomly-3128b', firestore: FS, auth: AUTH })).toBe(false)
    expect(ambienteValido({ progetto: 'demo-groomly' })).toBe(false)
  })
})
