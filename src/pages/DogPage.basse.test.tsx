// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { createDog } from '../data/local/dogs'
import { readJson, storageKeys } from '../data/local/storage'
import type { DogContact, DogWrite } from '../types/models'

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

async function apriScheda(partial: Partial<DogWrite> & Pick<DogWrite, 'name'>) {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const created = createDog(account.uid, write(partial))
  const user = userEvent.setup()
  render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
  expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
  return { account, created, user }
}

function salvato(uid: string, dogId: string) {
  return readJson<Record<string, { contact: { name: string; phone: string }; contacts?: DogContact[] }>>(storageKeys.dogs(uid))![dogId]
}

describe('scheda del cane: basse', () => {
  beforeEach(() => {
    cleanup()
    localStorage.clear()
    sessionStorage.clear()
  })

  describe('Rendi principale', () => {
    const conLuca = {
      name: 'Bobi',
      contact: { name: 'Mario Rossi', phone: '3331111111' },
      contacts: [
        { id: 'primary', name: 'Mario Rossi', role: 'Proprietario', phone: '3331111111', isPrimary: true },
        { id: 'c1', name: 'Luca Rossi', role: 'Figlio', phone: '3332222222', isPrimary: false },
      ],
    } as Partial<DogWrite> & Pick<DogWrite, 'name'>

    it('scambia con i campi Proprietario e Telefono e con Salva li tiene', async () => {
      const { account, created, user } = await apriScheda(conLuca)
      await user.click(await screen.findByRole('button', { name: 'Modifica' }))
      await user.click(screen.getByRole('button', { name: 'Altri dettagli' }))
      await user.click(screen.getByRole('button', { name: 'Rendi principale Luca Rossi' }))
      expect(screen.getByRole('textbox', { name: 'Proprietario' })).toHaveValue('Luca Rossi')
      expect(screen.getByRole('textbox', { name: 'Telefono' })).toHaveValue('3332222222')
      await user.click(screen.getByRole('button', { name: 'Salva' }))
      expect(await screen.findByRole('status')).toHaveTextContent('Salvato')
      const dopo = salvato(account.uid, created.id)
      expect(dopo.contact.name).toBe('Luca Rossi')
      const principale = dopo.contacts?.find((c) => c.isPrimary)
      expect(principale).toMatchObject({ id: 'c1', name: 'Luca Rossi', role: 'Figlio' })
      expect(dopo.contacts?.find((c) => !c.isPrimary)).toMatchObject({ name: 'Mario Rossi', role: 'Proprietario' })
      const contatti = within(screen.getByText('Contatti').closest('div')!.parentElement!)
      expect(contatti.getByText('Mario Rossi')).toBeInTheDocument()
    })

    it('senza Salva i dati salvati restano invariati', async () => {
      const { account, created, user } = await apriScheda(conLuca)
      const prima = JSON.stringify(salvato(account.uid, created.id))
      await user.click(await screen.findByRole('button', { name: 'Modifica' }))
      await user.click(screen.getByRole('button', { name: 'Altri dettagli' }))
      await user.click(screen.getByRole('button', { name: 'Rendi principale Luca Rossi' }))
      expect(screen.getByRole('textbox', { name: 'Proprietario' })).toHaveValue('Luca Rossi')
      cleanup()
      render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
      expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
      await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Proprietario' })).not.toBeInTheDocument())
      expect(JSON.stringify(salvato(account.uid, created.id))).toBe(prima)
    })
  })
})
