// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { createAppointment } from '../data/local/appointments'
import { createAccount } from '../data/local/auth'
import { createDog } from '../data/local/dogs'
import type { DogWrite } from '../types/models'

function dog(name: string, extra: Partial<DogWrite> = {}): DogWrite {
  return {
    name, species: 'cane', breed: '', ageCategory: 'adulto', size: 'piccola',
    temperament: 'bravo', clientType: 'occasionale', contact: { name: '', phone: '333' },
    ...extra,
  }
}

describe('agenda', () => {
  beforeEach(() => localStorage.clear())

  it('in Home mostra solo gli appuntamenti di oggi', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex', { criticalNote: 'Morde' }))
    const today = new Date()
    today.setHours(9, 0, 0, 0)
    const other = new Date()
    other.setDate(other.getDate() + 1)
    other.setHours(9, 0, 0, 0)
    createAppointment(account.uid, {
      dogId: rex.id,
      start: today,
      services: [
        { serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 },
        { serviceId: 'taglio', name: 'Taglio / tosatura', durationMin: 45, price: 30 },
        { serviceId: 'nodi', name: 'Gestione nodi', durationMin: 20, price: 5 },
      ],
    })
    createAppointment(account.uid, {
      dogId: rex.id,
      start: other,
      services: [{ serviceId: 'bagno', name: 'Domani', durationMin: 30, price: 20 }],
    })
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(screen.queryByText('In arrivo')).not.toBeInTheDocument()
    expect(screen.getByText('09:00')).toBeInTheDocument()
    expect(screen.getByText('1h 35')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apri Rex' })).toBeInTheDocument()
    expect(screen.getByText('+1')).toBeInTheDocument()
    expect(screen.queryByText('Domani')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Avviso critico')).toBeInTheDocument()
  })

  it('il Calendario cambia giorno e tiene la data nell\'indirizzo', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 5, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05" />)
    expect(await screen.findByRole('heading', { name: 'Calendario' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apri Rex' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Giorno dopo' }))
    expect(screen.queryByRole('button', { name: 'Apri Rex' })).not.toBeInTheDocument()
    expect(screen.getByText('Nessun appuntamento')).toBeInTheDocument()
    expect(screen.queryByText('Lunedì 5 ottobre')).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Listino' }))
    expect(await screen.findByRole('heading', { name: 'Listino' })).toBeInTheDocument()
    expect(screen.getByText('In arrivo')).toBeInTheDocument()
  })

  it('crea l’appuntamento, apre il dettaglio e non scrive se manca il servizio', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Rex', { breed: 'Labrador', contact: { name: 'Maria', phone: '333' }, size: 'piccola' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/appuntamenti/nuovo" />)
    await user.click(await screen.findByRole('button', { name: 'Salva' }))
    expect(screen.getByText('Scegli un cane')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Cane' }), 'labr')
    await user.click(screen.getByRole('button', { name: 'Rex' }))
    await user.click(screen.getByRole('button', { name: 'Bagno' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('€ 20')).toBeInTheDocument()
    expect(screen.getByText('30 min')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '333' })).toHaveAttribute('href', 'tel:333')
    expect(screen.getByRole('heading', { name: 'Appuntamento' })).toBeInTheDocument()
  })
})
