import { describe, expect, it } from 'vitest'
import { NOTA_PREMIO, ricalcolaFedelta, usaPremio } from './fedelta'

function visita(id: string, premio = false) {
  return { id, status: 'completato', premio }
}

describe('fedeltà', () => {
  it('dieci completati danno un premio e annullarne uno toglie il timbro', () => {
    const dieci = Array.from({ length: 10 }, (_, index) => visita(`v${index}`))
    expect(ricalcolaFedelta(dieci).premiDisponibili).toBe(1)
    expect(ricalcolaFedelta(dieci).timbri).toHaveLength(10)
    const nove = dieci.slice(0, 9)
    expect(ricalcolaFedelta(nove)).toEqual({ timbri: nove.map((item) => item.id), premiDisponibili: 0 })
  })

  it('usare il premio azzera il servizio e lascia la nota', () => {
    const usato = usaPremio([{ name: 'Bagno', price: 25 }, { name: 'Nodo', price: 5 }])
    expect(usato.righe[0].price).toBe(0)
    expect(usato.righe[1].price).toBe(5)
    expect(usato.nota).toBe(NOTA_PREMIO)
    expect(NOTA_PREMIO).toBe('Premio fedeltà')
  })

  it('ricalcola dagli appuntamenti torna gli stessi timbri', () => {
    const visite = [...Array.from({ length: 10 }, (_, index) => visita(`v${index}`)), visita('premio', true)]
    const prima = ricalcolaFedelta(visite)
    const seconda = ricalcolaFedelta(visite.map((item) => ({ ...item })))
    expect(seconda).toEqual(prima)
    expect(seconda.timbri).not.toContain('premio')
    expect(seconda.premiDisponibili).toBe(0)
  })
})
