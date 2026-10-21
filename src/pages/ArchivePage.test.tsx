// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { archiveDog, createDog } from '../data/local/dogs'
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

describe('archivio impostazioni', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('senza cani archiviati mostra lo stato vuoto', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const settings = getSettings(account.uid)
    writeJson(storageKeys.settings(account.uid), {
      ...settings,
      business: { ...settings.business, taxCode: 'RSSMRA80A01H501Z' },
    })
    render(<App memory isDev={false} initialPath="/impostazioni/archivio" />)
    expect(await screen.findByRole('heading', { name: 'Archivio' })).toBeInTheDocument()
    expect(screen.getByText('Nessuno in archivio')).toBeInTheDocument()
    expect(screen.getByText('Nessun animale in archivio')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Aggiungi/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Indietro' })).toHaveAttribute('href', '/impostazioni')
    expect(screen.getByRole('link', { name: 'Impostazioni' })).toHaveAttribute('aria-current', 'page')
  })

  it('elenca solo gli archiviati e Ripristina li toglie dalla lista', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, write({ name: 'Attivo' }))
    const ada = createDog(account.uid, write({ name: 'Ada' }))
    const zoe = createDog(account.uid, write({ name: 'Zoe' }))
    archiveDog(account.uid, ada.id, 'non_in_cura')
    archiveDog(account.uid, zoe.id, 'deceduto')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni/archivio" />)
    expect(await screen.findByRole('heading', { name: 'Archivio' })).toBeInTheDocument()
    expect(screen.getByText('2 in archivio')).toBeInTheDocument()
    expect(screen.queryByText('Attivo')).not.toBeInTheDocument()
    expect(screen.getByText('Non più in cura')).toBeInTheDocument()
    expect(screen.getByText('Deceduto')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apri Ada' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apri Zoe' })).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Ripristina' })[0]!)
    expect(screen.queryByRole('button', { name: 'Apri Ada' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apri Zoe' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Archivio' })).toBeInTheDocument()
    expect(screen.getByText('1 in archivio')).toBeInTheDocument()
  })
})
