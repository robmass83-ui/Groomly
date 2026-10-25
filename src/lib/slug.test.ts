import { describe, expect, it } from 'vitest'
import { htmlSalone, profiloPubblico, slugDaNome, slugLibero } from './slug'

describe('slug del salone', () => {
  it('I Pelosetti diventa i-pelosetti e uno slug occupato è rifiutato', () => {
    expect(slugDaNome('I Pelosetti!')).toBe('i-pelosetti')
    expect(slugLibero('altro', 'mio')).toEqual({ ok: false, message: 'Nome già preso' })
    expect(slugLibero(null, 'mio')).toEqual({ ok: true })
    expect(slugLibero('mio', 'mio')).toEqual({ ok: true })
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
