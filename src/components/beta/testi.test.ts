import { describe, expect, it } from 'vitest'
import { en } from '../../i18n/en'
import { fraseErrore } from '../../i18n/errori'
import { it as italiano } from '../../i18n/it'
import { messaggioErroreBeta, riempi, testoOfferta } from './testi'

describe('testi della beta', () => {
  it('riempi sostituisce i segnaposto noti e lascia gli altri', () => {
    expect(riempi('Prova {{piano}} per {{n}} giorni {{x}}', { piano: 'Plus', n: 30 })).toBe('Prova Plus per 30 giorni {{x}}')
  })

  it("l'offerta ripiega sull'italiano", () => {
    expect(testoOfferta({ it: ' −30% ', en: '', es: 'x', fr: '', de: '' }, 'en')).toBe('−30%')
    expect(testoOfferta({ it: '−30%', en: '', es: 'x', fr: '', de: '' }, 'es')).toBe('x')
  })

  it('il codice del server diventa la frase nella lingua dell’app', () => {
    localStorage.setItem('groomly.lingua', 'en')
    const errore = Object.assign(new Error('Hai già un piano attivo: l’invito non serve'), { details: { codice: 'beta_gia_piano' } })
    expect(messaggioErroreBeta(en, errore)).toBe(fraseErrore('en', 'beta_gia_piano'))
    localStorage.removeItem('groomly.lingua')
  })

  it('senza codice il testo del server non si mostra: resta quello generico', () => {
    expect(messaggioErroreBeta(italiano, new Error('Altro problema'))).toBe(italiano.betaErrore)
    expect(messaggioErroreBeta(italiano, new Error(''))).toBe(italiano.betaErrore)
  })
})
