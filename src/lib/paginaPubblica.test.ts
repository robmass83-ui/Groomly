import { describe, expect, it } from 'vitest'
import { htmlPaginaPubblica, testoOrari } from './paginaPubblica'

const base = { lang: 'it' as const, nome: 'I Pelosetti', indirizzo: 'Via Roma 1', telefono: '3331234567', prenotabile: true, salonId: 'abc' }
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

describe('htmlPaginaPubblica', () => {
  it('mette il nome nel title e in og:title, senza partita IVA', () => {
    const html = htmlPaginaPubblica({ ...base, vat: '01234567890' })
    expect(html).toContain('<title>I Pelosetti</title>')
    expect(html).toContain('property="og:title" content="I Pelosetti"')
    expect(html).not.toContain('01234567890')
    expect(html).toContain('"prenotabile":true')
    expect(html).toContain('"specie":["cane","gatto","altro"]')
    expect(htmlPaginaPubblica({ ...base, specie: ['cane'] })).toContain('"specie":["cane"]')
    expect(html).toContain('/s/pagina.js')
    expect(html).toContain('/groomly-logo-orizzontale.svg')
    expect(html).toContain('href="?lang=it"')
    expect(html).toContain('href="tel:3331234567"')
    expect(html).toContain('class="marchio monogramma"')
  })

  it('mostra il logo del salone solo se è un’immagine, e riassume gli orari', () => {
    const html = htmlPaginaPubblica({ ...base, logo: png, logoForma: 'tondo', descrizione: 'Dal 1998', orari: 'Lun–Ven 09:00–13:00' })
    expect(html).toContain(`src="${png}"`)
    expect(html).toContain('marchio-tondo')
    expect(html).toContain('Dal 1998')
    expect(html).toContain('Lun–Ven 09:00–13:00')
    const sporco = htmlPaginaPubblica({ ...base, logo: 'javascript:alert(1)' })
    expect(sporco).not.toContain('javascript:')
    expect(testoOrari({
      1: [{ da: '09:00', a: '13:00' }],
      2: [{ da: '09:00', a: '13:00' }],
      3: [{ da: '09:00', a: '13:00' }],
      4: [{ da: '09:00', a: '13:00' }],
      5: [{ da: '09:00', a: '13:00' }],
      6: [{ da: '09:00', a: '12:00' }],
    }, 'it')).toBe('Lun–Ven 09:00–13:00 · Sab 09:00–12:00')
    expect(testoOrari(undefined, 'it')).toBe('')
  })

  it('con prenotabile false il JSON non invita a prenotare', () => {
    const html = htmlPaginaPubblica({ ...base, prenotabile: false })
    expect(html).toContain('"prenotabile":false')
  })

  it('sfugge il nome', () => {
    const html = htmlPaginaPubblica({ ...base, nome: 'A & B <script>' })
    expect(html).toContain('<title>A &amp; B &lt;script&gt;</title>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('A &amp; B')
  })
})
