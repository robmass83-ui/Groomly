import { describe, expect, it } from 'vitest'
import { istanteRoma, oraRoma } from './disponibilita'
import { emailPrenotazioneValida, esitoEmailPrenotazione, icsRoma, ingressoRichiestaPubblica, contaAperte, intervalloRichiesta, templatePrenotazione, transizionePrenotazione } from './prenotazione'

describe('prenotazione online', () => {
  it('da nuova si passa agli stati previsti e un token errato non cambia nulla', () => {
    for (const prossimo of ['accettata', 'proposta', 'rifiutata', 'scaduta', 'disdetta'] as const) {
      expect(transizionePrenotazione({ attuale: 'nuova', prossimo, token: 'ok', tokenAtteso: 'ok' })).toEqual({ ok: true, stato: prossimo })
    }
    expect(transizionePrenotazione({ attuale: 'nuova', prossimo: 'accettata', token: 'no', tokenAtteso: 'ok' })).toEqual({ ok: false, stato: 'nuova' })
    expect(emailPrenotazioneValida('')).toBe(false)
    expect(emailPrenotazioneValida('ada@cliente.it')).toBe(true)
  })

  it('senza Brevo l’email resta non inviata e il calendario è in Europe/Rome', () => {
    expect(esitoEmailPrenotazione(undefined)).toBe('non_inviata')
    expect(templatePrenotazione('accettata')).toBe(7)
    const ics = icsRoma({
      inizio: istanteRoma('2026-10-26', '10:00'),
      fine: istanteRoma('2026-10-26', '11:00'),
      titolo: 'Bagno',
    })
    expect(ics).toContain('DTSTART;TZID=Europe/Rome:20261026T100000')
    expect(ics).toContain('DTEND;TZID=Europe/Rome:20261026T110000')
  })

  it('giorno e ora di Roma durano un’ora, e una fine assente non resta a zero', () => {
    const quando = intervalloRichiesta({ giorno: '2026-10-27', ora: '16:00', inizio: '', fine: '' })
    expect(quando?.ora).toBe('16:00')
    expect(quando && oraRoma(quando.inizio)).toBe('16:00')
    expect(quando && quando.fine.getTime() - quando.inizio.getTime()).toBe(60 * 60 * 1000)
    const zero = intervalloRichiesta({ inizio: '2026-10-27T15:00:00.000Z', fine: '2026-10-27T15:00:00.000Z' })
    expect(zero && zero.fine.getTime() - zero.inizio.getTime()).toBe(60 * 60 * 1000)
    expect(intervalloRichiesta({ inizio: 'non-una-data' })).toBeNull()
  })
})

describe('ingresso richiesta pubblica', () => {
  const adesso = new Date('2026-10-28T10:00:00+01:00')
  const base = {
    nome: 'Ada Bianchi',
    phone: '333 1234567',
    email: 'ada@cliente.it',
    giorno: '2026-10-28',
    ora: '16:00',
    esca: '',
    consenso: true,
    aperteTelefono: 0,
    aperteEmail: 0,
    aperteSalone: 0,
    adesso,
  }

  it("senza consenso non scrive, l'esca resta muta", () => {
    expect(ingressoRichiestaPubblica({ ...base, consenso: false })).toEqual({ ok: false, message: 'Serve il consenso' })
    expect(ingressoRichiestaPubblica({ ...base, consenso: false, esca: 'bot' })).toEqual({ ok: true, scrivi: false })
  })

  it('accetta nome, telefono, email, giorno e ora dentro i 42 giorni', () => {
    expect(ingressoRichiestaPubblica(base)).toEqual({
      ok: true,
      scrivi: true,
      nome: 'Ada Bianchi',
      phone: '333 1234567',
      email: 'ada@cliente.it',
      giorno: '2026-10-28',
      ora: '16:00',
    })
    expect(ingressoRichiestaPubblica({ ...base, giorno: '2026-12-08' }).ok).toBe(true)
  })

  it('senza giorno e ora non scrive, anche se inizio e fine sarebbero validi', () => {
    expect(ingressoRichiestaPubblica({ ...base, giorno: '', ora: '' })).toEqual({ ok: false, message: 'Richiesta non valida' })
    expect(ingressoRichiestaPubblica({ ...base, giorno: '2026-10-27', ora: '16:00' })).toEqual({ ok: false, message: 'Richiesta non valida' })
    expect(ingressoRichiestaPubblica({ ...base, giorno: '2026-12-09', ora: '16:00' })).toEqual({ ok: false, message: 'Richiesta non valida' })
  })

  it('taglia nome, telefono ed email fuori misura', () => {
    expect(ingressoRichiestaPubblica({ ...base, nome: 'A' })).toEqual({ ok: false, message: 'Richiesta non valida' })
    expect(ingressoRichiestaPubblica({ ...base, nome: 'A'.repeat(81) })).toEqual({ ok: false, message: 'Richiesta non valida' })
    expect(ingressoRichiestaPubblica({ ...base, phone: '123' })).toEqual({ ok: false, message: 'Richiesta non valida' })
    expect(ingressoRichiestaPubblica({ ...base, phone: '1'.repeat(21) })).toEqual({ ok: false, message: 'Richiesta non valida' })
    expect(emailPrenotazioneValida(`${'a'.repeat(320)}@b.co`)).toBe(false)
    expect(ingressoRichiestaPubblica({ ...base, email: 'non-una-email' })).toEqual({ ok: false, message: 'Email obbligatoria' })
  })

  it('l’esca non scrive; due telefoni, due email o venti del salone si fermano', () => {
    expect(ingressoRichiestaPubblica({ ...base, esca: 'bot' })).toEqual({ ok: true, scrivi: false })
    expect(ingressoRichiestaPubblica({ ...base, aperteTelefono: 2 })).toEqual({ ok: false, message: 'Troppe richieste' })
    expect(ingressoRichiestaPubblica({ ...base, aperteEmail: 2 })).toEqual({ ok: false, message: 'Troppe richieste' })
    expect(ingressoRichiestaPubblica({ ...base, aperteSalone: 20 })).toEqual({ ok: false, message: 'Troppe richieste' })
  })

  it('conta le cifre del telefono e l’email minuscola, e il totale è il numero di righe', () => {
    const righe = [
      { phone: '333-1234567', email: 'Ada@Cliente.it' },
      { phone: '3331234567', email: 'altro@cliente.it' },
      { phone: '3400000000', email: 'ada@cliente.it' },
    ]
    expect(contaAperte(righe, '333 1234567', 'ada@cliente.it')).toEqual({
      aperteTelefono: 2,
      aperteEmail: 2,
      aperteSalone: 3,
    })
  })
})
