import { describe, expect, it } from 'vitest'
import { deveVedereTour, leggiConfigTour, leggiTourSalone, passiDelTour } from './tourBenvenuto'

const acceso = { acceso: true, dal: '2026-10-30T10:00:00.000Z' }
const base = { config: acceso, creazioneAccount: '2026-10-30T11:00:00.000Z', titolare: true, operatore: false, tour: undefined }

describe('tourBenvenuto', () => {
  it('nuovo iscritto dopo l’accensione vede il tour', () => expect(deveVedereTour(base)).toBe('tour'))
  it('interruttore spento: niente, anche a metà', () => {
    expect(deveVedereTour({ ...base, config: { acceso: false, dal: acceso.dal } })).toBe('niente')
    expect(deveVedereTour({ ...base, config: { acceso: false, dal: acceso.dal }, tour: { stato: 'in-corso', saltati: [] } })).toBe('niente')
  })
  it('account creato prima di dal, o senza data: niente', () => {
    expect(deveVedereTour({ ...base, creazioneAccount: '2026-10-30T09:59:59.000Z' })).toBe('niente')
    expect(deveVedereTour({ ...base, creazioneAccount: null })).toBe('niente')
    expect(deveVedereTour({ ...base, creazioneAccount: 'boh' })).toBe('niente')
  })
  it('chi non è titolare (socio, collaboratore) e operatore: niente', () => {
    expect(deveVedereTour({ ...base, titolare: false })).toBe('niente')
    expect(deveVedereTour({ ...base, operatore: true })).toBe('niente')
  })
  it('a metà → avviso; visto → niente', () => {
    expect(deveVedereTour({ ...base, tour: { stato: 'in-corso', saltati: ['logo'] } })).toBe('avviso')
    expect(deveVedereTour({ ...base, tour: { stato: 'visto', saltati: [] } })).toBe('niente')
  })
  it('passiDelTour: listino sempre, fatti e saltati fuori, email mai se fatta', () => {
    const passi = [
      { id: 'logo', fatto: false }, { id: 'sede', fatto: true }, { id: 'listino', fatto: true },
      { id: 'backup', fatto: false }, { id: 'email', fatto: true }, { id: 'fiscale', fatto: false },
    ] as const
    expect(passiDelTour(passi, [])).toEqual(['logo', 'listino', 'backup', 'fiscale'])
    expect(passiDelTour(passi, ['logo', 'listino'])).toEqual(['backup', 'fiscale'])
  })
  it('leggiConfigTour e leggiTourSalone scartano forme sbagliate', () => {
    expect(leggiConfigTour(null)).toEqual({ acceso: false, dal: null })
    expect(leggiConfigTour({ tourBenvenuto: { acceso: 'si' } })).toEqual({ acceso: false, dal: null })
    expect(leggiConfigTour({ tourBenvenuto: { acceso: true, dal: acceso.dal } })).toEqual(acceso)
    expect(leggiTourSalone({ stato: 'boh' })).toBeUndefined()
    expect(leggiTourSalone({ stato: 'in-corso', saltati: ['logo', 'logo', 'x'] })).toEqual({ stato: 'in-corso', saltati: ['logo'] })
  })
})
