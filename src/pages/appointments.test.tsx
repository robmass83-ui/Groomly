// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { AppointmentRow } from '../components/domain/AppointmentRow'
import { createAppointment } from '../data/local/appointments'
import { createAccount } from '../data/local/auth'
import { archiveDog, createDog } from '../data/local/dogs'
import { storageKeys } from '../data/local/storage'
import type { Appointment, DogWrite } from '../types/models'

function dog(name: string, extra: Partial<DogWrite> = {}): DogWrite {
  return {
    name, species: 'cane', breed: '', ageCategory: 'adulto', size: 'piccola',
    temperament: 'bravo', clientType: 'occasionale', contact: { name: '', phone: '333' },
    ...extra,
  }
}

function appointment(start: Date, extra: Partial<Appointment> = {}): Appointment {
  return {
    id: 'appt-1',
    dogId: 'dog-1',
    start,
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    status: 'programmato',
    createdAt: start,
    updatedAt: start,
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
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(screen.queryByText('In arrivo')).not.toBeInTheDocument()
    expect(screen.getByText('09:00')).toBeInTheDocument()
    expect(screen.getByText('1h35')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apri Rex' })).toBeInTheDocument()
    expect(screen.getByText('+1')).toBeInTheDocument()
    expect(screen.queryByText('Domani')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Avviso critico')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Apri Rex' }))
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
  })

  it('senza cane la riga non si apre', () => {
    const start = new Date(2026, 9, 3, 9, 0, 0, 0)
    render(
      <MemoryRouter>
        <AppointmentRow appointment={appointment(start)} dog={undefined} services={[]} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: 'Apri Cane assente' })).toBeDisabled()
  })

  it('con onOpen non naviga al dettaglio', async () => {
    const start = new Date(2026, 9, 3, 9, 0, 0, 0)
    const onOpen = vi.fn()
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={(
              <AppointmentRow
                appointment={appointment(start, { dogId: 'rex' })}
                dog={{
                  ...dog('Rex', { ageCategory: 'anziano', clientType: 'mensile' }),
                  id: 'rex',
                  status: 'attivo',
                  searchKey: 'rex',
                  tags: [],
                  servicePrices: [],
                  hiddenServiceIds: [],
                  customFields: [],
                  gallery: [],
                  contacts: [],
                  createdAt: start,
                  updatedAt: start,
                }}
                services={[{ id: 'bagno', name: 'Bagno', iconKey: 'bagno', kind: 'principale', durationMin: { piccola: 30, media: 45, grande: 60 }, price: { piccola: 20, media: 28, grande: 38 }, order: 0, active: true, createdAt: start, updatedAt: start }]}
                onOpen={onOpen}
              />
            )}
          />
          <Route path="/appuntamenti/:id" element={<h1>Appuntamento</h1>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('30m')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Bagno' })).toHaveAttribute('width', '13')
    expect(screen.getByRole('img', { name: 'Bravo' })).toHaveAttribute('width', '25')
    expect(screen.getByRole('img', { name: 'Anziano' })).toHaveAttribute('width', '25')
    expect(screen.getByRole('img', { name: 'Mensile' })).toHaveAttribute('width', '25')
    await user.click(screen.getByRole('button', { name: 'Apri Rex' }))
    expect(onOpen).toHaveBeenCalledOnce()
    expect(screen.queryByRole('heading', { name: 'Appuntamento' })).not.toBeInTheDocument()
  })

  it('il Calendario cambia mese e tiene la data nell\'indirizzo', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 5, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05" />)
    expect(await screen.findByRole('heading', { name: 'Ottobre 2026' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apri Rex' }).getAttribute('style')).toContain('var(--pri)')
    await user.click(screen.getByRole('button', { name: 'Mese successivo' }))
    expect(screen.getByRole('heading', { name: 'Novembre 2026' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apri Rex' })).not.toBeInTheDocument()
    expect(screen.getByText('0 cani · 0m stimate')).toBeInTheDocument()
    expect(screen.queryByText('Lunedì 5 ottobre')).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Listino' }))
    expect(await screen.findByRole('heading', { name: 'Listino prezzi' })).toBeInTheDocument()
    expect(screen.queryByText('In arrivo')).not.toBeInTheDocument()
    expect(screen.getByText('Bagno')).toBeInTheDocument()
  })

  it('crea l’appuntamento, apre il dettaglio e non scrive se manca il servizio', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Rex', { breed: 'Labrador', contact: { name: 'Maria', phone: '333' }, size: 'piccola' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/appuntamenti/nuovo" />)
    await user.click(await screen.findByRole('button', { name: 'Salva appuntamento' }))
    expect(screen.getByText('Scegli un cane')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Cane' }), 'labr')
    await user.click(await screen.findByRole('button', { name: 'Rex' }))
    await user.click(screen.getByRole('button', { name: 'Bagno' }))
    await user.click(screen.getByRole('button', { name: 'Salva appuntamento' }))
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
    await user.click(screen.getByRole('button', { name: 'Salva appuntamento' }))
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
    await user.click(await screen.findByRole('button', { name: 'Rex' }))
    await user.click(screen.getByRole('button', { name: 'Bagno' }))
    expect(screen.getByText('Si sovrappone a Luna')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salva appuntamento' }))
    await user.click(await screen.findByRole('button', { name: 'Cancella' }))
    expect(screen.getByText('Cancellare questo appuntamento?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    expect(screen.queryByText('Cancellare questo appuntamento?')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancella' }))
    await user.click(screen.getByRole('button', { name: 'Cancella' }))
    expect(await screen.findByRole('heading', { name: 'Ottobre 2026' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Seleziona Sabato 3 ottobre' })).toHaveAttribute('aria-pressed', 'true')
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
    await user.click(screen.getByRole('button', { name: 'Salva appuntamento' }))
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

  it('la ricerca Bir mostra Birba evidenziata e non un cane archiviato', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Birba'))
    const archived = createDog(account.uid, dog('Birillo'))
    archiveDog(account.uid, archived.id, 'deceduto')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/appuntamenti/nuovo" />)
    expect(screen.queryByRole('button', { name: 'Birba' })).not.toBeInTheDocument()
    await user.type(await screen.findByRole('textbox', { name: 'Cane' }), 'Bir')
    const birba = await screen.findByRole('button', { name: 'Birba' })
    expect(birba.querySelector('mark')).toHaveTextContent('Bir')
    expect(screen.queryByRole('button', { name: 'Birillo' })).not.toBeInTheDocument()
  })

  it('il toggle acceso su un occasionale, dopo Salva appuntamento, lo rilegge mensile', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Rex'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/appuntamenti/nuovo" />)
    await user.type(await screen.findByRole('textbox', { name: 'Cane' }), 'Rex')
    await user.click(await screen.findByRole('button', { name: 'Rex' }))
    await user.click(screen.getByRole('button', { name: 'Bagno' }))
    await user.click(screen.getByRole('button', { name: 'Ripeti · cliente mensile' }))
    await user.click(screen.getByRole('button', { name: 'Salva appuntamento' }))
    expect(await screen.findByRole('heading', { name: 'Appuntamento' })).toBeInTheDocument()
    const dogs = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!) as Record<string, { name: string, clientType: string, recurrenceWeeks?: number }>
    const rex = Object.values(dogs).find((item) => item.name === 'Rex')
    expect(rex?.clientType).toBe('mensile')
    expect(rex?.recurrenceWeeks).toBe(4)
    const booked = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { seriesId?: string }>
    const seriesId = Object.values(booked)[0]?.seriesId
    expect(seriesId).toEqual(expect.any(String))
    expect(seriesId).not.toBe('')
  })

  it('se l’appuntamento non si scrive il cane resta occasionale', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Rex'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/appuntamenti/nuovo" />)
    await user.type(await screen.findByRole('textbox', { name: 'Cane' }), 'Rex')
    await user.click(await screen.findByRole('button', { name: 'Rex' }))
    await user.click(screen.getByRole('button', { name: 'Bagno' }))
    await user.click(screen.getByRole('button', { name: 'Ripeti · cliente mensile' }))
    const original = localStorage.setItem.bind(localStorage)
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (String(key) === storageKeys.appointments(account.uid)) throw new Error('quota')
      original(String(key), String(value))
    })
    await user.click(screen.getByRole('button', { name: 'Salva appuntamento' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvataggio non riuscito')
    spy.mockRestore()
    const dogs = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!) as Record<string, { name: string, clientType: string, recurrenceWeeks?: number }>
    const rex = Object.values(dogs).find((item) => item.name === 'Rex')
    expect(rex?.clientType).toBe('occasionale')
    expect(rex?.recurrenceWeeks).toBeUndefined()
    expect(localStorage.getItem(storageKeys.appointments(account.uid))).toBeNull()
  })

  it('se il cane non si aggiorna l’appuntamento resta senza diventare mensile', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Rex'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/appuntamenti/nuovo" />)
    await user.type(await screen.findByRole('textbox', { name: 'Cane' }), 'Rex')
    await user.click(await screen.findByRole('button', { name: 'Rex' }))
    await user.click(screen.getByRole('button', { name: 'Bagno' }))
    await user.click(screen.getByRole('button', { name: 'Ripeti · cliente mensile' }))
    const original = localStorage.setItem.bind(localStorage)
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (String(key) === storageKeys.dogs(account.uid)) throw new Error('quota')
      original(String(key), String(value))
    })
    await user.click(screen.getByRole('button', { name: 'Salva appuntamento' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvataggio non riuscito')
    spy.mockRestore()
    const dogs = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!) as Record<string, { name: string, clientType: string, recurrenceWeeks?: number }>
    const rex = Object.values(dogs).find((item) => item.name === 'Rex')
    expect(rex?.clientType).toBe('occasionale')
    expect(rex?.recurrenceWeeks).toBeUndefined()
    const booked = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { seriesId?: string }>
    expect(Object.keys(booked)).toHaveLength(1)
    const seriesId = Object.values(booked)[0]?.seriesId
    expect(seriesId).toEqual(expect.any(String))
    expect(seriesId).not.toBe('')
  })

  it('nuovo cane dal foglio torna col nome compilato e il cane scelto', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/appuntamenti/nuovo?data=2026-10-03" />)
    await user.type(await screen.findByRole('textbox', { name: 'Cane' }), 'Birba')
    await user.click(await screen.findByRole('link', { name: '+ Nuovo cane "Birba"' }))
    expect(await screen.findByRole('textbox', { name: 'Nome' })).toHaveValue('Birba')
    await user.type(screen.getByRole('textbox', { name: 'Telefono' }), '333')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Cane' })).toHaveValue('Birba')
  })

  it('vista mese mostra la griglia e non la colonna oraria', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05&vista=mese" />)
    expect(await screen.findByRole('grid', { name: 'Mese' })).toBeInTheDocument()
    expect(screen.queryByRole('grid', { name: 'Orari' })).not.toBeInTheDocument()
    expect(screen.queryByText('08:00')).not.toBeInTheDocument()
  })

  it('il riepilogo del giorno conta cani, minuti e mordaci', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex', { temperament: 'mordace', clientType: 'mensile', criticalNote: 'Morde. Sta attenta' }))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 5, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05" />)
    expect(await screen.findByText('1 cani · 30m stimate · 1 mordace')).toBeInTheDocument()
    expect(screen.getByText('Morde')).toBeInTheDocument()
    expect(screen.queryByText('Sta attenta')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apri Rex' }).getAttribute('style')).toContain('var(--warn)')
  })

  it('il riepilogo del mese conta tutto il mese', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const luna = createDog(account.uid, dog('Luna'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 5, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 20, 11, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 45, price: 20 }],
    })
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05&vista=mese" />)
    expect(await screen.findByText('2 cani · 1h15 stimate')).toBeInTheDocument()
  })

  it('il colore del blocco usa la chiave icona, non l’id col trattino', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 5, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno-taglio', name: 'Bagno + taglio', durationMin: 60, price: 35 }],
    })
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05" />)
    expect((await screen.findByRole('button', { name: 'Apri Rex' })).getAttribute('style')).toContain('var(--sen)')
  })

  it('in settimana il blocco ha nome e icona, senza il servizio', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 5, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05&vista=settimana" />)
    expect(await screen.findByRole('button', { name: 'Apri Rex' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Bravo' })).toBeInTheDocument()
    expect(screen.queryByText('Bagno')).not.toBeInTheDocument()
    expect(screen.getByText('08:00')).toBeInTheDocument()
  })

  it('il tocco su un’ora vuota apre il nuovo appuntamento a quell’ora', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05" />)
    await user.click(await screen.findByRole('button', { name: 'Nuovo Lunedì 5 ottobre alle 11:00' }))
    expect(await screen.findByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(screen.getByLabelText('Giorno')).toHaveValue('2026-10-05')
    expect(screen.getByRole('combobox', { name: 'Ora' })).toHaveValue('11:00')
  })

  it('nel mese il giorno apre il foglio con le righe e Aggiungi', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 5, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05&vista=mese" />)
    await user.click(await screen.findByRole('button', { name: 'Lunedì 5 ottobre' }))
    expect(await screen.findByRole('dialog', { name: 'Lunedì 5 ottobre' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apri Rex' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '+ Aggiungi' }))
    expect(await screen.findByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(screen.getByLabelText('Giorno')).toHaveValue('2026-10-05')
  })

  it('trascinare un blocco sposta, salva anche se si sovrappone e Annulla ripristina', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const luna = createDog(account.uid, dog('Luna'))
    const moved = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 5, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const other = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 5, 10, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05" />)
    const block = await screen.findByRole('button', { name: 'Apri Rex' })
    fireEvent.pointerDown(block, { pointerId: 1, clientX: 20, clientY: 10 })
    fireEvent.pointerMove(block, { pointerId: 1, clientX: 20, clientY: 88 })
    fireEvent.pointerUp(block, { pointerId: 1, clientX: 20, clientY: 88 })
    expect(await screen.findByRole('status')).toHaveTextContent('Spostato alle 10:00')
    const stored = () => JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { start: string }>
    expect(new Date(stored()[moved.id].start).getHours()).toBe(10)
    expect(new Date(stored()[moved.id].start).getMinutes()).toBe(0)
    expect(new Date(stored()[other.id].start).getHours()).toBe(10)
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    expect(new Date(stored()[moved.id].start).getHours()).toBe(9)
    expect(new Date(stored()[other.id].start).getHours()).toBe(10)
  })

  it('in settimana il trascinamento può cambiare giorno', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const moved = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 5, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05&vista=settimana" />)
    const block = await screen.findByRole('button', { name: 'Apri Rex' })
    const columns = document.querySelectorAll<HTMLElement>('[data-day-column]')
    expect(columns).toHaveLength(7)
    columns.forEach((node, index) => {
      vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({
        x: index * 40,
        y: 0,
        left: index * 40,
        top: 0,
        right: index * 40 + 40,
        bottom: 484,
        width: 40,
        height: 484,
        toJSON() { return {} },
      })
    })
    fireEvent.pointerDown(block, { pointerId: 1, clientX: 10, clientY: 40 })
    fireEvent.pointerMove(block, { pointerId: 1, clientX: 60, clientY: 88 })
    fireEvent.pointerUp(block, { pointerId: 1, clientX: 60, clientY: 88 })
    expect(await screen.findByRole('status')).toHaveTextContent('Spostato alle 10:00')
    const stored = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { start: string }>
    const start = new Date(stored[moved.id].start)
    expect(start.getDate()).toBe(6)
    expect(start.getHours()).toBe(10)
    expect(start.getMinutes()).toBe(0)
  })
})
