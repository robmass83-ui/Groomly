// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { archiveDog, createDog } from '../data/local/dogs'
import { getSettings } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'
import type { DogWrite } from '../types/models'

function cane(name: string): DogWrite {
  return {
    name,
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: '', phone: '333' },
  }
}

describe('listino, archivio e ripristino in inglese', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    localStorage.setItem('groomly.lingua', 'en')
  })

  it('Gestione listino non tiene testi italiani fissi', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino/gestione" />)
    expect(await screen.findByRole('button', { name: 'Upload logo' })).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByText('Breeds')).toBeInTheDocument()
    expect(screen.getByText('Texts')).toBeInTheDocument()
    expect(screen.getByText('Important information')).toBeInTheDocument()
    expect(screen.queryByText('Carica logo')).not.toBeInTheDocument()
    expect(screen.queryByText('Saluto finale')).not.toBeInTheDocument()
    expect(screen.queryByText(/prezzi indicativi/)).not.toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Breed' })[0])
    expect(screen.getByPlaceholderText('E.g. Toy poodle')).toBeInTheDocument()
    expect(within(screen.getAllByRole('combobox')[0]).getByRole('option', { name: 'From' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Bath and trim/ }).length).toBeGreaterThan(0)
  })

  it('Archivio mostra le righe degli animali in inglese', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const dog = createDog(account.uid, cane('Bobi'))
    archiveDog(account.uid, dog.id, 'non_in_cura')
    render(<App memory isDev={false} initialPath="/impostazioni/archivio" />)
    expect(await screen.findByText('Bobi')).toBeInTheDocument()
    expect(screen.queryByText('Non più in cura')).not.toBeInTheDocument()
  })

  it('il ripristino chiede REPLACE in inglese e rifiuta SOSTITUISCI', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Settings' })
    const file = new File([JSON.stringify({
      dogs: { a: {}, b: {} },
      appointments: {},
      services: { s: {} },
      settings: getSettings(account.uid),
    })], 'groomly-backup.json', { type: 'application/json' })
    writeJson(storageKeys.settings(account.uid), getSettings(account.uid))
    await user.upload(screen.getByLabelText('Choose a backup'), file)
    const dialog = await screen.findByRole('dialog', { name: 'Restore' }, { timeout: 10_000 })
    expect(dialog).toHaveTextContent('2 dogs, 0 appointments, 1 services')
    expect(dialog).toHaveTextContent('Type REPLACE below')
    const campo = within(dialog).getByLabelText('To replace everything')
    const sostituisci = within(dialog).getAllByRole('button', { name: 'Restore' }).at(-1)!
    await user.type(campo, 'SOSTITUISCI')
    expect(sostituisci).toBeDisabled()
    await user.clear(campo)
    await user.type(campo, 'REPLACE')
    expect(sostituisci).toBeEnabled()
  })
})
