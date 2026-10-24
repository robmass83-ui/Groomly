// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../errors'
import { createDog, updateDog } from '../local/dogs'
import { storageKeys } from '../local/storage'
import type { DogWrite } from '../../types/models'
import type { Service } from '../../types/models'
import { servicesToLocalMap, withLocalKey } from './localSeed'

function service(id: string, iconKey?: Service['iconKey']): Service {
  const now = new Date('2026-10-24T08:00:00.000Z')
  const row: Service = {
    id,
    name: id,
    kind: 'principale',
    durationMin: { piccola: 30, media: 40, grande: 50 },
    price: { piccola: 10, media: 12, grande: 15 },
    order: 0,
    active: true,
    createdAt: now,
    updatedAt: now,
  }
  if (iconKey) row.iconKey = iconKey
  return row
}

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

describe('withLocalKey', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('valida in memoria e non scrive la chiave groomly.users', () => {
    const key = storageKeys.dogs('uid-cloud')
    const spy = vi.spyOn(localStorage, 'setItem')
    const dog = withLocalKey(key, {}, () => createDog('uid-cloud', write({ name: 'Nube' })))
    expect(dog.name).toBe('Nube')
    expect(localStorage.getItem(key)).toBeNull()
    expect(spy).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('groomly.migrate')).toBeNull()
    expect(() => withLocalKey(key, {}, () => updateDog('uid-cloud', 'missing', write({ name: 'Nube' })))).toThrow(AppError)
    expect(localStorage.getItem(key)).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('servicesToLocalMap', () => {
  it('non scrive iconKey quando il servizio non ha un’icona', () => {
    const stored = servicesToLocalMap([service('stripping'), service('bagno', 'bagno')])
    expect(stored.stripping).not.toHaveProperty('iconKey')
    expect(stored.bagno).toMatchObject({ iconKey: 'bagno' })
  })
})
