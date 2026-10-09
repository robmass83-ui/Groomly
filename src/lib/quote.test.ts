import { describe, expect, it } from 'vitest'
import { SERVICE_SEED } from '../data/seed/services'
import type { Dog, DogServicePrice, Service } from '../types/models'
import { quotedPrice, rankDogs, roundEnd } from './quote'

function bagno(): Service {
  const seed = SERVICE_SEED.find((item) => item.id === 'bagno')!
  const now = new Date('2026-10-09T00:00:00.000Z')
  return { ...seed, createdAt: now, updatedAt: now }
}

function dog(servicePrices: DogServicePrice[]): Dog {
  const now = new Date('2026-10-09T00:00:00.000Z')
  return {
    id: 'bobi',
    name: 'Bobi',
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: '', phone: '333' },
    contacts: [],
    tags: [],
    servicePrices,
    hiddenServiceIds: [],
    customFields: [],
    gallery: [],
    status: 'attivo',
    searchKey: 'bobi',
    createdAt: now,
    updatedAt: now,
  }
}

describe('quotedPrice', () => {
  it('per bagno in taglia piccola usa 20 e 30, oppure lo scostamento', () => {
    expect(quotedPrice(dog([]), bagno())).toEqual({ price: 20, durationMin: 30 })
    expect(quotedPrice(dog([{ serviceId: 'bagno', price: 25, durationMin: 40 }]), bagno())).toEqual({ price: 25, durationMin: 40 })
  })
})

function searchDog(partial: Partial<Dog> & Pick<Dog, 'id' | 'name'>): Dog {
  return { ...dog([]), ...partial }
}

describe('roundEnd', () => {
  it('arrotonda i minuti della fine al multiplo di 5 e la metà va su', () => {
    const start = new Date(2026, 9, 3, 9, 0)
    expect(roundEnd(start, 70)).toEqual(new Date(2026, 9, 3, 10, 10))
    expect(roundEnd(start, 72)).toEqual(new Date(2026, 9, 3, 10, 10))
    expect(roundEnd(start, 73)).toEqual(new Date(2026, 9, 3, 10, 15))
    expect(roundEnd(start, 72.5)).toEqual(new Date(2026, 9, 3, 10, 15))
  })
})

describe('rankDogs', () => {
  it('con bir mette Birba prima di Birillo e esclude l’archiviato', () => {
    const birillo = searchDog({ id: 'birillo', name: 'Birillo' })
    const birba = searchDog({ id: 'birba', name: 'Birba' })
    const archived = searchDog({ id: 'arch', name: 'Bira', status: 'deceduto' })
    const ranked = rankDogs([birillo, archived, birba], 'bir')
    expect(ranked.map((item) => item.name)).toEqual(['Birba', 'Birillo'])
  })

  it('ordina prefisso, poi contenuto, poi proprietario o razza, e ne tiene sei', () => {
    const dogs = [
      searchDog({ id: 'zu', name: 'Birzu' }),
      searchDog({ id: 'contains', name: 'Zbirba' }),
      searchDog({ id: 'rex', name: 'Rex', breed: 'Birmano' }),
      searchDog({ id: 'luna', name: 'Luna', contact: { name: 'Caffè', phone: '333' } }),
      searchDog({ id: 'birba', name: 'Birba' }),
      searchDog({ id: 'biro', name: 'Biro' }),
      searchDog({ id: 'biru', name: 'Biru' }),
      searchDog({ id: 'ze', name: 'Birze' }),
      searchDog({ id: 'zo', name: 'Birzo' }),
      searchDog({ id: 'fido', name: 'Fido' }),
      searchDog({ id: 'arch', name: 'Birba', status: 'non_in_cura' }),
    ]
    expect(rankDogs(dogs, 'bir').map((item) => item.name)).toEqual(['Birba', 'Biro', 'Biru', 'Birze', 'Birzo', 'Birzu'])
    expect(rankDogs(dogs, 'caffe').map((item) => item.id)).toEqual(['luna'])
    expect(rankDogs([
      searchDog({ id: 'contains', name: 'Zbirba' }),
      searchDog({ id: 'rex', name: 'Rex', breed: 'Birmano' }),
      searchDog({ id: 'luna', name: 'Luna', contact: { name: 'Biro', phone: '333' } }),
    ], 'bir').map((item) => item.id)).toEqual(['contains', 'luna', 'rex'])
  })
})
