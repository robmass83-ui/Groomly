import { describe, expect, it } from 'vitest'
import { istanteRoma } from './disponibilita'
import { emailPrenotazioneValida, esitoEmailPrenotazione, icsRoma, templatePrenotazione, transizionePrenotazione } from './prenotazione'

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
})
