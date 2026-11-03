import { describe, expect, it } from 'vitest'
import { caneDaDoc, listinoDaDoc, prezziVisita, servizioDaDoc } from './prezzoListino'
import type { CanePrezzo, Listino, RigaVisita, ServizioListino } from './prezzoListino'

const servizi: ServizioListino[] = [
  { id: 'bagno', name: 'Bagno', active: true, price: { piccola: 20, media: 25, grande: 30 } },
  { id: 'taglio', name: 'Taglio / tosatura', active: true, price: { piccola: 40, media: 45, grande: 50 } },
  { id: 'spento', name: 'Spento', active: false, price: { piccola: 10, media: 10, grande: 10 } },
]

const listino: Listino = {
  razze: [{
    nome: 'Yorkshire / Yorkie',
    voci: [
      { nome: 'Bagno', prezzo: 25 },
      { nome: 'Tosatura', prezzo: 48 },
      { nome: 'Spento', prezzo: 99, servizioId: 'spento' },
      { nome: 'Taglio', tipo: 'valutazione' },
    ],
  }],
}

const riga = (serviceId: string, price: number, name = serviceId): RigaVisita => ({ serviceId, name, durationMin: 30, price })
const cane = (breed: string, size: CanePrezzo['size'], servicePrices: CanePrezzo['servicePrices'] = []): CanePrezzo => ({ breed, size, servicePrices })
const prezzi = (righe: RigaVisita[]) => righe.map((r) => r.price)

describe('prezziVisita', () => {
  const righe = [riga('bagno', 20), riga('taglio', 40)]

  it('applica il listino della razza', () => {
    expect(prezzi(prezziVisita(righe, cane('  yorkie ', 'piccola'), servizi, listino))).toEqual([25, 48])
  })

  it('il prezzo personale del cane vince', () => {
    const r = prezziVisita(righe, cane('yorkie', 'piccola', [{ serviceId: 'bagno', price: 18 }]), servizi, listino)
    expect(prezzi(r)).toEqual([18, 48])
  })

  it('un prezzo personale senza price non conta', () => {
    const r = prezziVisita(righe, cane('yorkie', 'piccola', [{ serviceId: 'bagno' }]), servizi, listino)
    expect(prezzi(r)).toEqual([25, 48])
  })

  it('razza assente dal listino: prezzi per taglia', () => {
    expect(prezzi(prezziVisita(righe, cane('Barboncino', 'media'), servizi, listino))).toEqual([25, 45])
  })

  it('servizio spento: prezzo per taglia', () => {
    expect(prezzi(prezziVisita([riga('spento', 5)], cane('yorkie', 'piccola'), servizi, listino))).toEqual([10])
  })

  it('prenotazione e servizi non trovati restano invariati', () => {
    const r = [riga('prenotazione', 0), riga('sparito', 33)]
    expect(prezziVisita(r, cane('yorkie', 'piccola'), servizi, listino)).toEqual(r)
  })

  it('senza listino usa la taglia e non tocca altri campi', () => {
    const r = [riga('bagno', 1, 'Bagno vecchio')]
    expect(prezziVisita(r, cane('yorkie', 'grande'), servizi, undefined)).toEqual([{ ...r[0], price: 30 }])
    const dopo = prezziVisita(r, cane('yorkie', 'piccola'), servizi, listino)
    expect(dopo[0]).toMatchObject({ serviceId: 'bagno', name: 'Bagno vecchio', durationMin: 30 })
  })
})

describe('parser', () => {
  it('listinoDaDoc', () => {
    expect(listinoDaDoc(undefined)).toBeUndefined()
    expect(listinoDaDoc({ razze: 'x' })).toBeUndefined()
    const l = listinoDaDoc({ razze: [{ nome: 'A', voci: ['x', null, { nome: 'Bagno', prezzo: 'zz' }, { nome: 'Taglio', prezzo: 7, tipo: 'da', servizioId: 'taglio' }] }, 3] })
    expect(l).toEqual({ razze: [{ nome: 'A', voci: [
      { nome: 'Bagno', tipo: undefined, prezzo: undefined, servizioId: undefined },
      { nome: 'Taglio', tipo: 'da', prezzo: 7, servizioId: 'taglio' },
    ] }] })
  })

  it('servizioDaDoc', () => {
    expect(servizioDaDoc('a', {})).toEqual({ id: 'a', name: '', active: false, price: { piccola: 0, media: 0, grande: 0 } })
    expect(servizioDaDoc('b', { name: 'X', active: true, price: { piccola: 1, media: 2, grande: -3 } }))
      .toEqual({ id: 'b', name: 'X', active: true, price: { piccola: 1, media: 2, grande: 0 } })
  })

  it('caneDaDoc', () => {
    const ricaduta = { breed: 'Yorkshire', size: 'grande' as const }
    expect(caneDaDoc(undefined, ricaduta)).toEqual({ ...ricaduta, servicePrices: [] })
    expect(caneDaDoc({ breed: 'Maltese', size: 'piccola', servicePrices: [{ serviceId: 'bagno', price: 12 }, 'x'] }, ricaduta))
      .toEqual({ breed: 'Maltese', size: 'piccola', servicePrices: [{ serviceId: 'bagno', price: 12 }] })
    expect(caneDaDoc({ breed: 'M', size: 'enorme' }, ricaduta).size).toBe('grande')
  })
})
