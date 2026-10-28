import { describe, expect, it } from 'vitest'
import {
  calendarioPrenotabile,
  decisioneAntispam,
  elencaGiorni,
  fascePubbliche,
  fineOccupata,
  istanteRoma,
  oraRoma,
  orariLiberi,
  orariPrenotabili,
} from './disponibilita'

describe('disponibilità', () => {
  it('le 10:00 di Roma restano le 10:00 nel cambio dell’ora di marzo e di ottobre 2026', () => {
    expect(oraRoma(istanteRoma('2026-03-29', '10:00'))).toBe('10:00')
    expect(oraRoma(istanteRoma('2026-10-25', '10:00'))).toBe('10:00')
  })

  it('un programmato e una richiesta nuova occupano, un disdetto no, e non escono nomi di cani', () => {
    const giorno = '2026-10-26'
    const adesso = istanteRoma(giorno, '08:00')
    const fascia = (ora: string, minuti: number) => ({
      inizio: istanteRoma(giorno, ora),
      fine: new Date(istanteRoma(giorno, ora).getTime() + minuti * 60 * 1000),
    })
    const orari = orariLiberi({
      giorno,
      fasce: [{ da: '09:00', a: '13:00' }],
      passoMin: 60,
      durataMin: 60,
      appuntamenti: [
        { ...fascia('10:00', 60), status: 'programmato', cane: 'Rex' },
        { ...fascia('11:00', 60), status: 'disdetto', cane: 'Fido' },
      ],
      richieste: [
        { ...fascia('12:00', 60), status: 'nuova' },
        { ...fascia('09:00', 60), status: 'rifiutata' },
      ],
      adesso,
    })
    expect(orari).toEqual(['09:00', '11:00'])
    expect(JSON.stringify(orari)).not.toMatch(/Rex|Fido/)
  })

  it('il provvisorio occupa fino alla scadenza e poi libera il posto', () => {
    const giorno = '2026-10-28'
    const fascia = (ora: string) => ({
      inizio: istanteRoma(giorno, ora),
      fine: new Date(istanteRoma(giorno, ora).getTime() + 60 * 60 * 1000),
      status: 'programmato',
      provvisorio: true as const,
    })
    const base = {
      giorno,
      fasce: [{ da: '09:00', a: '12:00' }],
      passoMin: 60,
      durataMin: 60,
      richieste: [],
      adesso: istanteRoma(giorno, '08:00'),
    }
    expect(orariLiberi({
      ...base,
      appuntamenti: [{ ...fascia('10:00'), scadeIl: istanteRoma(giorno, '09:00') }],
    })).toEqual(['09:00', '11:00'])
    expect(orariLiberi({
      ...base,
      adesso: istanteRoma(giorno, '09:01'),
      appuntamenti: [{ ...fascia('10:00'), scadeIl: istanteRoma(giorno, '09:00') }],
    })).toEqual(['09:00', '10:00', '11:00'])
  })

  it('oggi pieno lascia solo le 16:00, un’ora già passata sparisce e la chiusura svuota il giorno', () => {
    const giorno = '2026-10-27'
    const adesso = istanteRoma(giorno, '15:30')
    const blocca = (ora: string) => ({
      inizio: istanteRoma(giorno, ora),
      fine: new Date(istanteRoma(giorno, ora).getTime() + 60 * 60 * 1000),
      status: 'programmato',
    })
    const pieni = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '17:00', '18:00'].map(blocca)
    expect(orariPrenotabili({
      giorno,
      fasce: [{ da: '09:00', a: '19:00' }],
      passoMin: 60,
      durataMin: 60,
      chiuso: false,
      appuntamenti: pieni,
      richieste: [],
      adesso,
    })).toEqual(['16:00'])
    expect(orariPrenotabili({
      giorno,
      fasce: [{ da: '09:00', a: '19:00' }],
      passoMin: 60,
      durataMin: 60,
      chiuso: true,
      appuntamenti: [],
      richieste: [],
      adesso,
    })).toEqual([])
    const senzaNove = orariPrenotabili({
      giorno,
      fasce: [{ da: '09:00', a: '12:00' }],
      passoMin: 60,
      durataMin: 60,
      chiuso: false,
      appuntamenti: [],
      richieste: [],
      adesso,
    })
    expect(senzaNove).not.toContain('09:00')
  })

  it('il calendario pubblico segue orari, chiusure e l’orizzonte, e una richiesta senza fine occupa un’ora', () => {
    const giorno = '2026-10-27'
    const adesso = istanteRoma(giorno, '08:00')
    const inizio = istanteRoma(giorno, '10:00')
    expect(fineOccupata(inizio, inizio).getTime() - inizio.getTime()).toBe(60 * 60 * 1000)
    expect(elencaGiorni('2026-10-31', 2)).toEqual(['2026-10-31', '2026-11-01'])
    expect(fascePubbliche(undefined, giorno)).toEqual([{ da: '08:00', a: '20:00' }])
    expect(fascePubbliche({ 2: [{ da: '09:00', a: '13:00' }] }, '2026-11-01')).toEqual([])
    const mappa = calendarioPrenotabile({
      dal: giorno,
      quanti: 3,
      orari: { 2: [{ da: '09:00', a: '11:00' }], 3: [{ da: '09:00', a: '11:00' }], 4: [{ da: '09:00', a: '11:00' }] },
      chiusure: [{ startDay: '2026-10-28', endDay: '2026-10-28' }],
      passoMin: 60,
      durataMin: 60,
      appuntamenti: [],
      richieste: [],
      adesso,
    })
    expect(mappa['2026-10-27']).toEqual(['09:00', '10:00'])
    expect(mappa['2026-10-28']).toBeUndefined()
    expect(mappa['2026-10-29']).toEqual(['09:00', '10:00'])
    expect(Object.keys(calendarioPrenotabile({
      dal: '2027-01-01',
      quanti: 3,
      orari: undefined,
      chiusure: [],
      passoMin: 60,
      durataMin: 60,
      appuntamenti: [],
      richieste: [],
      adesso,
    }))).toEqual([])
  })

  it('oltre due richieste per telefono o venti per salone rifiuta, e l’esca non scrive', () => {
    expect(decisioneAntispam({ aperteTelefono: 2, aperteSalone: 0, esca: '' })).toEqual({ ok: false, message: 'Troppe richieste' })
    expect(decisioneAntispam({ aperteTelefono: 0, aperteSalone: 20, esca: '' }).ok).toBe(false)
    expect(decisioneAntispam({ aperteTelefono: 0, aperteSalone: 0, esca: 'bot' })).toEqual({ ok: true, scrivi: false })
    expect(decisioneAntispam({ aperteTelefono: 1, aperteSalone: 1, esca: '' })).toEqual({ ok: true, scrivi: true })
  })
})
