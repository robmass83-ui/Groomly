import { describe, expect, it } from 'vitest'
import { istanteRoma, orariLiberi } from '../../../src/lib/disponibilita'
import { appuntamentoOccupato, dataDi, intervalloAncoraLibero, preparaRichiestaPer, richiestaOccupata } from './postiLiberi'

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

  it('una visita già salvata senza fine occupa comunque i servizi', () => {
    const adesso = istanteRoma(giorno, '08:00')
    const senzaFine = {
      start: inizio.getTime(),
      status: 'programmato',
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 90, price: 20 }],
    }
    expect(liberi(adesso, senzaFine)).toEqual(['09:00'])
    const disdetta = { ...senzaFine, status: 'disdetto' }
    expect(liberi(adesso, disdetta)).toEqual(['09:00', '10:00', '11:00'])
    const personale = { start: inizio.getTime(), kind: 'personale', title: 'Pausa' }
    expect(liberi(adesso, personale)).toEqual(['09:00', '10:00', '11:00'])
  })

  it('una richiesta nuova senza scadenza occupa l’ora, una rifiutata o una proposta no', () => {
    const adesso = istanteRoma(giorno, '08:00')
    const nuova = {
      status: 'nuova',
      start: inizio.toISOString(),
      end: new Date(inizio.getTime() + 60 * 60 * 1000).toISOString(),
    }
    const ore = (docs: Record<string, unknown>[]) => orariLiberi({
      giorno,
      fasce: [{ da: '09:00', a: '12:00' }],
      passoMin: 60,
      durataMin: 60,
      appuntamenti: [],
      richieste: docs.flatMap((data) => richiestaOccupata(data)),
      adesso,
    })
    expect(ore([nuova])).toEqual(['09:00', '11:00'])
    expect(ore([{ ...nuova, status: 'rifiutata' }])).toEqual(['09:00', '10:00', '11:00'])
    expect(ore([{ ...nuova, status: 'proposta', scadeIl: istanteRoma(giorno, '18:00').toISOString() }])).toEqual(['09:00', '10:00', '11:00'])
    expect(ore([{ status: 'nuova', start: inizio.toISOString(), durataMin: 90 }])).toEqual(['09:00'])
  })

  it('la richiesta che si conferma non occupa la propria ora, un’altra nuova o una visita sì', () => {
    const fine = new Date(inizio.getTime() + 60 * 60 * 1000)
    const nuova = { status: 'nuova', start: inizio.toISOString(), end: fine.toISOString() }
    const adesso = istanteRoma(giorno, '08:00')
    const base = {
      inizio,
      fine,
      adesso,
      appuntamenti: [] as Record<string, unknown>[],
      richieste: [{ id: 'r1', data: nuova }],
      esclusa: 'r1',
    }
    expect(intervalloAncoraLibero(base)).toBe(true)
    expect(intervalloAncoraLibero({ ...base, esclusa: 'altra' })).toBe(false)
    expect(intervalloAncoraLibero({
      ...base,
      richieste: [],
      appuntamenti: [{ start: inizio.getTime(), end: fine.getTime(), status: 'programmato' }],
    })).toBe(false)
    expect(intervalloAncoraLibero({
      ...base,
      richieste: [],
      appuntamenti: [{ start: inizio.getTime(), end: fine.getTime(), status: 'disdetto' }],
    })).toBe(true)
  })
})

it('preparaRichiesta non scrive più', async () => {
  await expect(preparaRichiestaPer({ salonId: 'salone', phone: '3331234567', esca: '' })).rejects.toThrow('Richiesta non valida')
})
