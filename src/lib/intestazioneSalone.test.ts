import { describe, expect, it } from 'vitest'
import { conIntestazioneSalone } from './intestazioneSalone'
import type { PriceSheet } from '../types/priceSheet'

const base = {
  intestazione: {
    titolo: 'TOELETTATURA',
    sottotitolo: 'LISTINO',
    nome: 'Giungevano puddu',
    descrizione: 'Servizio di toelettatura',
    indirizzo: 'corso vecchio',
    telefono: '111',
    colore: '#B8285E',
  },
} as Pick<PriceSheet, 'intestazione'>

describe('conIntestazioneSalone', () => {
  it('titolo e nome diventano il nome della toelettatura', () => {
    const next = conIntestazioneSalone(base, { salonName: 'Canespa', name: 'Giovannino puddu', address: 'Via renoir 8', phone: '349' })
    expect(next.intestazione.titolo).toBe('Canespa')
    expect(next.intestazione.nome).toBe('Canespa')
    expect(next.intestazione.indirizzo).toBe('Via renoir 8')
    expect(next.intestazione.telefono).toBe('349')
    expect(next.intestazione.descrizione).toBe('Servizio di toelettatura')
    expect(next.intestazione.sottotitolo).toBe('LISTINO')
  })

  it('senza nome toelettatura usa la ragione sociale', () => {
    const next = conIntestazioneSalone(base, { salonName: '  ', name: 'Giovannino puddu', address: '', phone: '' })
    expect(next.intestazione.titolo).toBe('Giovannino puddu')
    expect(next.intestazione.nome).toBe('Giovannino puddu')
    expect(next.intestazione.indirizzo).toBe('')
    expect(next.intestazione.telefono).toBe('')
  })

  it('senza nessun nome lascia titolo e nome del foglio', () => {
    const next = conIntestazioneSalone(base, { salonName: '', name: '', address: '', phone: '' })
    expect(next.intestazione.titolo).toBe('TOELETTATURA')
    expect(next.intestazione.nome).toBe('Giungevano puddu')
  })
})
