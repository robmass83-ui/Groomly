import { describe, expect, it } from 'vitest'
import { htmlSalone, profiloPubblico, slugAttuale, slugConNumero, slugDaNome, slugLibero } from './slug'

describe('slug del salone', () => {
  it('I Pelosetti diventa i-pelosetti e uno slug occupato è rifiutato', () => {
    expect(slugDaNome('I Pelosetti!')).toBe('i-pelosetti')
    expect(slugLibero('altro', 'mio')).toEqual({ ok: false, message: 'Nome già preso' })
    expect(slugLibero(null, 'mio')).toEqual({ ok: true })
    expect(slugLibero('mio', 'mio')).toEqual({ ok: true })
  })

  it('un nome già preso riceve un numero, e il link resta sotto gli 80 caratteri', () => {
    expect(slugConNumero('canespa', 1)).toBe('canespa')
    expect(slugConNumero('canespa', 2)).toBe('canespa-2')
    expect(slugConNumero('a'.repeat(80), 12)).toBe(`${'a'.repeat(77)}-12`)
  })

  it('lo slug salvato vale solo se nasce dal nome attuale', () => {
    expect(slugAttuale('canespa-2', 'CaneSpa')).toBe('canespa-2')
    expect(slugAttuale('canespa', 'CaneSpa')).toBe('canespa')
    expect(slugAttuale(undefined, 'CaneSpa')).toBe('canespa')
    expect(slugAttuale('canespa-2', 'I Pelosetti')).toBe('i-pelosetti')
    expect(slugAttuale('canespa-due', 'CaneSpa')).toBe('canespa')
  })

  it('il profilo pubblico omette iva e codice fiscale se il salone non li mostra', () => {
    const privato = profiloPubblico({ nome: 'Bauci', telefono: '333', vat: '12345678901', tax: 'RSSMRA85T10A562S' })
    expect(privato).not.toHaveProperty('vat')
    expect(privato).not.toHaveProperty('tax')
    expect(JSON.stringify(privato)).not.toContain('12345678901')
    const aperto = profiloPubblico({ nome: 'Bauci', vat: '12345678901', tax: 'RSSMRA85T10A562S', mostraDatiFiscali: true })
    expect(aperto.vat).toBe('12345678901')
    expect(htmlSalone({ nome: 'Bauci' })).toContain('property="og:title" content="Bauci"')
  })
})
