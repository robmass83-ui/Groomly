import { describe, expect, it } from 'vitest'
import {
  bucoDaSpostamento,
  bucoLasciato,
  inizioDaDoc,
  campiMancanti,
  ciSta,
  motivoPosto,
  oraAncoraDavanti,
  schermataAttesa,
  settimanaDi,
  settimanaPiena,
} from './listaAttesa'

describe('listaAttesa', () => {
  it('la settimana di mercoledì 4 novembre 2026 è dal 2 all’8', () => {
    expect(settimanaDi('2026-11-04')).toEqual({ inizio: '2026-11-02', fine: '2026-11-08' })
  })

  it('è piena se nessun giorno di quella settimana ha orari', () => {
    expect(settimanaPiena(['2026-11-09'], { inizio: '2026-11-02', fine: '2026-11-08' })).toBe(true)
    expect(settimanaPiena(['2026-11-04'], { inizio: '2026-11-02', fine: '2026-11-08' })).toBe(false)
  })

  it('chiede solo i campi ancora vuoti', () => {
    expect(campiMancanti({ nome: 'Anna', phone: '', email: 'a@b.it', nomeCane: '' })).toEqual(['phone', 'nomeCane'])
  })

  it('le 10 già passate alle 16 non sono davanti', () => {
    expect(oraAncoraDavanti(new Date('2026-11-04T09:00:00.000Z'), new Date('2026-11-04T15:00:00.000Z'))).toBe(false)
  })

  it('un’ora di trattamento non ci sta in mezz’ora', () => {
    const inizio = new Date('2026-11-04T09:00:00.000Z')
    const prossimo = new Date('2026-11-04T09:30:00.000Z')
    expect(ciSta(inizio, 60, prossimo)).toBe(false)
    expect(motivoPosto({ inizio, adesso: new Date('2026-11-04T08:00:00.000Z'), durataMin: 60, prossimoInizio: prossimo, preso: false })).toBe('non_ci_sta')
  })

  it('motivoPosto con preso true è occupato', () => {
    const inizio = new Date('2026-11-04T09:00:00.000Z')
    expect(motivoPosto({ inizio, adesso: new Date('2026-11-04T08:00:00.000Z'), durataMin: 30, prossimoInizio: null, preso: true })).toBe('occupato')
  })

  it('motivoPosto con inizio futuro e posto libero è libero', () => {
    const inizio = new Date('2026-11-04T09:00:00.000Z')
    expect(motivoPosto({ inizio, adesso: new Date('2026-11-04T08:00:00.000Z'), durataMin: 30, prossimoInizio: new Date('2026-11-04T10:00:00.000Z'), preso: false })).toBe('libero')
  })

  it('motivoPosto con inizio nel passato è passato anche se non preso', () => {
    const inizio = new Date('2026-11-04T09:00:00.000Z')
    expect(motivoPosto({ inizio, adesso: new Date('2026-11-04T15:00:00.000Z'), durataMin: 30, prossimoInizio: null, preso: false })).toBe('passato')
  })
})

describe('buco lasciato da una visita', () => {
  const adesso = new Date('2026-11-04T08:00:00.000Z')
  const davanti = new Date('2026-11-04T09:00:00.000Z')

  it('una cancellazione con l’ora ancora davanti lascia il segno con inizio ISO e nome del cane', () => {
    expect(bucoLasciato({ appointmentId: 'v1', inizio: davanti, nomeCane: 'Luna', adesso })).toEqual({
      appointmentId: 'v1',
      inizio: '2026-11-04T09:00:00.000Z',
      nomeCane: 'Luna',
    })
  })

  it('l’ora passata, uguale ad adesso o illeggibile non lascia nulla', () => {
    expect(bucoLasciato({ appointmentId: 'v1', inizio: new Date('2026-11-04T07:00:00.000Z'), nomeCane: 'Luna', adesso })).toBeNull()
    expect(bucoLasciato({ appointmentId: 'v1', inizio: adesso, nomeCane: 'Luna', adesso })).toBeNull()
    expect(bucoLasciato({ appointmentId: 'v1', inizio: null, nomeCane: 'Luna', adesso })).toBeNull()
    expect(bucoLasciato({ appointmentId: '', inizio: davanti, nomeCane: 'Luna', adesso })).toBeNull()
  })

  it('lo spostamento lascia il segno sull’ora vecchia solo se è cambiata ed era ancora davanti', () => {
    const nuovo = new Date('2026-11-05T09:00:00.000Z')
    expect(bucoDaSpostamento({ appointmentId: 'v1', vecchio: davanti, nuovo, nomeCane: 'Luna', adesso })?.inizio).toBe('2026-11-04T09:00:00.000Z')
    expect(bucoDaSpostamento({ appointmentId: 'v1', vecchio: davanti, nuovo: davanti, nomeCane: 'Luna', adesso })).toBeNull()
    expect(bucoDaSpostamento({ appointmentId: 'v1', vecchio: new Date('2026-11-04T07:00:00.000Z'), nuovo, nomeCane: 'Luna', adesso })).toBeNull()
    expect(bucoDaSpostamento({ appointmentId: 'v1', vecchio: null, nuovo, nomeCane: 'Luna', adesso })).toBeNull()
  })

  it('l’inizio salvato si legge da millisecondi, da testo o da data', () => {
    expect(inizioDaDoc(davanti.getTime())?.toISOString()).toBe('2026-11-04T09:00:00.000Z')
    expect(inizioDaDoc('2026-11-04T09:00:00.000Z')?.getTime()).toBe(davanti.getTime())
    expect(inizioDaDoc(davanti)?.getTime()).toBe(davanti.getTime())
    expect(inizioDaDoc('boh')).toBeNull()
    expect(inizioDaDoc(undefined)).toBeNull()
  })

  it('il link offre la conferma solo se il posto è libero, altrimenti chiede di restare in lista', () => {
    expect(schermataAttesa('libero')).toBe('conferma')
    expect(schermataAttesa('occupato')).toBe('resta')
    expect(schermataAttesa('non_ci_sta')).toBe('resta')
    expect(schermataAttesa('passato')).toBe('resta')
  })
})
