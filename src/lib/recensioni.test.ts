import { describe, expect, it } from 'vitest'
import { puoChiedereRecensione, TESTO_RECENSIONE } from './recensioni'

const ora = new Date('2026-10-25T12:00:00.000Z')
const link = 'https://g.page/salone'

describe('recensioni', () => {
  it('non riproponne entro 12 mesi, né lo stesso giorno di un problema, né la sesta, né senza link', () => {
    expect(puoChiedereRecensione({ link, proposte: [], dogId: 'rex', adesso: ora, noteProblemaOggi: false, richiesteOggi: 0 })).toBe(true)
    expect(puoChiedereRecensione({
      link,
      proposte: [{ dogId: 'rex', at: '2026-06-01T00:00:00.000Z' }],
      dogId: 'rex',
      adesso: ora,
      noteProblemaOggi: false,
      richiesteOggi: 0,
    })).toBe(false)
    expect(puoChiedereRecensione({
      link,
      proposte: [{ dogId: 'rex', at: '2025-01-01T00:00:00.000Z' }],
      dogId: 'rex',
      adesso: ora,
      noteProblemaOggi: false,
      richiesteOggi: 0,
    })).toBe(true)
    expect(puoChiedereRecensione({ link, proposte: [], dogId: 'rex', adesso: ora, noteProblemaOggi: true, richiesteOggi: 0 })).toBe(false)
    expect(puoChiedereRecensione({ link, proposte: [], dogId: 'rex', adesso: ora, noteProblemaOggi: false, richiesteOggi: 5 })).toBe(false)
    expect(puoChiedereRecensione({ link: '  ', proposte: [], dogId: 'rex', adesso: ora, noteProblemaOggi: false, richiesteOggi: 0 })).toBe(false)
    expect(TESTO_RECENSIONE.toLowerCase()).not.toContain('sconto')
  })
})
