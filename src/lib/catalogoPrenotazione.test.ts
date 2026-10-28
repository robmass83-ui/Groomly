import { describe, expect, it } from 'vitest'
import { pubblicabile, scegliCatalogo, type VoceCatalogo } from './catalogoPrenotazione'

const bagno: VoceCatalogo = {
  id: 'bagno', nome: 'Bagno', kind: 'principale',
  minuti: { piccola: 30, media: 45, grande: 60 },
  prezzo: { piccola: 20, media: 28, grande: 38 },
}
const nodi: VoceCatalogo = {
  id: 'nodi', nome: 'Nodi', kind: 'extra',
  minuti: { piccola: 20, media: 20, grande: 20 },
  prezzo: { piccola: 5, media: 5, grande: 5 },
}
const gratis: VoceCatalogo = {
  id: 'gratis', nome: 'Omaggio', kind: 'principale',
  minuti: { piccola: 10, media: 10, grande: 10 },
  prezzo: { piccola: 0, media: 0, grande: 0 },
}

describe('catalogo prenotazione', () => {
  it('un prezzo zero o una durata zero non è pubblicabile', () => {
    expect(pubblicabile(bagno)).toBe(true)
    expect(pubblicabile(gratis)).toBe(false)
    expect(pubblicabile({ ...bagno, minuti: { ...bagno.minuti, media: 0 } })).toBe(false)
  })

  it('accetta un principale e gli extra, e somma la taglia scelta', () => {
    const scelta = scegliCatalogo([bagno, nodi, gratis], ['bagno', 'nodi'], 'media')
    expect(scelta).toEqual({ voci: [bagno, nodi], durataMin: 65, totaleIndicativo: 33 })
  })

  it('rifiuta zero principali, due principali, un id assente e un non pubblicabile', () => {
    expect(scegliCatalogo([bagno, nodi], ['nodi'], 'piccola')).toBeNull()
    expect(scegliCatalogo([bagno, { ...bagno, id: 'taglio' }], ['bagno', 'taglio'], 'piccola')).toBeNull()
    expect(scegliCatalogo([bagno], ['manca'], 'piccola')).toBeNull()
    expect(scegliCatalogo([bagno, gratis], ['gratis'], 'piccola')).toBeNull()
  })
})
