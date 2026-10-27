import { describe, expect, it } from 'vitest'
import { linkPrenotazione, prenotazioneAccesa, puoAccenderePrenotazioni, specieAccettate } from './prenotazionePubblica'

describe('puoAccenderePrenotazioni', () => {
  it('chiede prima il piano, poi il profilo, poi il fiscale', () => {
    expect(puoAccenderePrenotazioni({ accesso: false, completo: false, vat: '', tax: '' })).toEqual({ ok: false, manca: 'piano' })
    expect(puoAccenderePrenotazioni({ accesso: true, completo: false, vat: '123', tax: '' })).toEqual({ ok: false, manca: 'profilo' })
    expect(puoAccenderePrenotazioni({ accesso: true, completo: true, vat: '  ', tax: '' })).toEqual({ ok: false, manca: 'fiscale' })
  })

  it('accetta la partita IVA oppure il codice fiscale', () => {
    expect(puoAccenderePrenotazioni({ accesso: true, completo: true, vat: '', tax: 'RSSMRA' })).toEqual({ ok: true })
    expect(puoAccenderePrenotazioni({ accesso: true, completo: true, vat: '01234567890', tax: '' })).toEqual({ ok: true })
  })
})

describe('linkPrenotazione', () => {
  it('compone lo slug pubblico e rifiuta uno slug vuoto o sporco', () => {
    expect(linkPrenotazione('i-pelosetti')).toBe('https://groomlyapp.it/s/i-pelosetti')
    expect(linkPrenotazione('')).toBe('')
    expect(linkPrenotazione('Maiuscole')).toBe('')
    expect(linkPrenotazione('../segreto')).toBe('')
  })
})

describe('specieAccettate', () => {
  it('senza scelta accetta tutti, e una lista vuota o sporca non spegne tutto', () => {
    expect(specieAccettate(undefined)).toEqual(['cane', 'gatto', 'altro'])
    expect(specieAccettate([])).toEqual(['cane', 'gatto', 'altro'])
    expect(specieAccettate(['cane'])).toEqual(['cane'])
    expect(specieAccettate(['altro', 'sconosciuto', 'gatto'])).toEqual(['gatto', 'altro'])
  })
})

describe('prenotazioneAccesa', () => {
  it('è accesa solo con il flag e il piano', () => {
    expect(prenotazioneAccesa({ prenotazioniOnline: false, accesso: true })).toBe(false)
    expect(prenotazioneAccesa({ prenotazioniOnline: true, accesso: false })).toBe(false)
    expect(prenotazioneAccesa({ prenotazioniOnline: true, accesso: true })).toBe(true)
  })
})
