// @vitest-environment happy-dom
import { fireEvent, render, screen, within } from '@testing-library/react'
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

  it('crea l’appuntamento, torna alla pagina di partenza e non scrive se manca il servizio', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Rex', { breed: 'Labrador', contact: { name: 'Maria', phone: '333' }, size: 'piccola' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/appuntamenti/nuovo" />)
    expect(await screen.findByRole('button', { name: 'Salva' })).toBeDisabled()
    await user.type(screen.getByRole('textbox', { name: 'Cerca cane' }), 'labr')
    await user.click(await screen.findByRole('button', { name: 'Rex' }))
    expect(screen.getByRole('button', { name: 'Salva' })).toBeDisabled()
    expect(localStorage.getItem(storageKeys.appointments(account.uid))).toBeNull()
    await user.click(screen.getByRole('button', { name: /^Bagno · / }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Appuntamento salvato per')
    const stored = Object.values(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { services: { price: number; durationMin: number }[] }>)
    expect(stored).toHaveLength(1)
    expect(stored[0].services[0]).toMatchObject({ price: 20, durationMin: 30 })
  })

  it('modifica e salva, e Chiudi sporco non scrive', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const created = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 3, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}?data=2026-10-03`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    await user.click(screen.getByRole('button', { name: '10:00' }))
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(screen.getByText('Chiudere senza salvare?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Chiudi senza salvare' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const stored = () => JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { start: string }>
    expect(new Date(stored()[created.id].start).getHours()).toBe(9)
    await user.click(screen.getByRole('button', { name: 'Apri Rex' }))
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    await user.click(screen.getByRole('button', { name: '10:00' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await within(screen.getByRole('dialog', { name: 'Appuntamento' })).findByText(/10:00–10:30/)).toBeInTheDocument()
    expect(new Date(stored()[created.id].start).getHours()).toBe(10)
  })

  it('si sovrappone: Salva chiede conferma, poi salva, e la cancellazione apre il giorno', async () => {
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
    await user.type(await screen.findByRole('textbox', { name: 'Cerca cane' }), 'Rex')
    await user.click(await screen.findByRole('button', { name: 'Rex' }))
    await user.click(screen.getByRole('button', { name: /^Bagno · / }))
    expect(screen.getByText('Si sovrappone a Luna 09:00–10:00')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(screen.getByRole('dialog', { name: 'Orario già occupato' })).toBeInTheDocument()
    expect(Object.keys(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as object)).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Salva comunque' }))
    expect(await screen.findByRole('heading', { name: 'Ottobre 2026' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Apri Rex' }))
    await user.click(await screen.findByRole('button', { name: 'Altre azioni' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Altre azioni' })).getByRole('button', { name: 'Elimina' }))
    const confirm = screen.getByRole('dialog', { name: 'Eliminare questo appuntamento?' })
    expect(within(confirm).queryByRole('button', { name: 'Annulla' })).toBeNull()
    await user.click(within(confirm).getByRole('button', { name: 'Tieni' }))
    expect(screen.queryByRole('dialog', { name: 'Eliminare questo appuntamento?' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Altre azioni' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Altre azioni' })).getByRole('button', { name: 'Elimina' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Eliminare questo appuntamento?' })).getByRole('button', { name: 'Elimina' }))
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
    await user.click(screen.getByRole('button', { name: '11:00' }))
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota') })
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvataggio non riuscito')
    vi.restoreAllMocks()
    expect(screen.getByRole('button', { name: '11:00' })).toHaveAttribute('aria-pressed', 'true')
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
    await user.click(screen.getByRole('button', { name: 'Crea' }))
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
    expect(screen.getByRole('button', { name: '09:00' })).toHaveAttribute('aria-pressed', 'false')
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
    await user.type(await screen.findByRole('textbox', { name: 'Cerca cane' }), 'Bir')
    const birba = await screen.findByRole('button', { name: 'Birba' })
    expect(birba.querySelector('mark')).toHaveTextContent('Bir')
    expect(screen.queryByRole('button', { name: 'Birillo' })).not.toBeInTheDocument()
  })

  async function pickRex(uid: string, extra: Partial<DogWrite> = {}) {
    createDog(uid, dog('Rex', extra))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/appuntamenti/nuovo" />)
    await user.type(await screen.findByRole('textbox', { name: 'Cerca cane' }), 'Rex')
    await user.click(await screen.findByRole('button', { name: 'Rex' }))
    await user.click(screen.getByRole('button', { name: /^Bagno · / }))
    fireEvent.change(screen.getByLabelText('Giorno'), { target: { value: '2026-10-15' } })
    await user.click(screen.getByRole('button', { name: '10:00' }))
    return user
  }

  function storedList(uid: string) {
    const raw = JSON.parse(localStorage.getItem(storageKeys.appointments(uid)) ?? '{}') as Record<string, { start: string; seriesId?: string; status: string }>
    return Object.values(raw).sort((a, b) => a.start.localeCompare(b.start))
  }

  function storedRex(uid: string) {
    const dogs = JSON.parse(localStorage.getItem(storageKeys.dogs(uid))!) as Record<string, { name: string; clientType: string; recurrenceWeeks?: number }>
    return Object.values(dogs).find((item) => item.name === 'Rex')
  }

  it('su un occasionale crea due appuntamenti e non lo fa mensile', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = await pickRex(account.uid)
    expect(screen.getByRole('button', { name: 'Fissa anche il prossimo' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Rendilo cliente mensile' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Fissa anche il prossimo' }))
    expect(screen.getByText('tra 4 settimane')).toBeInTheDocument()
    expect(screen.getByText('Prossimo: gio 12 nov, 10:00')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    const items = storedList(account.uid)
    expect(items).toHaveLength(2)
    expect(new Date(items[0].start)).toEqual(new Date(2026, 9, 15, 10, 0, 0, 0))
    expect(new Date(items[1].start)).toEqual(new Date(2026, 10, 12, 10, 0, 0, 0))
    expect(items[0].seriesId).toEqual(expect.any(String))
    expect(items[0].seriesId).toBe(items[1].seriesId)
    expect(storedRex(account.uid)?.clientType).toBe('occasionale')
    expect(storedRex(account.uid)?.recurrenceWeeks).toBeUndefined()
  })

  it('Rendilo cliente mensile scrive il tipo al salvataggio e con l’interruttore spento nasce un solo appuntamento', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = await pickRex(account.uid)
    await user.click(screen.getByRole('button', { name: 'Rendilo cliente mensile' }))
    expect(storedRex(account.uid)?.clientType).toBe('occasionale')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(storedRex(account.uid)?.clientType).toBe('mensile')
    expect(storedRex(account.uid)?.recurrenceWeeks).toBe(4)
    const items = storedList(account.uid)
    expect(items).toHaveLength(1)
    expect(items[0].seriesId).toBeUndefined()
  })

  it('il link con l’interruttore acceso rende mensile con la N scelta e crea due appuntamenti', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = await pickRex(account.uid)
    await user.click(screen.getByRole('button', { name: 'Fissa anche il prossimo' }))
    await user.click(screen.getByRole('button', { name: 'Rendilo cliente mensile' }))
    await user.clear(screen.getByRole('textbox', { name: 'Settimane' }))
    await user.type(screen.getByRole('textbox', { name: 'Settimane' }), '6')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(storedRex(account.uid)).toMatchObject({ clientType: 'mensile', recurrenceWeeks: 6 })
    const items = storedList(account.uid)
    expect(items).toHaveLength(2)
    expect(new Date(items[1].start)).toEqual(new Date(2026, 10, 26, 10, 0, 0, 0))
  })

  it('chiudere senza salvare dopo il link non cambia il cane', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = await pickRex(account.uid)
    await user.click(screen.getByRole('button', { name: 'Rendilo cliente mensile' }))
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    await user.click(screen.getByRole('button', { name: 'Chiudi senza salvare' }))
    expect(storedRex(account.uid)?.clientType).toBe('occasionale')
    expect(storedRex(account.uid)?.recurrenceWeeks).toBeUndefined()
    expect(localStorage.getItem(storageKeys.appointments(account.uid))).toBeNull()
  })

  it('un mensile ha l’interruttore acceso, non ha il link e N aggiorna la frequenza', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = await pickRex(account.uid, { clientType: 'mensile', recurrenceWeeks: 4 })
    expect(screen.getByRole('button', { name: 'Fissa anche il prossimo' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: 'Rendilo cliente mensile' })).toBeNull()
    await user.clear(screen.getByRole('textbox', { name: 'Settimane' }))
    await user.type(screen.getByRole('textbox', { name: 'Settimane' }), '2')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(storedRex(account.uid)).toMatchObject({ clientType: 'mensile', recurrenceWeeks: 2 })
    expect(storedList(account.uid)).toHaveLength(2)
  })

  it('se l’appuntamento non si scrive il cane resta occasionale', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = await pickRex(account.uid)
    await user.click(screen.getByRole('button', { name: 'Fissa anche il prossimo' }))
    await user.click(screen.getByRole('button', { name: 'Rendilo cliente mensile' }))
    const original = localStorage.setItem.bind(localStorage)
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (String(key) === storageKeys.appointments(account.uid)) throw new Error('quota')
      original(String(key), String(value))
    })
    try {
      await user.click(screen.getByRole('button', { name: 'Salva' }))
      expect(await screen.findByRole('status')).toHaveTextContent('Salvataggio non riuscito')
    } finally {
      spy.mockRestore()
    }
    expect(storedRex(account.uid)?.clientType).toBe('occasionale')
    expect(storedRex(account.uid)?.recurrenceWeeks).toBeUndefined()
    expect(localStorage.getItem(storageKeys.appointments(account.uid))).toBeNull()
  })

  it('se il secondo appuntamento non si scrive toglie anche il primo', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = await pickRex(account.uid)
    await user.click(screen.getByRole('button', { name: 'Fissa anche il prossimo' }))
    const original = localStorage.setItem.bind(localStorage)
    let writes = 0
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (String(key) === storageKeys.appointments(account.uid)) {
        writes += 1
        if (writes === 2) throw new Error('quota')
      }
      original(String(key), String(value))
    })
    try {
      await user.click(screen.getByRole('button', { name: 'Salva' }))
      expect(await screen.findByRole('status')).toHaveTextContent('Salvataggio non riuscito')
    } finally {
      spy.mockRestore()
    }
    expect(storedList(account.uid)).toHaveLength(0)
  })

  it('se il cane non si aggiorna toglie gli appuntamenti, lascia il foglio aperto e un secondo Salva non raddoppia', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = await pickRex(account.uid)
    await user.click(screen.getByRole('button', { name: 'Fissa anche il prossimo' }))
    await user.click(screen.getByRole('button', { name: 'Rendilo cliente mensile' }))
    const original = localStorage.setItem.bind(localStorage)
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (String(key) === storageKeys.dogs(account.uid)) throw new Error('quota')
      original(String(key), String(value))
    })
    try {
      await user.click(screen.getByRole('button', { name: 'Salva' }))
      expect(await screen.findByRole('status')).toHaveTextContent('Salvataggio non riuscito')
      expect(screen.getByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Salva' })).toBeEnabled()
    } finally {
      spy.mockRestore()
    }
    expect(storedRex(account.uid)?.clientType).toBe('occasionale')
    expect(storedRex(account.uid)?.recurrenceWeeks).toBeUndefined()
    expect(storedList(account.uid)).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    const items = storedList(account.uid)
    expect(items).toHaveLength(2)
    expect(items[0].seriesId).toEqual(expect.any(String))
    expect(items[0].seriesId).toBe(items[1].seriesId)
    expect(storedRex(account.uid)).toMatchObject({ clientType: 'mensile', recurrenceWeeks: 4 })
  })

  it('Togli nuovo cane poi un altro occasionale salva un solo appuntamento e il tipo resta occasionale', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Rex'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/appuntamenti/nuovo" />)
    await user.type(await screen.findByRole('textbox', { name: 'Cerca cane' }), 'Rex')
    await user.click(await screen.findByRole('button', { name: 'Rex' }))
    await user.click(screen.getByRole('button', { name: 'Fissa anche il prossimo' }))
    await user.click(screen.getByRole('button', { name: 'Rendilo cliente mensile' }))
    await user.clear(screen.getByRole('textbox', { name: 'Settimane' }))
    await user.type(screen.getByRole('textbox', { name: 'Settimane' }), '8')
    await user.click(screen.getByRole('button', { name: 'Cambia cane' }))
    expect(screen.getByRole('button', { name: 'Fissa anche il prossimo' })).toHaveAttribute('aria-pressed', 'false')
    await user.click(screen.getByRole('button', { name: 'Fissa anche il prossimo' }))
    expect(screen.getByRole('textbox', { name: 'Settimane' })).toHaveValue('4')
    await user.click(screen.getByRole('button', { name: 'Fissa anche il prossimo' }))

    await user.click(screen.getByRole('button', { name: 'Fissa anche il prossimo' }))
    await user.clear(screen.getByRole('textbox', { name: 'Settimane' }))
    await user.type(screen.getByRole('textbox', { name: 'Settimane' }), '8')
    await user.type(screen.getByRole('textbox', { name: 'Cerca cane' }), 'Birba')
    await user.click(screen.getByRole('button', { name: '+ Nuovo cane "Birba"' }))
    expect(screen.getByRole('button', { name: 'Fissa anche il prossimo' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('textbox', { name: 'Settimane' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Fissa anche il prossimo' }))
    await user.click(screen.getByRole('button', { name: 'Rendilo cliente mensile' }))
    await user.clear(screen.getByRole('textbox', { name: 'Settimane' }))
    await user.type(screen.getByRole('textbox', { name: 'Settimane' }), '6')
    await user.click(screen.getByRole('button', { name: 'Togli nuovo cane' }))
    expect(screen.getByRole('button', { name: 'Fissa anche il prossimo' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('button', { name: 'Rendilo cliente mensile' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Settimane' })).not.toBeInTheDocument()

    await user.clear(screen.getByRole('textbox', { name: 'Cerca cane' }))
    await user.type(screen.getByRole('textbox', { name: 'Cerca cane' }), 'Luna')
    await user.click(screen.getByRole('button', { name: '+ Nuovo cane "Luna"' }))
    expect(screen.getByRole('button', { name: 'Fissa anche il prossimo' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Rendilo cliente mensile' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('textbox', { name: 'Settimane' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Togli nuovo cane' }))

    await user.clear(screen.getByRole('textbox', { name: 'Cerca cane' }))
    await user.type(screen.getByRole('textbox', { name: 'Cerca cane' }), 'Rex')
    await user.click(screen.getByRole('button', { name: 'Rex' }))
    expect(screen.getByRole('button', { name: 'Fissa anche il prossimo' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Rendilo cliente mensile' })).toHaveAttribute('aria-pressed', 'false')
    await user.click(screen.getByRole('button', { name: /^Bagno · / }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(storedList(account.uid)).toHaveLength(1)
    expect(storedList(account.uid)[0].seriesId).toBeUndefined()
    expect(storedRex(account.uid)?.clientType).toBe('occasionale')
    expect(storedRex(account.uid)?.recurrenceWeeks).toBeUndefined()
  })

  it('nuovo cane dal foglio non cambia pagina, ha il nome compilato e nasce al salvataggio', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/appuntamenti/nuovo?data=2026-10-03" />)
    await user.type(await screen.findByRole('textbox', { name: 'Cerca cane' }), 'Birba')
    await user.click(await screen.findByRole('button', { name: '+ Nuovo cane "Birba"' }))
    expect(await screen.findByRole('textbox', { name: 'Nome' })).toHaveValue('Birba')
    expect(screen.getByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Proprietario' }), 'Lea')
    await user.type(screen.getByRole('textbox', { name: 'Telefono' }), '333')
    expect(localStorage.getItem(storageKeys.dogs(account.uid))).toBeNull()
    await user.click(screen.getByRole('button', { name: /^Bagno · / }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('heading', { name: 'Ottobre 2026' })).toBeInTheDocument()
    const dogs = Object.values(JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!) as Record<string, { name: string; contact: { name: string; phone: string } }>)
    expect(dogs).toHaveLength(1)
    expect(dogs[0]).toMatchObject({ name: 'Birba', contact: { name: 'Lea', phone: '333' } })
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
    expect(await screen.findByText('1 cane · 30m stimate · 1 mordace')).toBeInTheDocument()
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
    expect(screen.getByRole('button', { name: '11:00' })).toHaveAttribute('aria-pressed', 'true')
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

  it('il rilascio del trascinamento su un’ora vuota non apre un nuovo appuntamento', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 5, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05" />)
    const block = await screen.findByRole('button', { name: 'Apri Rex' })
    fireEvent.pointerDown(block, { pointerId: 1, clientX: 20, clientY: 10 })
    fireEvent.pointerMove(block, { pointerId: 1, clientX: 20, clientY: 88 })
    fireEvent.pointerUp(block, { pointerId: 1, clientX: 20, clientY: 88 })
    expect(screen.getByRole('status')).toHaveTextContent('Spostato alle 10:00')
    await Promise.resolve()
    fireEvent.click(screen.getByRole('button', { name: 'Nuovo Lunedì 5 ottobre alle 10:00' }))
    expect(screen.queryByRole('heading', { name: 'Nuovo appuntamento' })).not.toBeInTheDocument()
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
