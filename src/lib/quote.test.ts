import { describe, expect, it } from 'vitest'
import { SERVICE_SEED } from '../data/seed/services'
import type { Dog, DogServicePrice, Service } from '../types/models'
import { quotedPrice } from './quote'

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
