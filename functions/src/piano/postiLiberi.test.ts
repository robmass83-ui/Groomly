import { describe, expect, it } from 'vitest'
import { istanteRoma, orariLiberi } from '../../../src/lib/disponibilita'
import { appuntamentoOccupato, dataDi } from './postiLiberi'

describe('visite in millisecondi', () => {
  const giorno = '2026-10-28'
  const inizio = istanteRoma(giorno, '10:00')
  const visita = (scadeIl?: Date) => ({
    start: inizio.getTime(),
    end: inizio.getTime() + 60 * 60 * 1000,
    status: 'programmato',
    ...(scadeIl ? { provvisorio: true, scadeIl: scadeIl.toISOString() } : {}),
  })
  const liberi = (adesso: Date, data: Record<string, unknown>) => orariLiberi({
    giorno,
    fasce: [{ da: '09:00', a: '12:00' }],
    passoMin: 60,
    durataMin: 60,
    appuntamenti: appuntamentoOccupato(data),
    richieste: [],
    adesso,
  })

  it('dataDi legge anche i millisecondi e scarta i numeri non finiti', () => {
    expect(dataDi(inizio.getTime())?.getTime()).toBe(inizio.getTime())
    expect(dataDi(Number.NaN)).toBeNull()
    expect(dataDi(Number.POSITIVE_INFINITY)).toBeNull()
  })

  it('una proposta con scadenza futura toglie quell’ora', () => {
    const adesso = istanteRoma(giorno, '08:00')
    expect(liberi(adesso, visita(istanteRoma(giorno, '09:00')))).toEqual(['09:00', '11:00'])
  })

  it('la stessa proposta con scadenza passata lascia libera l’ora', () => {
    const adesso = istanteRoma(giorno, '09:30')
    expect(liberi(adesso, visita(istanteRoma(giorno, '09:00')))).toEqual(['09:00', '10:00', '11:00'])
  })

  it('un programmato non provvisorio occupa sempre l’ora', () => {
    const adesso = istanteRoma(giorno, '08:00')
    expect(liberi(adesso, visita())).toEqual(['09:00', '11:00'])
  })
})
