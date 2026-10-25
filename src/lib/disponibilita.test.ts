import { describe, expect, it } from 'vitest'
import { decisioneAntispam, istanteRoma, oraRoma, orariLiberi } from './disponibilita'

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
        { ...fascia('12:00', 60), status: 'nuova', scadeIl: istanteRoma(giorno, '18:00') },
      ],
      adesso,
    })
    expect(orari).toEqual(['09:00', '11:00'])
    expect(JSON.stringify(orari)).not.toMatch(/Rex|Fido/)
  })

  it('oltre due richieste per telefono o venti per salone rifiuta, e l’esca non scrive', () => {
    expect(decisioneAntispam({ aperteTelefono: 2, aperteSalone: 0, esca: '' })).toEqual({ ok: false, message: 'Troppe richieste' })
    expect(decisioneAntispam({ aperteTelefono: 0, aperteSalone: 20, esca: '' }).ok).toBe(false)
    expect(decisioneAntispam({ aperteTelefono: 0, aperteSalone: 0, esca: 'bot' })).toEqual({ ok: true, scrivi: false })
    expect(decisioneAntispam({ aperteTelefono: 1, aperteSalone: 1, esca: '' })).toEqual({ ok: true, scrivi: true })
  })
})
