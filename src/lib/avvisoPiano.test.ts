import { describe, expect, it } from 'vitest'
import { htmlAvviso, oggettoAvviso } from './avvisoPiano'

describe('avviso piano', () => {
  it('l’oggetto segue la lingua', () => {
    expect(oggettoAvviso('it')).toBe('Il piano Groomly è stato aggiornato')
    expect(oggettoAvviso('en')).toBe('Your Groomly plan was updated')
    expect(oggettoAvviso('es')).toBe('Tu plan de Groomly se ha actualizado')
  })

  it('l’html non interpreta il testo', () => {
    const html = htmlAvviso('tariffa <10€ & altro\nresto')
    expect(html.replaceAll('<br>', '')).not.toContain('<')
    expect(html).toContain('&lt;')
    expect(html).toContain('<br>')
  })
})
