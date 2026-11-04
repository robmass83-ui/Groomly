import { describe, expect, it } from 'vitest'
import { avvisiBeta } from './avvisiBeta'
import { STATO_BETA_VUOTO, type StatoBeta } from './faseBeta'

const GIORNO = 24 * 60 * 60 * 1000
const adesso = new Date('2026-11-04T10:00:00.000Z')
const tra = (giorni: number) => new Date(adesso.getTime() + giorni * GIORNO)

function beta(campi: Partial<StatoBeta>): StatoBeta {
  return { ...STATO_BETA_VUOTO, ...campi }
}

const inCorso = (rimasti: number, giorno: number) => beta({
  fase: 'in-corso', piano: 'pro', inizio: tra(-giorno), fine: tra(rimasti), giorniRimasti: rimasti, giorniTotali: rimasti + giorno, feedbackVisibile: true, domandaFine: rimasti <= 1,
})

describe('avvisiBeta', () => {
  it('senza beta non ci sono avvisi', () => {
    expect(avvisiBeta(STATO_BETA_VUOTO, adesso, {})).toEqual([])
  })

  it("l'invito aperto porta alla pagina invito", () => {
    const invitatoIl = tra(-1).toISOString()
    const lista = avvisiBeta(beta({
      fase: 'invitato', invitoValido: true, piano: 'pro',
      invito: { salonId: 's', piano: 'pro', giorni: 30, messaggio: null, stato: 'invitato', invitatoIl, scadeInvitoIl: tra(13).toISOString(), rispostoIl: null, motivoRifiuto: null, altroRifiuto: null, revocatoIl: null, invitatoDa: '', aggiornatoIl: invitatoIl },
    }), adesso, {})
    expect(lista).toEqual([{ id: `invito:${invitatoIl}`, tipo: 'invito', data: new Date(invitatoIl), link: '/impostazioni/beta' }])
  })

  it('al giorno 8 il promemoria feedback', () => {
    const lista = avvisiBeta(inCorso(20, 8), adesso, {})
    expect(lista.map((a) => a.tipo)).toEqual(['promemoria'])
    expect(lista[0].link).toBe('/impostazioni/beta/feedback')
    expect(lista[0].id).toBe(`promemoria:${tra(-1).toISOString()}`)
  })

  it('al giorno 6 niente promemoria', () => {
    expect(avvisiBeta(inCorso(20, 6), adesso, {})).toEqual([])
  })

  it('niente promemoria se da questo telefono è già partito un feedback durante la beta', () => {
    expect(avvisiBeta(inCorso(20, 8), adesso, { feedbackInviatoIl: tra(-2).getTime() })).toEqual([])
  })

  it('a 6 giorni dalla fine: fine vicina, verso la pagina Abbonamento', () => {
    const lista = avvisiBeta(inCorso(6, 3), adesso, {})
    expect(lista).toEqual([{ id: `fine-vicina:${tra(6).toISOString()}`, tipo: 'fine-vicina', data: tra(6), link: '/impostazioni/abbonamento' }])
  })

  it("all'ultimo giorno: fine domani, verso la domanda di fine", () => {
    const lista = avvisiBeta(inCorso(1, 29), adesso, { feedbackInviatoIl: tra(-3).getTime() })
    expect(lista.map((a) => [a.tipo, a.link])).toEqual([['fine-domani', '/impostazioni/beta/fine']])
  })

  it('beta finita: avviso verso la domanda di fine', () => {
    const lista = avvisiBeta(beta({ fase: 'finita', piano: 'pro', fine: tra(-2), feedbackVisibile: true, domandaFine: true }), adesso, {})
    expect(lista.map((a) => [a.tipo, a.link])).toEqual([['finita', '/impostazioni/beta/fine']])
  })

  it('beta revocata: nessun avviso di fine', () => {
    expect(avvisiBeta(beta({ fase: 'finita', piano: 'pro', fine: tra(-2), feedbackVisibile: true, revocata: true }), adesso, {})).toEqual([])
  })
})
