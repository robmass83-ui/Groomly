import { describe, expect, it } from 'vitest'
import { htmlEsito } from './htmlEsito'

describe('pagina esito', () => {
  it('la conferma ha il logo, la fascia e il riepilogo, il posto liberato no la spunta', () => {
    const html = htmlEsito({ lingua: 'it', tipo: 'conferma', salone: 'Canespa', cane: 'Rex', quando: 'giovedì 29 ottobre, 10:00–11:00' })
    expect(html).toContain('groomly-logo-orizzontale.svg')
    expect(html).toContain('#8ADBD9')
    expect(html).toContain('Appuntamento confermato')
    expect(html).toContain('Canespa')
    expect(html).toContain('Rex')
    expect(html).toContain('giovedì 29 ottobre, 10:00–11:00')
    expect(html).toContain('Il salone ha l’appuntamento. Puoi chiudere questa pagina.')
    const libero = htmlEsito({ lingua: 'it', tipo: 'liberato', salone: '', cane: '', quando: '' })
    expect(libero).toContain('groomly-logo-orizzontale.svg')
    expect(libero).not.toContain('Appuntamento confermato')
  })
})
