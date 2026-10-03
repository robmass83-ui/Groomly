// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { createDog } from '../data/local/dogs'
import { storageKeys } from '../data/local/storage'
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

describe('scheda cane', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('non scrive senza nome né telefono', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Il nome è obbligatorio')).toBeInTheDocument()
    expect(screen.getByText('Il telefono è obbligatorio')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nuovo cane' })).toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.dogs(account.uid))).toBeNull()
  })

  it('crea il cane, apre la scheda e lo ritrova dopo il rimontaggio', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    const view = render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    expect(screen.getByRole('radio', { name: 'Cane' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Maschio' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('radio', { name: 'Femmina' })).toHaveAttribute('aria-checked', 'false')
    await user.type(screen.getByLabelText('Nome'), 'Bobi')
    await user.type(screen.getByLabelText('Telefono'), '333')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvato')
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.getByText('Bobi')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '333' })).toHaveAttribute('href', 'tel:333')
    const stored = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!) as Record<string, { species: string; sex?: string; size: string; temperament: string; clientType: string; ageCategory: string; searchKey: string }>
    const saved = Object.values(stored)[0]
    expect(saved).toMatchObject({ species: 'cane', size: 'piccola', temperament: 'bravo', clientType: 'occasionale', ageCategory: 'adulto', searchKey: 'bobi' })
    expect(saved.sex).toBeUndefined()
    view.unmount()
    render(<App memory isDev={false} initialPath="/animali" />)
    expect(await screen.findByRole('button', { name: 'Apri Bobi' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Attivi 1' })).toHaveAttribute('aria-selected', 'true')
  })

  it('se la scrittura del cane nuovo fallisce resta sul modulo', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    await user.type(screen.getByLabelText('Nome'), 'Bobi')
    await user.type(screen.getByLabelText('Telefono'), '333')
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvataggio non riuscito')
    expect(screen.getByRole('heading', { name: 'Nuovo cane' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('Bobi')
    vi.restoreAllMocks()
    expect(localStorage.getItem(storageKeys.dogs(account.uid))).toBeNull()
  })

  it('un id sconosciuto non è una scheda vuota', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/animali/id-che-non-c-e" />)
    expect(await screen.findByText('Cane assente')).toBeInTheDocument()
  })
})
