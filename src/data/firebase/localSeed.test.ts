// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../errors'
import { createDog, updateDog } from '../local/dogs'
import { storageKeys } from '../local/storage'
import type { DogWrite } from '../../types/models'
import { withLocalKey } from './localSeed'

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
