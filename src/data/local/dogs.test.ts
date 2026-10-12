// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logout } from './auth'
import { archiveDog, createDog, deleteDog, forgetLocalDog, listDogs, restoreDog, updateDog } from './dogs'
import { storageKeys } from './storage'
import type { DogWrite } from '../../types/models'

function write(partial: Partial<DogWrite> & Pick<DogWrite, 'name'>): DogWrite {
  return {
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: '', phone: '333' },
    ...partial,
  }
}

describe('dogs', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('salva nella mappa, ricostruisce searchKey e rilegge le date', () => {
    const created = createDog('uid-1', write({ name: 'Caffè', breed: 'Barboncino', contact: { name: 'Lea', phone: '333' } }))
    const raw = localStorage.getItem(storageKeys.dogs('uid-1'))
    expect(raw).toBeTruthy()
    const stored = JSON.parse(raw!)[created.id]
    expect(stored.searchKey).toBe('caffe barboncino lea 333')
    expect(stored.searchKey.includes('333')).toBe(true)
    const prefixed = createDog('uid-2', write({ name: 'Ercole', breed: 'Terranova', contact: { name: 'Usai', phone: '+39 345 2424242' } }))
    expect(prefixed.searchKey).toBe('ercole terranova usai 3452424242')
    expect(prefixed.searchKey.includes('39')).toBe(false)
    expect(typeof stored.createdAt).toBe('string')
    expect(stored.sex).toBeUndefined()
    const listed = listDogs('uid-1')
    expect(listed).toHaveLength(1)
    expect(listed[0].createdAt).toBeInstanceOf(Date)
    expect(listed[0].updatedAt).toBeInstanceOf(Date)
    createDog('uid-1', write({ name: 'Caffè' }))
    expect(listDogs('uid-1')).toHaveLength(2)
    logout()
    expect(localStorage.getItem(storageKeys.session)).toBeNull()
    expect(localStorage.getItem(storageKeys.dogs('uid-1'))).toContain('Caffè')
  })

  it('ordina per nome italiano', () => {
    createDog('uid-1', write({ name: 'Zoe' }))
    createDog('uid-1', write({ name: 'Bobi' }))
    expect(listDogs('uid-1').map((dog) => dog.name)).toEqual(['Bobi', 'Zoe'])
  })

  it('archivia e ripristina', () => {
    const created = createDog('uid-1', write({ name: 'Bobi' }))
    const dead = archiveDog('uid-1', created.id, 'deceduto')
    expect(dead.status).toBe('deceduto')
    expect(dead.archivedAt).toBeInstanceOf(Date)
    expect(JSON.parse(localStorage.getItem(storageKeys.dogs('uid-1'))!)[created.id].status).toBe('deceduto')
    const away = archiveDog('uid-1', created.id, 'non_in_cura')
    expect(away.status).toBe('non_in_cura')
    expect(away.archivedAt).toBeInstanceOf(Date)
    const restored = restoreDog('uid-1', created.id)
    expect(restored.status).toBe('attivo')
    expect(restored.archivedAt).toBeUndefined()
    expect(JSON.parse(localStorage.getItem(storageKeys.dogs('uid-1'))!)[created.id].archivedAt).toBeUndefined()
  })

  it('un id assente non scrive', () => {
    const created = createDog('uid-1', write({ name: 'Bobi' }))
    const before = localStorage.getItem(storageKeys.dogs('uid-1'))
    expect(() => updateDog('uid-1', 'manca', write({ name: 'Altro' }))).toThrowError(expect.objectContaining({ code: 'dog_missing' }))
    expect(() => archiveDog('uid-1', 'manca', 'deceduto')).toThrowError(expect.objectContaining({ code: 'dog_missing' }))
    expect(() => restoreDog('uid-1', 'manca')).toThrowError(expect.objectContaining({ code: 'dog_missing' }))
    expect(localStorage.getItem(storageKeys.dogs('uid-1'))).toBe(before)
    expect(listDogs('uid-1').map((dog) => dog.id)).toEqual([created.id])
  })

  it('aggiorna nome e contatto preservando foto, stato e date', () => {
    const created = createDog('uid-1', write({ name: 'Bobi', breed: 'Labrador', photo: 'data:image/jpeg;base64,abc' }))
    const archived = archiveDog('uid-1', created.id, 'deceduto')
    const updated = updateDog('uid-1', created.id, write({ name: 'Rex', breed: 'Labrador', contact: { name: 'Maria', phone: '333' } }))
    expect(updated.name).toBe('Rex')
    expect(updated.searchKey).toBe('rex labrador maria 333')
    expect(updated.photo).toBe('data:image/jpeg;base64,abc')
    expect(updated.status).toBe('deceduto')
    expect(updated.archivedAt).toEqual(archived.archivedAt)
    expect(updated.createdAt).toEqual(created.createdAt)
    expect(updated.searchKey.includes('333')).toBe(true)
    const stored = JSON.parse(localStorage.getItem(storageKeys.dogs('uid-1'))!)[created.id]
    expect(stored.name).toBe('Rex')
    expect(stored.searchKey).toBe('rex labrador maria 333')
    expect(stored.photo).toBe('data:image/jpeg;base64,abc')
    expect(stored.status).toBe('deceduto')
    expect(stored.archivedAt).toBeTruthy()
    expect(stored.createdAt).toBe(created.createdAt.toISOString())
    expect(stored.searchKey.includes('333')).toBe(true)
  })

  it('legge un cane senza contacts senza riscrivere il salvataggio', () => {
    const raw = JSON.stringify({
      'old-1': {
        id: 'old-1',
        name: 'Bobi',
        species: 'cane',
        breed: 'Labrador',
        ageCategory: 'adulto',
        size: 'piccola',
        temperament: 'bravo',
        clientType: 'occasionale',
        contact: { name: 'Sara', phone: '333' },
        status: 'attivo',
        searchKey: 'bobi labrador sara',
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
      },
    })
    localStorage.setItem(storageKeys.dogs('uid-1'), raw)
    const listed = listDogs('uid-1')
    expect(listed).toHaveLength(1)
    expect(listed[0].contact).toEqual({ name: 'Sara', phone: '333' })
    expect(listed[0].contacts).toEqual([
      { id: 'primary', name: 'Sara', role: 'Proprietaria', phone: '333', isPrimary: true },
    ])
    expect(listed[0].tags).toEqual([])
    expect(listed[0].servicePrices).toEqual([])
    expect(listed[0].hiddenServiceIds).toEqual([])
    expect(listed[0].customFields).toEqual([])
    expect(listed[0].gallery).toEqual([])
    expect(listed[0].birthYear).toBeUndefined()
    expect(listed[0].isSenior).toBeUndefined()
    expect(listed[0].weightKg).toBeUndefined()
    expect(listed[0].recurrenceWeeks).toBeUndefined()
    expect(listed[0].searchKey).toBe('bobi labrador sara 333')
    const stored = JSON.parse(localStorage.getItem(storageKeys.dogs('uid-1'))!)['old-1']
    expect(stored.searchKey).toBe('bobi labrador sara 333')
    expect(stored.contacts).toBeUndefined()
    expect(stored.name).toBe('Bobi')
  })

  it('persiste più contatti e il contact singolo è il primario', () => {
    const created = createDog('uid-1', write({
      name: 'Luna',
      breed: 'Pastore',
      contact: { name: 'Sara', phone: '111' },
      contacts: [
        { id: 'c1', name: 'Sara', role: 'Famiglia', phone: '111', isPrimary: false },
        { id: 'c2', name: 'Marco', role: 'Proprietario', phone: '444', isPrimary: true },
      ],
    }))
    expect(created.contact).toEqual({ name: 'Marco', phone: '444' })
    expect(created.contacts).toEqual([
      { id: 'c1', name: 'Sara', role: 'Famiglia', phone: '111', isPrimary: false },
      { id: 'c2', name: 'Marco', role: 'Proprietario', phone: '444', isPrimary: true },
    ])
    expect(created.searchKey).toBe('luna pastore sara marco 111 444')
    expect(created.searchKey.includes('444')).toBe(true)
    expect(created.tags).toEqual([])
    const stored = JSON.parse(localStorage.getItem(storageKeys.dogs('uid-1'))!)[created.id]
    expect(stored.contacts).toEqual(created.contacts)
    expect(stored.contact).toEqual({ name: 'Marco', phone: '444' })
    expect(stored.searchKey).toBe('luna pastore sara marco 111 444')
    const listed = listDogs('uid-1').find((dog) => dog.id === created.id)
    expect(listed?.contacts).toEqual(created.contacts)
    expect(listed?.contact).toEqual({ name: 'Marco', phone: '444' })

    const first = createDog('uid-1', write({
      name: 'Nero',
      breed: 'Meticcio',
      contact: { name: 'Ada', phone: '222' },
      contacts: [
        { id: 'a', name: 'Ada', role: 'Proprietaria', phone: '222', isPrimary: false },
        { id: 'b', name: 'Lea', role: 'Famiglia', phone: '555', isPrimary: false },
      ],
    }))
    expect(first.contact).toEqual({ name: 'Ada', phone: '222' })
    expect(JSON.parse(localStorage.getItem(storageKeys.dogs('uid-1'))!)[first.id].contact).toEqual({ name: 'Ada', phone: '222' })
  })

  it('persiste prezzi, galleria e campi opzionali sul cane', () => {
    const takenAt = new Date('2026-03-01T09:30:00.000Z')
    const created = createDog('uid-1', write({
      name: 'Birba',
      breed: 'Barboncino',
      contact: { name: 'Lea', phone: '333' },
      birthYear: 2015,
      isSenior: false,
      weightKg: 8.5,
      recurrenceWeeks: 6,
      tags: ['vip'],
      servicePrices: [{ serviceId: 'bagno', price: 25, durationMin: 40 }],
      hiddenServiceIds: ['nodi'],
      customFields: [{ id: 'cf1', label: 'Veterinario', value: 'Dott. Rossi' }],
      gallery: [{ id: 'g1', photo: 'data:image/jpeg;base64,abc', takenAt }],
    }))
    expect(created.birthYear).toBe(2015)
    expect(created.isSenior).toBe(false)
    expect(created.weightKg).toBe(8.5)
    expect(created.recurrenceWeeks).toBe(6)
    expect(created.tags).toEqual(['vip'])
    expect(created.servicePrices).toEqual([{ serviceId: 'bagno', price: 25, durationMin: 40 }])
    expect(created.hiddenServiceIds).toEqual(['nodi'])
    expect(created.customFields).toEqual([{ id: 'cf1', label: 'Veterinario', value: 'Dott. Rossi' }])
    expect(created.gallery).toEqual([{ id: 'g1', photo: 'data:image/jpeg;base64,abc', takenAt }])
    expect(created.contacts).toEqual([
      { id: 'primary', name: 'Lea', role: 'Proprietaria', phone: '333', isPrimary: true },
    ])
    const stored = JSON.parse(localStorage.getItem(storageKeys.dogs('uid-1'))!)[created.id]
    expect(stored.birthYear).toBe(2015)
    expect(stored.isSenior).toBe(false)
    expect(stored.weightKg).toBe(8.5)
    expect(stored.recurrenceWeeks).toBe(6)
    expect(stored.tags).toEqual(['vip'])
    expect(stored.servicePrices).toEqual([{ serviceId: 'bagno', price: 25, durationMin: 40 }])
    expect(stored.hiddenServiceIds).toEqual(['nodi'])
    expect(stored.customFields).toEqual([{ id: 'cf1', label: 'Veterinario', value: 'Dott. Rossi' }])
    expect(stored.gallery).toEqual([{ id: 'g1', photo: 'data:image/jpeg;base64,abc', takenAt: takenAt.toISOString() }])
    expect(stored.contact).toEqual({ name: 'Lea', phone: '333' })
    const listed = listDogs('uid-1').find((dog) => dog.id === created.id)
    expect(listed?.gallery[0].takenAt).toEqual(takenAt)
    expect(listed?.isSenior).toBe(false)
    expect(listed?.tags).toEqual(['vip'])
    expect(listed?.photo).toBe('data:image/jpeg;base64,abc')
  })

  it('tiene la foto profilo già scelta quando si aggiunge la galleria', () => {
    const created = createDog('uid-1', write({ name: 'Birba', photo: 'data:image/jpeg;base64,profile' }))
    const updated = updateDog('uid-1', created.id, write({
      name: 'Birba',
      gallery: [{ id: 'g1', photo: 'data:image/jpeg;base64,gal', takenAt: new Date('2026-03-01T09:30:00.000Z') }],
    }))
    expect(updated.photo).toBe('data:image/jpeg;base64,profile')
    expect(listDogs('uid-1')[0].photo).toBe('data:image/jpeg;base64,profile')
  })

  it('forgetLocalDog toglie il cane da ogni archivio locale', () => {
    const kept = createDog('uid-1', write({ name: 'Bobi' }))
    const gone = createDog('uid-1', write({ name: 'Marcello' }))
    createDog('uid-2', write({ name: 'Filippo' }))
    const filippo = listDogs('uid-2').find((dog) => dog.name === 'Filippo')
    forgetLocalDog(gone.id)
    forgetLocalDog(filippo!.id)
    expect(listDogs('uid-1').map((dog) => dog.id)).toEqual([kept.id])
    expect(listDogs('uid-2')).toEqual([])
  })

  it('deleteDog toglie solo quel id', () => {
    const kept = createDog('uid-1', write({ name: 'Bobi' }))
    const gone = createDog('uid-1', write({ name: 'Rex' }))
    deleteDog('uid-1', gone.id)
    expect(listDogs('uid-1').map((dog) => dog.id)).toEqual([kept.id])
    const before = localStorage.getItem(storageKeys.dogs('uid-1'))
    expect(() => deleteDog('uid-1', 'manca')).toThrowError(expect.objectContaining({ code: 'dog_missing' }))
    expect(localStorage.getItem(storageKeys.dogs('uid-1'))).toBe(before)
  })

  it('se setItem lancia resta il cane precedente', () => {
    const created = createDog('uid-1', write({ name: 'Bobi', breed: 'Labrador' }))
    const before = localStorage.getItem(storageKeys.dogs('uid-1'))
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => updateDog('uid-1', created.id, write({ name: 'Altro', breed: 'Labrador' }))).toThrowError(expect.objectContaining({ code: 'storage_write' }))
    vi.restoreAllMocks()
    expect(localStorage.getItem(storageKeys.dogs('uid-1'))).toBe(before)
    expect(listDogs('uid-1')[0].name).toBe('Bobi')
  })
})
