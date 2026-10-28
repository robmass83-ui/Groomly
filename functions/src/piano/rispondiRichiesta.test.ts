import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { paginaRisposta } from './rispondiRichiesta'

describe('rispondiRichiesta', () => {
  it('la GET torna prima di applicare il piano', () => {
    const src = readFileSync('functions/src/piano/rispondiRichiesta.ts', 'utf8')
    const get = src.indexOf("if (req.method === 'GET')")
    const applica = src.indexOf('applicaPiano(')
    expect(get).toBeGreaterThan(-1)
    expect(applica).toBeGreaterThan(get)
    expect(src.slice(get, applica)).toContain('return')
    expect(src).toContain('htmlDomandaRisposta')
    expect(src).toContain("req.method !== 'GET' && req.method !== 'POST'")
    expect(src).not.toContain('console.')
    expect(src).toContain('paginaRisposta(')
  })

  it('la conferma in italiano mette salone, cane e ora', () => {
    const html = paginaRisposta('it', 'confermato', {
      salone: 'Canespa', cane: 'Rex', quando: 'martedì 4 novembre alle 10:30',
    })
    expect(html).toContain('<title>Appuntamento confermato</title>')
    expect(html).toContain('L’appuntamento di Rex da Canespa è confermato per martedì 4 novembre alle 10:30.')
    expect(html).toContain('Grazie! L’appuntamento di Rex da Canespa è confermato per martedì 4 novembre alle 10:30. Ti aspettiamo.')
  })

  it('il link non valido in inglese non è solo italiano', () => {
    const html = paginaRisposta('en', 'nonValido', {})
    expect(html).toContain('This link is no longer valid.')
    expect(html).toContain('It may have expired or already been used. For anything else, please contact the salon directly.')
  })

  it('il posto liberato in spagnolo dice che il hueco è libero', () => {
    const html = paginaRisposta('es', 'liberato', {})
    expect(html).toContain('<title>Hueco liberado</title>')
    expect(html).toContain('De acuerdo, el hueco ha quedado libre')
    expect(html).toContain('Si quieres otro horario, puedes enviar una nueva solicitud a la peluquería cuando quieras.')
  })

  it('la conferma in inglese ha il titolo Appointment confirmed', () => {
    const html = paginaRisposta('en', 'confermato', {
      salone: 'Canespa', cane: 'Rex', quando: 'Tuesday 4 November at 10:30',
    })
    expect(html).toContain('<title>Appointment confirmed</title>')
    expect(html).toContain("Thank you! Rex's appointment at Canespa is confirmed for Tuesday 4 November at 10:30. We look forward to seeing you.")
  })

  it('la conferma in spagnolo mette il salone con en', () => {
    const html = paginaRisposta('es', 'confermato', {
      salone: 'Canespa', cane: 'Rex', quando: 'martes 4 de noviembre a las 10:30',
    })
    expect(html).toContain('<title>Cita confirmada</title>')
    expect(html).toContain('¡Gracias! La cita de Rex en Canespa está confirmada para martes 4 de noviembre a las 10:30. Te esperamos.')
  })

  it('senza nome del salone usa dal salone, at the salon e en la peluquería', () => {
    const quando = { it: 'martedì 4 novembre alle 10:30', en: 'Tuesday 4 November at 10:30', es: 'martes 4 de noviembre a las 10:30' }
    expect(paginaRisposta('it', 'confermato', { cane: 'Rex', quando: quando.it }))
      .toContain('L’appuntamento di Rex dal salone è confermato per martedì 4 novembre alle 10:30.')
    expect(paginaRisposta('en', 'confermato', { cane: 'Rex', quando: quando.en }))
      .toContain("Rex's appointment at the salon is confirmed for Tuesday 4 November at 10:30.")
    expect(paginaRisposta('es', 'confermato', { salone: '  ', cane: 'Rex', quando: quando.es }))
      .toContain('La cita de Rex en la peluquería está confirmada para martes 4 de noviembre a las 10:30.')
  })

  it('senza cane o senza ora non lascia preposizioni, doppi spazi o virgole', () => {
    const senzaCane = paginaRisposta('it', 'confermato', { salone: 'Canespa', quando: 'martedì 4 novembre alle 10:30' })
    expect(senzaCane).toContain('L’appuntamento da Canespa è confermato per martedì 4 novembre alle 10:30.')
    expect(senzaCane).not.toContain(' di ')
    const senzaOra = paginaRisposta('en', 'confermato', { salone: 'Canespa', cane: 'Rex' })
    expect(senzaOra).toContain("Thank you! Rex's appointment at Canespa is confirmed. We look forward to seeing you.")
    expect(senzaOra).not.toContain(' for ')
    const senzaEntrambi = paginaRisposta('es', 'confermato', { salone: 'Canespa' })
    expect(senzaEntrambi).toContain('¡Gracias! La cita en Canespa está confirmada. Te esperamos.')
    expect(senzaEntrambi).not.toContain(' de ')
    expect(senzaEntrambi).not.toContain(' para ')
  })

  it('sfugge i nomi di salone e cane', () => {
    const html = paginaRisposta('it', 'confermato', {
      salone: 'A & B <script>', cane: 'R<x>', quando: 'ora',
    })
    expect(html).toContain('L’appuntamento di R&lt;x&gt; da A &amp; B &lt;script&gt; è confermato per ora.')
    expect(html).not.toContain('<script>')
  })
})
