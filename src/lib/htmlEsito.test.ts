import { describe, expect, it } from 'vitest'
import { htmlEsito, quandoConferma } from './htmlEsito'

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

  it('un istante fisso dice at in inglese e a las in spagnolo', () => {
    const inizio = new Date('2026-10-29T09:00:00.000Z')
    expect(quandoConferma('it', inizio)).toBe('giovedì 29 ottobre alle 10:00')
    expect(quandoConferma('en', inizio)).toContain(' at ')
    expect(quandoConferma('en', inizio)).toMatch(/10:00$/)
    expect(quandoConferma('en', inizio)).not.toContain('alle')
    expect(quandoConferma('es', inizio)).toContain(' a las ')
    expect(quandoConferma('es', inizio)).toMatch(/10:00$/)
    expect(quandoConferma('it', new Date(Number.NaN))).toBe('')
  })
})
