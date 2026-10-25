import { describe, expect, it } from 'vitest'
import { etichetteListino, nomeVoceListino } from './listino'

describe('listino in lingua dei clienti', () => {
  it('in inglese non usa le etichette italiane e traduce il servizio predefinito', () => {
    const en = etichetteListino('en')
    expect(en.tagliaPiccola).not.toBe(etichetteListino('it').tagliaPiccola)
    expect(en.prezzi).toBe('Price list')
    expect(nomeVoceListino('en', 'Bagno + taglio')).toBe('Bath and trim')
    expect(nomeVoceListino('en', 'Bagno deluxe')).toBe('Bagno deluxe')
    expect(etichetteListino('es').tagliaPiccola).toBe('Talla pequeña')
  })
})
