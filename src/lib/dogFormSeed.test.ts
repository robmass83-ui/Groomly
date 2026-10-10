import { describe, expect, it } from 'vitest'
import type { Dog, DogContact } from '../types/models'
import { dogFormSeed, dogScreenSeed, shouldReseedDog } from './dogFormSeed'

const owner: DogContact = { id: 'c1', name: 'Sara', role: 'Proprietaria', phone: '333', isPrimary: true }

function dog(): Dog {
  return {
    id: 'cane-1',
    name: 'Birba',
    species: 'cane',
    breed: 'Lagotto',
    ageCategory: 'adulto',
    size: 'media',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: 'Sara', phone: '333' },
    contacts: [owner, { id: 'c2', name: 'Lea', role: 'Figlia', phone: '444', isPrimary: false }],
    tags: ['ipoallergenico'],
    servicePrices: [],
    hiddenServiceIds: ['nascosto'],
    customFields: [{ id: 'f1', label: 'Colore', value: 'nero' }],
    gallery: [{ id: 'g1', photo: 'data:image/jpeg;base64,aaa', takenAt: new Date('2026-01-02T00:00:00.000Z') }],
    status: 'attivo',
    searchKey: 'birba',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    birthYear: 2019,
    weightKg: 12.5,
    isSenior: false,
  }
}

describe('seme scheda cane', () => {
  it('non semina finché il cane non c’è e non risemina un modulo già copiato', () => {
    expect(shouldReseedDog(null, 'cane-1', undefined)).toBe(false)
    expect(shouldReseedDog(null, undefined, 'cane-1')).toBe(false)
    expect(shouldReseedDog(null, 'cane-1', 'cane-1')).toBe(true)
    expect(shouldReseedDog('cane-1', 'cane-1', 'cane-1')).toBe(false)
  })

  it('il seme tardivo tiene contatti, tag, galleria, anno e peso', () => {
    const empty = dogFormSeed(undefined)
    expect(empty.contacts).toEqual([])
    expect(empty.tags).toEqual([])
    expect(empty.gallery).toEqual([])
    expect(empty.birthYearInput).toBe('')
    expect(empty.weightInput).toBe('')
    const seeded = dogFormSeed(dog())
    expect(seeded.contacts.map((contact) => contact.phone)).toEqual(['333', '444'])
    expect(seeded.tags).toEqual(['ipoallergenico'])
    expect(seeded.customFields).toEqual([{ id: 'f1', label: 'Colore', value: 'nero' }])
    expect(seeded.gallery.map((item) => item.id)).toEqual(['g1'])
    expect(seeded.birthYearInput).toBe('2019')
    expect(seeded.weightInput).toBe('12,5')
    expect(seeded.hiddenServiceIds).toEqual(['nascosto'])
    expect(seeded.size).toBe('media')
    expect(seeded.contacts[0]).not.toBe(owner)
  })

  it('il DogScreen parte dai default o dalla scheda, senza anziano separato', () => {
    const empty = dogScreenSeed(undefined, ' Fido ')
    expect(empty).toMatchObject({ species: 'cane', ageCategory: 'adulto', size: 'piccola', temperament: 'bravo', clientType: 'occasionale', name: 'Fido', owner: '', phone: '', birthYear: '', weight: '', recurrenceWeeks: 4 })
    expect(empty.sex).toBeUndefined()
    expect('isSenior' in empty).toBe(false)
    const seeded = dogScreenSeed(dog())
    expect(seeded).toMatchObject({ name: 'Birba', breed: 'Lagotto', size: 'media', owner: 'Sara', phone: '333', birthYear: '2019', weight: '12,5' })
  })
})
