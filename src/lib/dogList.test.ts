import { describe, expect, it } from 'vitest'
import { buildSearchKey, countDogs, dogMeta, normalizeSearch, visibleDogs, type DogChip, type DogTab } from './dogList'
import type { Dog, DogStatus } from '../types/models'

function dog(partial: Pick<Dog, 'id' | 'name'> & Partial<Dog>): Dog {
  const breed = partial.breed ?? ''
  const contact = partial.contact ?? { name: '', phone: '111' }
  const status: DogStatus = partial.status ?? 'attivo'
  return {
    species: 'cane',
    breed,
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact,
    status,
    searchKey: '',
    createdAt: new Date('2026-10-03T12:00:00.000Z'),
    updatedAt: new Date('2026-10-03T12:00:00.000Z'),
    ...partial,
    contact,
    breed,
    searchKey: buildSearchKey(partial.name, breed, contact.name),
  }
}

describe('buildSearchKey', () => {
  it('unisce nome, razza e proprietario senza accenti e senza telefono', () => {
    expect(buildSearchKey('  Caffè ', 'Barboncino', 'Lea')).toBe('caffe barboncino lea')
    expect(normalizeSearch('Caffè')).toBe('caffe')
    expect(buildSearchKey('Bobi', '', '')).toBe('bobi')
    expect(buildSearchKey('Bobi', '', '').includes('333')).toBe(false)
  })
})

describe('visibleDogs', () => {
  const dogs = [
    dog({ id: '1', name: 'Zoe', breed: 'Bassotto', contact: { name: 'Sara', phone: '333' } }),
    dog({ id: '2', name: 'Bobi', breed: 'Labrador', contact: { name: 'Sara', phone: '111' } }),
    dog({
      id: '3', name: 'Micio', species: 'gatto', breed: 'Europeo', ageCategory: 'anziano',
      temperament: 'mordace', clientType: 'mensile', contact: { name: 'Lea', phone: '222' },
    }),
    dog({ id: '4', name: 'Nero', species: 'gatto', status: 'deceduto', contact: { name: 'Ada', phone: '444' } }),
  ]

  it('filtra tab e chip insieme e ignora il telefono', () => {
    expect(visibleDogs(dogs, 'attivi', 'tutti', '').map((item) => item.name)).toEqual(['Zoe', 'Bobi', 'Micio'])
    const accent = dog({ id: '5', name: 'Caffè' })
    expect(visibleDogs([accent], 'attivi', 'tutti', 'caffe').map((item) => item.name)).toEqual(['Caffè'])
    expect(visibleDogs(dogs, 'mensili', 'gatti', '').map((item) => item.name)).toEqual(['Micio'])
    expect(visibleDogs(dogs, 'attivi', 'gatti', '').map((item) => item.name)).toEqual(['Micio'])
    expect(visibleDogs(dogs, 'archivio', 'gatti', '').map((item) => item.name)).toEqual(['Nero'])
    expect(visibleDogs(dogs, 'attivi', 'tutti', 'lea').map((item) => item.name)).toEqual(['Micio'])
    expect(visibleDogs(dogs, 'attivi', 'tutti', 'Caffè')).toEqual([])
    expect(visibleDogs(dogs, 'attivi', 'tutti', '222')).toEqual([])
    expect(visibleDogs(dogs, 'attivi', 'mordaci', '').map((item) => item.name)).toEqual(['Micio'])
    expect(visibleDogs(dogs, 'attivi', 'anziani', '').map((item) => item.name)).toEqual(['Micio'])
  })

  it('conta sull\u2019intera lista', () => {
    expect(countDogs(dogs)).toEqual({ attivi: 3, mensili: 1, occasionali: 2, archivio: 1 })
    const tab: DogTab = 'attivi'
    const chip: DogChip = 'gatti'
    expect(countDogs(visibleDogs(dogs, tab, chip, 'lea')).attivi).toBe(1)
    expect(countDogs(dogs).attivi).toBe(3)
  })
})

describe('dogMeta', () => {
  it('omette i pezzi vuoti e usa l\u2019etichetta italiana', () => {
    expect(dogMeta(dog({ id: '1', name: 'Bobi', breed: 'Labrador', contact: { name: 'Sara', phone: '1' } }))).toBe('Labrador · Adulto · Sara')
    expect(dogMeta(dog({ id: '2', name: 'Bobi', breed: '  ', contact: { name: '', phone: '1' } }))).toBe('Adulto')
  })
})
