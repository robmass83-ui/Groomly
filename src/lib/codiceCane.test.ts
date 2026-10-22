import { describe, expect, it } from 'vitest'
import { assegnaCodici, formatCodice } from './codiceCane'

describe('assegnaCodici', () => {
  it('formatta almeno quattro cifre e non tronca oltre 9999', () => {
    expect(formatCodice(1)).toBe('C0001')
    expect(formatCodice(10000)).toBe('C10000')
  })

  it('assegna in ordine di creazione e non rinumera', () => {
    const first = assegnaCodici(null, [
      { id: 'b', createdAt: 2, species: 'cane' },
      { id: 'a', createdAt: 1, species: 'cane' },
    ])
    expect(first.doc.byId).toEqual({ a: 'C0001', b: 'C0002' })
    expect(first.doc.next).toBe(3)
    expect(first.doc.cartella).toBe('cani')
    expect(first.changed).toBe(true)
    const second = assegnaCodici(first.doc, [
      { id: 'a', createdAt: 1, species: 'cane' },
      { id: 'b', createdAt: 2, species: 'cane' },
      { id: 'c', createdAt: 3, species: 'gatto' },
    ])
    expect(second.doc.byId.a).toBe('C0001')
    expect(second.doc.byId.c).toBe('C0003')
    expect(second.doc.cartella).toBe('cani')
    expect(assegnaCodici(second.doc, [
      { id: 'a', createdAt: 1 },
      { id: 'b', createdAt: 2 },
      { id: 'c', createdAt: 3 },
    ]).changed).toBe(false)
  })

  it('non riusa un codice di un cane sparito e ripara next', () => {
    const kept = assegnaCodici({ next: 1, cartella: 'cani', byId: { vecchio: 'C0005' } }, [
      { id: 'nuovo', createdAt: 1, species: 'cane' },
    ])
    expect(kept.doc.byId.vecchio).toBe('C0005')
    expect(kept.doc.byId.nuovo).toBe('C0006')
    expect(kept.doc.next).toBe(7)
  })

  it('trecento cani ricevono codici univoci', () => {
    const cani = Array.from({ length: 300 }, (_, index) => ({ id: `d${index}`, createdAt: index, species: 'cane' as const }))
    const assigned = assegnaCodici(null, cani)
    const codes = Object.values(assigned.doc.byId)
    expect(new Set(codes).size).toBe(300)
    expect(assigned.doc.byId.d0).toBe('C0001')
    expect(assigned.doc.byId.d299).toBe('C0300')
  })
})
