import { describe, expect, it } from 'vitest'
import {
  campiMancanti,
  ciSta,
  motivoPosto,
  oraAncoraDavanti,
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
