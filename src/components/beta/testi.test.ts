import { describe, expect, it } from 'vitest'
import { en } from '../../i18n/en'
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

  it('i messaggi noti del server diventano la frase nella lingua dell’app', () => {
    expect(messaggioErroreBeta(en, new Error('Hai già mandato 5 feedback oggi: riprova domani'))).toBe(en.betaErrLimite)
    expect(messaggioErroreBeta(en, new Error("Hai già un piano attivo: l'invito non serve"))).toBe(en.betaErrPianoAttivo)
    expect(messaggioErroreBeta(en, new Error('Questo invito non è più valido'))).toBe(en.betaNonValido)
  })

  it('un messaggio sconosciuto passa com’è; senza messaggio, quello generico', () => {
    expect(messaggioErroreBeta(italiano, new Error('Altro problema'))).toBe('Altro problema')
    expect(messaggioErroreBeta(italiano, new Error(''))).toBe(italiano.betaErrore)
  })
})
