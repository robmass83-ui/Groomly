// @vitest-environment happy-dom
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { createDog } from '../data/local/dogs'
import { getSettings } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'
import type { DogWrite } from '../types/models'

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

describe('cani recenti', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('il collaboratore non scrive i cani recenti', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    writeJson(storageKeys.auth, { ...account, role: 'collaboratore' })
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    await waitFor(() => {
      expect(getSettings(account.uid).recentDogIds).not.toContain(created.id)
    })
  })

  it('il titolare ricorda il cane aperto', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    await waitFor(() => {
      expect(getSettings(account.uid).recentDogIds[0]).toBe(created.id)
    })
  })
})
