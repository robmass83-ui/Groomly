import { describe, expect, it } from 'vitest'
import { posizioneFumetto } from './posizioneFumetto'

describe('posizioneFumetto', () => {
  it('sulla prima barra resta a sinistra con il margine', () => {
    expect(posizioneFumetto({ centroBarra: 10, larghezzaFumetto: 120, larghezzaGrafico: 300 })).toBe(4)
  })
  it('sull’ultima barra resta a destra con il margine', () => {
    expect(posizioneFumetto({ centroBarra: 290, larghezzaFumetto: 120, larghezzaGrafico: 300 })).toBe(176)
  })
  it('al centro si centra sulla barra', () => {
    expect(posizioneFumetto({ centroBarra: 150, larghezzaFumetto: 120, larghezzaGrafico: 300 })).toBe(90)
  })
  it('se è più largo del grafico va al margine', () => {
    expect(posizioneFumetto({ centroBarra: 150, larghezzaFumetto: 400, larghezzaGrafico: 300 })).toBe(4)
  })
  it('accetta un margine diverso', () => {
    expect(posizioneFumetto({ centroBarra: 0, larghezzaFumetto: 100, larghezzaGrafico: 300, margine: 10 })).toBe(10)
  })
})
