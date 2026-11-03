// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { createAppointment } from '../data/local/appointments'
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

function salvatoCompleto(uid: string, dogId: string) {
  return readJson<Record<string, Record<string, unknown>>>(storageKeys.dogs(uid))![dogId]
}

async function apriMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Menu' }))
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

  describe('conferma archiviazione', () => {
    it.each([
      ['Deceduto', 'Segnare Lupo come deceduto?', 'deceduto'],
      ['Non più in cura', 'Segnare Lupo come non più in cura?', 'non_in_cura'],
    ])('senza visite future %s chiede conferma', async (voce, domanda, stato) => {
      const { account, created, user } = await apriScheda({ name: 'Lupo' })
      await apriMenu(user)
      await user.click(await screen.findByRole('button', { name: new RegExp(voce) }))
      expect(await screen.findByText(domanda)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Annulla' }))
      expect(salvatoCompleto(account.uid, created.id).status).toBe('attivo')
      await apriMenu(user)
      await user.click(await screen.findByRole('button', { name: new RegExp(voce) }))
      await user.click(await screen.findByRole('button', { name: 'Conferma' }))
      await waitFor(() => expect(salvatoCompleto(account.uid, created.id).status).toBe(stato))
    })

    it('con una visita futura resta il dialogo con Archivia e disdici', async () => {
      const account = await createAccount('maria@salone.it', 'segretissimo')
      const created = createDog(account.uid, write({ name: 'Lupo' }))
      createAppointment(account.uid, { dogId: created.id, start: new Date(Date.now() + 3 * 86400000), services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }] })
      const user = userEvent.setup()
      render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
      await screen.findByRole('heading', { name: 'Scheda' })
      await apriMenu(user)
      await user.click(await screen.findByRole('button', { name: /Non più in cura/ }))
      expect(await screen.findByRole('button', { name: /Archivia e disdici/ })).toBeInTheDocument()
    })
  })

  describe('sesso, frequenza, età, prezzi', () => {
    it('Non indicato toglie il sesso', async () => {
      const { account, created, user } = await apriScheda({ name: 'Lupo', sex: 'F', contact: { name: 'Mario', phone: '3331111111' } })
      await user.click(await screen.findByRole('button', { name: 'Modifica' }))
      await user.click(screen.getByRole('button', { name: 'Altri dettagli' }))
      await user.click(screen.getByRole('radio', { name: 'Non indicato' }))
      await user.click(screen.getByRole('button', { name: 'Salva' }))
      expect(await screen.findByRole('status')).toHaveTextContent('Salvato')
      expect(salvatoCompleto(account.uid, created.id).sex).toBeUndefined()
    })

    it('frequenza mensile: ogni N settimane / ogni settimana', async () => {
      await apriScheda({ name: 'Lupo', clientType: 'mensile', recurrenceWeeks: 6 })
      expect(await screen.findByText('Mensile · ogni 6 settimane')).toBeInTheDocument()
      cleanup()
      localStorage.clear()
      await apriScheda({ name: 'Lupo', clientType: 'mensile', recurrenceWeeks: 1 })
      expect(await screen.findByText('Mensile · ogni settimana')).toBeInTheDocument()
    })

    it('Anziano senza anno di nascita compare una volta sola', async () => {
      await apriScheda({ name: 'Lupo', ageCategory: 'anziano' })
      expect(screen.getAllByText('Anziano')).toHaveLength(1)
    })

    it('Anziano con anno di nascita mostra gli anni e il bollino', async () => {
      await apriScheda({ name: 'Lupo', ageCategory: 'anziano', birthYear: 2014 })
      const anni = new Date().getFullYear() - 2014
      expect(screen.getByText(`${anni} anni`)).toBeInTheDocument()
      expect(screen.getAllByText('Anziano')).toHaveLength(1)
    })

    const conBagno = { name: 'Lupo', contact: { name: 'Mario', phone: '3331111111' }, servicePrices: [{ serviceId: 'bagno', price: 27.5, durationMin: 50 }], hiddenServiceIds: ['bagno'] }

    it('prezzo e durata svuotati tolgono il prezzo dal profilo', async () => {
      const { account, created, user } = await apriScheda(conBagno)
      expect(screen.getByText('Prezzi personalizzati')).toBeInTheDocument()
      await user.click(await screen.findByRole('button', { name: 'Modifica' }))
      await user.click(screen.getByRole('button', { name: 'Prezzi personalizzati' }))
      await user.clear(screen.getByLabelText('Prezzo Bagno'))
      await user.clear(screen.getByLabelText('Durata Bagno'))
      await user.click(screen.getByRole('button', { name: 'Salva' }))
      expect(await screen.findByRole('status')).toHaveTextContent('Salvato')
      const dopo = salvatoCompleto(account.uid, created.id)
      expect(JSON.stringify(dopo.servicePrices ?? [])).not.toContain('bagno')
      expect(JSON.stringify(dopo.hiddenServiceIds ?? [])).not.toContain('bagno')
      expect(screen.queryByText('Prezzi personalizzati')).not.toBeInTheDocument()
    })

    it('solo il prezzo svuotato: la durata resta e il servizio resta nel profilo', async () => {
      const { account, created, user } = await apriScheda(conBagno)
      await user.click(await screen.findByRole('button', { name: 'Modifica' }))
      await user.click(screen.getByRole('button', { name: 'Prezzi personalizzati' }))
      await user.clear(screen.getByLabelText('Prezzo Bagno'))
      await user.click(screen.getByRole('button', { name: 'Salva' }))
      expect(await screen.findByRole('status')).toHaveTextContent('Salvato')
      expect(JSON.stringify(salvatoCompleto(account.uid, created.id).hiddenServiceIds)).toContain('bagno')
    })

    it('dati già salvati senza prezzo né durata: niente riga vuota', async () => {
      await apriScheda({ name: 'Lupo', servicePrices: [], hiddenServiceIds: ['bagno'] })
      expect(screen.queryByText('Prezzi personalizzati')).not.toBeInTheDocument()
    })
  })
})
