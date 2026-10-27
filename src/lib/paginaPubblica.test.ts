import { describe, expect, it } from 'vitest'
import { htmlPaginaPubblica } from './paginaPubblica'

const base = { lang: 'it' as const, nome: 'I Pelosetti', indirizzo: 'Via Roma 1', telefono: '3331234567', prenotabile: true, salonId: 'abc' }

describe('htmlPaginaPubblica', () => {
  it('mette il nome nel title e in og:title, senza partita IVA', () => {
    const html = htmlPaginaPubblica({ ...base, vat: '01234567890' })
    expect(html).toContain('<title>I Pelosetti</title>')
    expect(html).toContain('property="og:title" content="I Pelosetti"')
    expect(html).not.toContain('01234567890')
    expect(html).toContain('"prenotabile":true')
    expect(html).toContain('/s/pagina.js')
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
