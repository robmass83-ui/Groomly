import { describe, expect, it } from 'vitest'
import { SERVICE_SEED } from '../data/seed/services'
import { seedPriceSheet } from '../data/seed/priceSheet'
import type { Dog, Service } from '../types/models'
import type { PriceItem } from '../types/priceSheet'
import { normalizzaNome, prezzoDalListino, razzaDelCane, servizioDellaRiga, servizioPerNome } from './listinoRazza'

const now = new Date('2026-11-03T00:00:00.000Z')
const servizi: Service[] = SERVICE_SEED.map((seed) => ({ ...seed, createdAt: now, updatedAt: now }))
const foglio = seedPriceSheet({ name: 'Salone', phone: '333', address: 'Via Roma' })

function senza(id: string): Service[] {
  return servizi.filter((item) => item.id !== id)
}

function disattiva(id: string): Service[] {
  return servizi.map((item) => (item.id === id ? { ...item, active: false } : item))
}

function riga(extra: Partial<PriceItem> = {}): PriceItem {
  return { id: 'r', nome: 'Pelo corto', iconKey: 'bagno', tipo: 'da', prezzo: 10, ...extra }
}

function cane(breed: string): Dog {
  return {
    id: 'c', name: 'Bobi', species: 'cane', breed, ageCategory: 'adulto', size: 'piccola', temperament: 'bravo',
    clientType: 'occasionale', contact: { name: '', phone: '333' }, contacts: [], servicePrices: [],
    hiddenServiceIds: [], customFields: [], gallery: [], status: 'attivo', searchKey: 'bobi', createdAt: now, updatedAt: now,
  }
}

describe('normalizzaNome', () => {
  it('toglie accenti, maiuscole e spazi doppi', () => {
    expect(normalizzaNome('  Shìh   Tzu ')).toBe('shih tzu')
  })
})

describe('servizioPerNome', () => {
  it('abbina per nome e per tabella', () => {
    expect(servizioPerNome('Bagno + tosatura', servizi)).toBe('bagno-taglio')
    expect(servizioPerNome('bagno + taglio', servizi)).toBe('bagno-taglio')
    expect(servizioPerNome('Bagno', servizi)).toBe('bagno')
    expect(servizioPerNome('Tosatura', servizi)).toBe('taglio')
    expect(servizioPerNome('Taglio', servizi)).toBe('taglio')
    expect(servizioPerNome('Stripping', servizi)).toBe('stripping')
    expect(servizioPerNome('Gestione nodi', servizi)).toBe('nodi')
  })
  it('senza corrispondenza o con servizio disattivato o cancellato è null', () => {
    expect(servizioPerNome('Pelo corto', servizi)).toBeNull()
    expect(servizioPerNome('Bagno', disattiva('bagno'))).toBeNull()
    expect(servizioPerNome('Bagno', senza('bagno'))).toBeNull()
    expect(servizioPerNome('Bagno + tosatura', disattiva('bagno-taglio'))).toBeNull()
  })
})

describe('servizioDellaRiga', () => {
  it('usa servizioId se attivo, null se tolto a mano o cancellato, il nome se assente', () => {
    expect(servizioDellaRiga(riga({ servizioId: 'taglio' }), servizi)).toBe('taglio')
    expect(servizioDellaRiga(riga({ servizioId: '' }), servizi)).toBeNull()
    expect(servizioDellaRiga(riga({ servizioId: 'sparito' }), servizi)).toBeNull()
    expect(servizioDellaRiga(riga({ servizioId: 'bagno' }), disattiva('bagno'))).toBeNull()
    expect(servizioDellaRiga(riga({ nome: 'Bagno' }), servizi)).toBe('bagno')
    expect(servizioDellaRiga(riga({ servizioId: '', nome: 'Bagno' }), servizi)).toBeNull()
  })
})

describe('razzaDelCane', () => {
  it('trova il gruppo per una parte del nome, senza maiuscole, accenti e spazi', () => {
    expect(razzaDelCane('shih tzu', foglio)?.id).toBe('maltese')
    expect(razzaDelCane('  SHÌH   Tzu ', foglio)?.id).toBe('maltese')
    expect(razzaDelCane('Yorkshire', foglio)?.id).toBe('york')
  })
  it('vuota, sconosciuta o senza foglio è null', () => {
    expect(razzaDelCane('Yorkshire terrier', foglio)).toBeNull()
    expect(razzaDelCane('', foglio)).toBeNull()
    expect(razzaDelCane('   ', foglio)).toBeNull()
    expect(razzaDelCane('Yorkshire', undefined)).toBeNull()
  })
})

describe('prezzoDalListino', () => {
  const bagno = servizi.find((item) => item.id === 'bagno')!
  const bagnoTaglio = servizi.find((item) => item.id === 'bagno-taglio')!
  it('dà prezzo e nome razza della riga abbinata', () => {
    expect(prezzoDalListino(cane('Yorkshire'), bagno, foglio, servizi)).toEqual({ prezzo: 25, razza: 'Yorkshire' })
  })
  it('ignora righe su valutazione, servizi non abbinati e fogli assenti', () => {
    expect(prezzoDalListino(cane('Chihuahua'), bagnoTaglio, foglio, servizi)).toBeNull()
    expect(prezzoDalListino(cane('Jack Russell'), bagnoTaglio, foglio, servizi)).toBeNull()
    expect(prezzoDalListino(cane('Yorkshire'), bagno, undefined, servizi)).toBeNull()
    expect(prezzoDalListino(cane('Yorkshire'), bagno, foglio, disattiva('bagno'))).toBeNull()
  })
})
