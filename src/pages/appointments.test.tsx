// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAppointment } from '../data/local/appointments'
import { createAccount } from '../data/local/auth'
import { archiveDog, createDog } from '../data/local/dogs'
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

  it('modifica e salva, e Indietro non scrive', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const created = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 3, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Ora' }), '10:00')
    await user.click(screen.getByRole('button', { name: 'Indietro' }))
    expect(screen.getByText('09:00')).toBeInTheDocument()
    expect(screen.queryByText('10:00')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Modifica' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Ora' }), '10:00')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('10:00')).toBeInTheDocument()
  })

  it('salva anche se si sovrappone e la cancellazione apre il giorno', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Rex'))
    const luna = createDog(account.uid, dog('Luna'))
    createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 60, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/appuntamenti/nuovo?data=2026-10-03" />)
    await user.type(await screen.findByRole('textbox', { name: 'Cane' }), 'Rex')
    await user.click(screen.getByRole('button', { name: 'Rex' }))
    await user.click(screen.getByRole('button', { name: 'Bagno' }))
    expect(screen.getByText('Si sovrappone a Luna')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    await user.click(await screen.findByRole('button', { name: 'Cancella' }))
    expect(screen.getByText('Cancellare questo appuntamento?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    expect(screen.queryByText('Cancellare questo appuntamento?')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancella' }))
    await user.click(screen.getByRole('button', { name: 'Cancella' }))
    expect(await screen.findByRole('heading', { name: 'Calendario' })).toBeInTheDocument()
    expect(screen.getByText('Sabato 3 ottobre')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apri Rex' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apri Luna' })).toBeInTheDocument()
  })

  it('se setItem lancia resta l’ora precedente', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const created = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 3, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Ora' }), '11:00')
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota') })
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvataggio non riuscito')
    vi.restoreAllMocks()
    expect(screen.getByRole('combobox', { name: 'Ora' })).toHaveValue('11:00')
    expect(JSON.parse(localStorage.getItem(`groomly.users.${account.uid}.appointments`)!)[created.id].start).toContain('T')
    const storedStart = JSON.parse(localStorage.getItem(`groomly.users.${account.uid}.appointments`)!)[created.id].start as string
    expect(new Date(storedStart).getHours()).toBe(9)
  })

  it('il chip copia il prossimo e Annulla toglie solo il nuovo', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 29, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${rex.id}`} />)
    await user.click(await screen.findByRole('button', { name: '+2 sett' }))
    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('Fissato per gio 12 nov 09:30')
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    const map = JSON.parse(localStorage.getItem(`groomly.users.${account.uid}.appointments`)!) as Record<string, { start: string }>
    expect(Object.keys(map)).toHaveLength(1)
    expect(new Date(Object.values(map)[0].start).getDate()).toBe(29)
  })

  it('senza appuntamenti il chip apre il modulo e un archiviato non ha i chip', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${rex.id}`} />)
    expect(await screen.findByText('Nessun appuntamento')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '+4 sett' }))
    expect(await screen.findByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Ora' })).toHaveValue('')
  })

  it('un cane archiviato non ha i chip', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    archiveDog(account.uid, rex.id, 'deceduto')
    render(<App memory isDev={false} initialPath={`/animali/${rex.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+2 sett' })).not.toBeInTheDocument()
  })
})
