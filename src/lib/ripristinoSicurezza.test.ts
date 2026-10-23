// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { createAccount } from '../data/local/auth'
import { createDog } from '../data/local/dogs'
import { storageKeys } from '../data/local/storage'
import type { DogWrite } from '../types/models'
import { cancellaCopiaLocale, leggiCopiaLocale, salvaCopiaLocale } from './ripristinoSicurezza'

function dog(name: string, extra: Partial<DogWrite> = {}): DogWrite {
  return {
    name,
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: '', phone: '333' },
    ...extra,
  }
}

describe('copia locale', () => {
  beforeEach(() => localStorage.clear())

  it('tiene i cani di adesso e li toglie quando si cancella', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Bobi', { sex: 'M' }))
    salvaCopiaLocale(account.uid)
    const copia = leggiCopiaLocale(account.uid)
    expect(Object.values(copia?.dogs ?? {}).map((cane) => (cane as { name: string }).name)).toEqual(['Bobi'])
    expect(localStorage.getItem(`groomly.users.${account.uid}.ripristinoSicurezza`)).toBeTruthy()
    cancellaCopiaLocale(account.uid)
    expect(leggiCopiaLocale(account.uid)).toBeNull()
    expect(localStorage.getItem(storageKeys.dogs(account.uid))).toBeTruthy()
  })

  it('rifiuta una copia che non è un salvataggio', () => {
    localStorage.setItem('groomly.users.u1.ripristinoSicurezza', JSON.stringify({ dogs: [] }))
    expect(() => leggiCopiaLocale('u1')).toThrow('Copia di sicurezza non riuscita')
    expect(localStorage.getItem('groomly.users.u1.ripristinoSicurezza')).toBeTruthy()
  })
})
