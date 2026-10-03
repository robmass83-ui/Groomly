// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logout } from './auth'
import { archiveDog, createDog, listDogs, restoreDog, updateDog } from './dogs'
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
    expect(stored.searchKey).toBe('caffe barboncino lea')
    expect(stored.searchKey.includes('333')).toBe(false)
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
    expect(updated.searchKey).toBe('rex labrador maria')
    expect(updated.photo).toBe('data:image/jpeg;base64,abc')
    expect(updated.status).toBe('deceduto')
    expect(updated.archivedAt).toEqual(archived.archivedAt)
    expect(updated.createdAt).toEqual(created.createdAt)
    expect(updated.searchKey.includes('333')).toBe(false)
    const stored = JSON.parse(localStorage.getItem(storageKeys.dogs('uid-1'))!)[created.id]
    expect(stored.name).toBe('Rex')
    expect(stored.searchKey).toBe('rex labrador maria')
    expect(stored.photo).toBe('data:image/jpeg;base64,abc')
    expect(stored.status).toBe('deceduto')
    expect(stored.archivedAt).toBeTruthy()
    expect(stored.createdAt).toBe(created.createdAt.toISOString())
    expect(stored.searchKey.includes('333')).toBe(false)
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
