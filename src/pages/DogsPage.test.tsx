// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { createDog } from '../data/local/dogs'
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

describe('lista cani', () => {
  beforeEach(() => localStorage.clear())

  it('parte vuota', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali" />)
    expect(await screen.findByRole('heading', { name: 'Animali' })).toBeInTheDocument()
    expect(screen.getByText('0 attivi · 0 in archivio')).toBeInTheDocument()
    expect(screen.getByText('Nessun cane')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Attivi 0' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: 'Tutti' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText('In arrivo')).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Aggiungi' }))
    expect(await screen.findByRole('heading', { name: 'Nuovo cane' })).toBeInTheDocument()
  })

  it('ricerca, tab Mensili e chip Gatti filtrano senza cambiare i conteggi', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, write({ name: 'Bobi', breed: 'Labrador', contact: { name: 'Sara', phone: '111' } }))
    createDog(account.uid, write({
      name: 'Micio', species: 'gatto', breed: 'Europeo', ageCategory: 'anziano', temperament: 'mordace',
      clientType: 'mensile', contact: { name: 'Lea', phone: '222' },
    }))
    createDog(account.uid, write({ name: 'Nina', species: 'gatto', breed: 'Siamese', contact: { name: 'Ada', phone: '444' } }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali" />)
    expect(await screen.findByRole('tab', { name: 'Attivi 3' })).toBeInTheDocument()
    expect(screen.getByText('Labrador · Adulto · Sara')).toBeInTheDocument()
    expect(screen.getByText('Europeo · Anziano · Lea')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Cerca' }), 'lea')
    expect(screen.getByRole('button', { name: 'Apri Micio' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apri Bobi' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Attivi 3' })).toBeInTheDocument()
    expect(screen.getByText('3 attivi · 0 in archivio')).toBeInTheDocument()
    await user.clear(screen.getByRole('textbox', { name: 'Cerca' }))
    await user.type(screen.getByRole('textbox', { name: 'Cerca' }), '222')
    expect(screen.getByText('Nessun cane')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Attivi 3' })).toBeInTheDocument()
    await user.clear(screen.getByRole('textbox', { name: 'Cerca' }))
    await user.click(screen.getByRole('tab', { name: 'Mensili 1' }))
    expect(screen.getByRole('button', { name: 'Apri Micio' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apri Nina' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Gatti' }))
    expect(screen.getByRole('button', { name: 'Apri Micio' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apri Bobi' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Mensili 1' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Attivi 3' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gatti' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Tutti' })).toHaveAttribute('aria-pressed', 'false')
  })
})
