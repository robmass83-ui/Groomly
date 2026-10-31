// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ComponentProps } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { AppointmentRow } from '../components/domain/AppointmentRow'
import { completeAppointment, createAppointment, setAppointmentStatus } from '../data/local/appointments'
import { saveClosureLocal } from '../data/local/closures'
import { createAccount, getAccount } from '../data/local/auth'
import { archiveDog, createDog } from '../data/local/dogs'
import { storageKeys, writeJson } from '../data/local/storage'
import { contentMinHeightPx, EMPTY_HOUR_PX } from '../lib/calendarLayout'
import { oraRoma } from '../lib/disponibilita'
import type { Appointment, AppointmentWrite, DogWrite, Service } from '../types/models'
import { AppointmentForm } from './AppointmentForm'

const salonDesk = vi.hoisted(() => ({
  access: {
    enabled: false,
    members: [] as Array<{
      uid: string
      email: string
      role: 'titolare' | 'socio' | 'collaboratore'
      firstName: string
      lastName: string
      status: 'attivo' | 'revocato'
    }>,
    openInviteExpiries: [] as string[],
  },
}))

vi.mock('../data/firebase/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data/firebase/client')>()
  return {
    ...actual,
    watchSalonAccess: async (_salonId: string, onChange: (access: typeof salonDesk.access) => void) => {
      onChange(salonDesk.access)
      return () => {}
    },
  }
})

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
  beforeEach(() => {
    localStorage.clear()
    salonDesk.access = { enabled: false, members: [], openInviteExpiries: [] }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('in Home mostra solo gli appuntamenti di oggi', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 19, 9, 30, 0, 0))
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex', { criticalNote: 'Morde' }))
    const today = new Date(2026, 9, 19, 9, 0, 0, 0)
    const other = new Date(2026, 9, 20, 9, 0, 0, 0)
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
    expect(screen.getByText('Taglio / tosatura')).toBeInTheDocument()
    expect(screen.getByText('Gestione nodi')).toBeInTheDocument()
    expect(screen.getByText('Bagno').parentElement?.getAttribute('style')).toContain('flex-wrap: wrap')
    expect(screen.queryByText('+1')).not.toBeInTheDocument()
    expect(screen.queryByText('Domani')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Avviso critico')).toBeInTheDocument()
    try {
      await user.click(screen.getByRole('button', { name: 'Apri Rex' }))
      expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
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

  it('l’ospite senza profilo resta apribile e mostra che è da confermare', () => {
    const start = new Date(2026, 9, 3, 9, 0, 0, 0)
    const scadeIl = '2026-10-03T16:30:00.000Z'
    const ora = oraRoma(new Date(scadeIl))
    render(
      <MemoryRouter>
        <AppointmentRow
          appointment={appointment(start, { dogId: '', ospiteNome: 'Rex', provvisorio: true, scadeIl })}
          dog={undefined}
          services={[]}
        />
      </MemoryRouter>,
    )
    const riga = screen.getByRole('button', { name: /Rex/ })
    expect(riga).not.toBeDisabled()
    expect(riga).toHaveTextContent(`Da confermare · entro le ${ora}`)
    expect(screen.queryByText('30m')).not.toBeInTheDocument()
    expect(screen.queryByText('Bagno')).not.toBeInTheDocument()

    cleanup()
    render(
      <MemoryRouter>
        <AppointmentRow appointment={appointment(start, { dogId: '' })} dog={undefined} services={[]} />
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
    await user.click(screen.getByRole('button', { name: 'Giorno successivo' }))
    expect(screen.getByRole('button', { name: 'Seleziona Martedì 6 ottobre', pressed: true })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ottobre 2026' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Seleziona Lunedì 5 ottobre' })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Mese' }))
    await user.click(screen.getByRole('button', { name: 'Mese successivo' }))
    expect(screen.getByRole('heading', { name: 'Novembre 2026' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apri Rex' })).not.toBeInTheDocument()
    expect(screen.getByText('0 cani · 0m stimate')).toBeInTheDocument()
    expect(screen.queryByText('Lunedì 5 ottobre')).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Listino' }))
    expect(await screen.findByRole('heading', { name: 'Listino prezzi' })).toBeInTheDocument()
    expect(screen.queryByText('In arrivo')).not.toBeInTheDocument()
    expect(screen.getAllByText('Bagno').length).toBeGreaterThan(0)
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
    await user.click(await screen.findByRole('button', { name: 'Modifica appuntamento' }))
    await user.click(screen.getByRole('button', { name: '10:00' }))
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(screen.getByText('Chiudere senza salvare?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Chiudi senza salvare' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const stored = () => JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { start: string }>
    expect(new Date(stored()[created.id].start).getHours()).toBe(9)
    await user.click(screen.getByRole('button', { name: 'Apri Rex' }))
    await user.click(await screen.findByRole('button', { name: 'Modifica appuntamento' }))
    await user.click(screen.getByRole('button', { name: '10:00' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await within(screen.getByRole('dialog', { name: 'Appuntamento' })).findByText(/fino 10:30/)).toBeInTheDocument()
    expect(new Date(stored()[created.id].start).getHours()).toBe(10)
  })

  it('i servizi di una visita chiusa non si cambiano dalla scheda, quelli in programma sì', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const linea = [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }]
    const aperta = createAppointment(account.uid, { dogId: rex.id, start: new Date(2026, 9, 3, 9, 0, 0, 0), services: linea })
    const chiusa = createAppointment(account.uid, { dogId: rex.id, start: new Date(2026, 9, 3, 11, 0, 0, 0), services: linea })
    completeAppointment(account.uid, chiusa.id)
    const user = userEvent.setup()
    const prima = render(<App memory isDev={false} initialPath={`/appuntamenti/${aperta.id}?data=2026-10-03`} />)
    await user.click(await screen.findByRole('button', { name: 'Servizi' }))
    expect(screen.getAllByRole('button', { pressed: true }).length).toBeGreaterThan(0)
    prima.unmount()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${chiusa.id}?data=2026-10-03`} />)
    const servizi = await screen.findByRole('button', { name: 'Servizi' })
    expect(servizi).toBeDisabled()
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0)
  })

  it('modificare l’ora di una visita con nota tiene quella nota', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const created = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 3, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
      extraNotes: [{ id: 'n1', text: 'Si muove tanto', createdAt: new Date('2026-10-01T00:00:00.000Z') }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}?data=2026-10-03`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica appuntamento' }))
    await user.click(screen.getByRole('button', { name: '10:00' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await within(screen.getByRole('dialog', { name: 'Appuntamento' })).findByText(/fino 10:30/)).toBeInTheDocument()
    const stored = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { start: string; extraNotes?: { id: string; text: string; createdAt: string }[] }>
    expect(new Date(stored[created.id].start).getHours()).toBe(10)
    expect(stored[created.id].extraNotes).toEqual([
      { id: 'n1', text: 'Si muove tanto', createdAt: '2026-10-01T00:00:00.000Z' },
    ])
  })

  it('aggiungere una nota in modifica chiede conferma prima di chiudere', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const created = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 3, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}?data=2026-10-03`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica appuntamento' }))
    await user.click(screen.getByRole('button', { name: 'Aggiungi nota' }))
    const dialog = await screen.findByRole('dialog', { name: 'Aggiungi nota' })
    await user.type(within(dialog).getByLabelText('Nota'), 'Si muove tanto')
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    expect(screen.queryByRole('dialog', { name: 'Aggiungi nota' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(screen.getByText('Chiudere senza salvare?')).toBeInTheDocument()
  })

  it('posticipare di 15 minuti tiene il ritmo e non chiede', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex', { clientType: 'mensile' }))
    const covered = new Date(2026, 0, 29, 9, 30, 0, 0)
    const created = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 0, 20, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
      cycleAnchor: 'ritmo',
      coveredDue: covered,
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Posticipa +15' }))
    expect(screen.queryByRole('heading', { name: 'Cane Mensile' })).not.toBeInTheDocument()
    const stored = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[created.id] as { start: string; cycleAnchor?: string; coveredDue?: string }
    expect(new Date(stored.start).getMinutes()).toBe(45)
    expect(stored.cycleAnchor).toBe('ritmo')
    expect(stored.coveredDue).toBe(covered.toISOString())
  })

  it('si sovrappone: Salva chiede conferma, poi salva, e la cancellazione apre il giorno', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 3, 8, 0, 0, 0))
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
    await user.click(await screen.findByRole('button', { name: 'Modifica appuntamento' }))
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

  it('il profilo non ha i pulsanti per fissare e mostra il prossimo appuntamento', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const domani = new Date()
    domani.setDate(domani.getDate() + 1)
    domani.setHours(9, 30, 0, 0)
    createAppointment(account.uid, {
      dogId: rex.id,
      start: domani,
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    render(<App memory isDev={false} initialPath={`/animali/${rex.id}`} />)
    expect(await screen.findByRole('button', { name: 'Fissa appuntamento' })).toBeInTheDocument()
    expect(screen.getByText(/Prossimo:/)).toBeInTheDocument()
    for (const name of ['+2 sett', '+4 sett', '+6 sett', 'Fissa il prossimo', 'Data…']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
    expect(screen.queryByRole('heading', { name: 'Appuntamento già fissato' })).not.toBeInTheDocument()
  })

  it('senza appuntamenti il profilo dice Nessun appuntamento', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    render(<App memory isDev={false} initialPath={`/animali/${rex.id}`} />)
    expect(await screen.findByText('Nessun appuntamento')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+4 sett' })).not.toBeInTheDocument()
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

  it('in prenotazione una nota va sulla visita e non sul cane', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = await pickRex(account.uid, { criticalNote: 'Mordace' })
    expect(screen.getByText('Mordace')).toBeInTheDocument()
    expect(screen.queryByText('altro')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Aggiungi nota' }))
    const dialog = await screen.findByRole('dialog', { name: 'Aggiungi nota' })
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    expect(screen.getByRole('dialog', { name: 'Aggiungi nota' })).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText('Nota'), 'Si muove tanto')
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    expect(screen.queryByRole('dialog', { name: 'Aggiungi nota' })).not.toBeInTheDocument()
    expect(screen.getByText('Si muove tanto')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    const visits = Object.values(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { extraNotes?: { text: string }[] }>)
    expect(visits.some((item) => item.extraNotes?.some((note) => note.text === 'Si muove tanto'))).toBe(true)
    const dogs = Object.values(JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!) as Record<string, { extraNotes?: unknown }>)
    expect(dogs.every((item) => item.extraNotes === undefined)).toBe(true)
  })

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

  it('su un occasionale con una nota la prima visita la tiene e la seconda no', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = await pickRex(account.uid)
    await user.click(screen.getByRole('button', { name: 'Aggiungi nota' }))
    const dialog = await screen.findByRole('dialog', { name: 'Aggiungi nota' })
    await user.type(within(dialog).getByLabelText('Nota'), 'Si muove tanto')
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    await user.click(screen.getByRole('button', { name: 'Fissa anche il prossimo' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    const items = storedList(account.uid) as { start: string; extraNotes?: { text: string }[] }[]
    expect(items).toHaveLength(2)
    expect(new Date(items[0].start)).toEqual(new Date(2026, 9, 15, 10, 0, 0, 0))
    expect(new Date(items[1].start)).toEqual(new Date(2026, 10, 12, 10, 0, 0, 0))
    expect(items[0].extraNotes?.map((note) => note.text)).toEqual(['Si muove tanto'])
    expect(items[1].extraNotes).toBeUndefined()
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

  it('un mensile non prenota da solo il prossimo; acceso, N aggiorna la frequenza', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = await pickRex(account.uid, { clientType: 'mensile', recurrenceWeeks: 4 })
    expect(screen.getByRole('button', { name: 'Fissa anche il prossimo' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('textbox', { name: 'Settimane' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rendilo cliente mensile' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Fissa anche il prossimo' }))
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
  }, 15000)

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
    const compact = screen.getByRole('button', { name: 'Apri Rex' })
    expect(within(compact).getByText('Morde')).toBeInTheDocument()
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
    const block = await screen.findByRole('button', { name: 'Apri Rex' })
    expect(block.getAttribute('style')).not.toContain('var(--sen)')
    expect(within(block).getByText('Bagno + taglio').getAttribute('style')).toContain('var(--s-combo)')
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
    const block = await screen.findByRole('button', { name: 'Apri Rex' })
    expect(block).toBeInTheDocument()
    expect(within(block).getByText('Rex')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Bravo' })).toBeInTheDocument()
    expect(within(block).queryByText('Bagno')).not.toBeInTheDocument()
    expect(within(block).getByRole('img', { name: 'Bagno' })).toHaveAttribute('width', '13')
    expect(screen.queryByRole('grid', { name: 'Orari' })).not.toBeInTheDocument()
  })

  it('nel giorno la card corta mostra tutte le chip e non si comprime, come quella da un’ora', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const corta = createDog(account.uid, dog('Bella Rosa'))
    const intera = createDog(account.uid, dog('Luna'))
    createAppointment(account.uid, {
      dogId: corta.id,
      start: new Date(2026, 9, 5, 9, 0, 0, 0),
      services: [
        { serviceId: 'bagno', name: 'Bagno', durationMin: 25, price: 20 },
        { serviceId: 'taglio', name: 'Taglio / tosatura', durationMin: 20, price: 30 },
      ],
    })
    createAppointment(account.uid, {
      dogId: intera.id,
      start: new Date(2026, 9, 5, 11, 0, 0, 0),
      services: [
        { serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 },
        { serviceId: 'taglio', name: 'Taglio / tosatura', durationMin: 30, price: 30 },
      ],
    })
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05" />)
    const compact = await screen.findByRole('button', { name: 'Apri Bella Rosa' })
    expect(within(compact).getByText('Bella Rosa')).toBeInTheDocument()
    expect(within(compact).getByText('Bella Rosa').getAttribute('style') ?? '').not.toContain('ellipsis')
    expect(within(compact).getByText('Bagno')).toBeInTheDocument()
    expect(within(compact).getByText('Taglio / tosatura')).toBeInTheDocument()
    expect(within(compact).queryByText('+1')).not.toBeInTheDocument()
    expect(parseFloat(compact.style.height)).toBeGreaterThan(37.5)
    expect(parseFloat(compact.style.height)).toBeGreaterThanOrEqual(46)
    const full = screen.getByRole('button', { name: 'Apri Luna' })
    expect(within(full).getByText('Bagno')).toBeInTheDocument()
    expect(within(full).getByText('Taglio / tosatura')).toBeInTheDocument()
    expect(within(full).queryByText('+1')).not.toBeInTheDocument()
    expect(within(full).getByText('Bagno').parentElement?.getAttribute('style')).toContain('nowrap')
    expect(parseFloat(full.style.height)).toBeGreaterThanOrEqual(50)
    expect(screen.getByRole('button', { name: 'Seleziona Lunedì 5 ottobre' }).getAttribute('style')).toContain('background: var(--pri-solid)')
  })

  it('nel giorno due schede contigue hanno il bordo e tre pixel di distacco', async () => {
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
      start: new Date(2026, 9, 5, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05" />)
    const first = await screen.findByRole('button', { name: 'Apri Rex' })
    const second = screen.getByRole('button', { name: 'Apri Luna' })
    const slot = contentMinHeightPx({ serviceCount: 1, hasNote: false, hasMark: false, compact: false })
    for (const button of [first, second]) {
      const style = button.getAttribute('style') ?? ''
      expect(style).toContain('border-width: 1px 1px 1px 4px')
      expect(style).toContain('border-style: solid')
      expect(style).toContain('border-color: var(--line) var(--line) var(--line) var(--pri)')
      expect(style).toContain('border-box')
      expect(parseFloat(button.style.height)).toBe(slot - 3)
    }
    const name = within(first).getByText('Rex')
    const time = within(first).getByText('09:00')
    expect(name.parentElement).toBe(time.parentElement)
    expect(name.parentElement?.getAttribute('style') ?? '').toContain('flex-start')
    expect(name.parentElement?.getAttribute('style') ?? '').not.toContain('flex-wrap: wrap')
    expect(parseFloat(second.style.top)).toBeGreaterThan(parseFloat(first.style.top) + parseFloat(first.style.height))
    expect(parseFloat(second.style.height)).toBeGreaterThan(0)
    expect(parseFloat(first.style.height)).toBeLessThan(slot)
  })

  it('nel giorno la chip del servizio è corta, icona e nome sulla stessa riga', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 5, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 60, price: 20 }],
    })
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05" />)
    const block = await screen.findByRole('button', { name: 'Apri Rex' })
    expect(parseFloat(block.style.height)).toBeGreaterThanOrEqual(52)
    const chip = within(block).getByText('Bagno')
    const style = chip.getAttribute('style') ?? ''
    expect(style).toMatch(/font-size:\s*12px/)
    expect(style).toContain('1px 6px')
    expect(style).toMatch(/white-space:\s*nowrap/)
    expect(style).not.toMatch(/min-height:\s*44px/)
    expect(style).not.toContain('height: 44px')
    expect(within(chip).getByRole('img', { name: 'Bagno' })).toBeInTheDocument()
  })

  it('nel giorno le chip che non entrano in riga diventano +N', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const names = ['Lavaggio completo extra', 'Tosatura integrale cane', 'Scioglimento nodi forti', 'Profumo e fiocco grande']
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 5, 9, 0, 0, 0),
      services: names.map((name, index) => ({ serviceId: `s${index}`, name, durationMin: 20, price: 10 })),
    })
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05" />)
    const block = await screen.findByRole('button', { name: 'Apri Rex' })
    const shown = names.filter((name) => within(block).queryByText(name))
    const hidden = names.length - shown.length
    expect(hidden).toBeGreaterThan(0)
    expect(within(block).getByText(`+${hidden}`)).toBeInTheDocument()
    expect(within(block).getByText('Rex')).toBeInTheDocument()
    expect(within(block).getByText('09:00')).toBeInTheDocument()
    expect(shown.every((name, index) => name === names[index])).toBe(true)
    expect(shown.length).toBeGreaterThan(0)
  })

  it('nel giorno un solo servizio lungo resta in chip, senza +1', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const name = 'Lavaggio completo del mantello molto annodato e infeltrito'
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 5, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name, durationMin: 60, price: 20 }],
    })
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05" />)
    const block = await screen.findByRole('button', { name: 'Apri Rex' })
    expect(within(block).queryByText('+1')).not.toBeInTheDocument()
    const chip = within(block).getByText(name)
    expect(chip).toBeInTheDocument()
    expect(within(chip).getByRole('img', { name: 'Bagno' })).toBeInTheDocument()
    expect(within(block).getByText('Rex')).toBeInTheDocument()
    expect(within(block).getByText('09:00')).toBeInTheDocument()
  })

  it('nel giorno un appuntamento di tre ore non allunga la chip e mostra 9, 10 e 11', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 5, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 180, price: 35 }],
    })
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05" />)
    const block = await screen.findByRole('button', { name: 'Apri Rex' })
    expect(parseFloat(block.style.height)).toBeLessThan(120)
    expect(screen.getByText('9:00')).toBeInTheDocument()
    expect(screen.getByText('10:00')).toBeInTheDocument()
    expect(screen.getByText('11:00')).toBeInTheDocument()
    const emptyHour = screen.getByRole('button', { name: 'Nuovo Lunedì 5 ottobre alle 8:00' })
    expect(emptyHour).toBeInTheDocument()
    expect(emptyHour).toHaveStyle({ touchAction: 'pan-y' })
    expect(screen.getByTestId('phone-shell')).toHaveStyle({ overflow: 'hidden', height: '100dvh' })
    expect(screen.queryByRole('button', { name: 'Nuovo Lunedì 5 ottobre alle 9:00' })).not.toBeInTheDocument()
  })

  it('nel giorno l’ora di chiusura non copre l’ultimo segno di una visita fino alle 19', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 5, 16, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 180, price: 35 }],
    })
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05" />)
    await screen.findByRole('button', { name: 'Apri Rex' })
    const last = screen.getByText('18:00')
    const close = screen.getByText('19:00')
    expect(parseFloat(close.style.top)).toBeGreaterThanOrEqual(parseFloat(last.style.top))
    expect(close.getAttribute('style') ?? '').not.toContain('translateY(-100%)')
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

  it('nel mese la lista del giorno sta nella pagina, senza un secondo Aggiungi', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 5, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05&vista=mese" />)
    await user.click(await screen.findByRole('button', { name: 'Lunedì 5 ottobre, 1 appuntamento' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const list = await screen.findByRole('region', { name: 'Appuntamenti Lunedì 5 ottobre' })
    expect(within(list).getByRole('button', { name: 'Apri Rex' })).toBeInTheDocument()
    expect(within(list).queryByRole('button', { name: '+ Aggiungi' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ Aggiungi' })).not.toBeInTheDocument()
  })

  it('scorrere su un appuntamento non lo sposta e il tocco apre la scheda', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const moved = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 5, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05" />)
    const block = await screen.findByRole('button', { name: 'Apri Rex' })
    expect(block.style.touchAction).toBe('pan-y')
    fireEvent.pointerDown(block, { pointerId: 1, clientX: 20, clientY: 10 })
    fireEvent.pointerMove(block, { pointerId: 1, clientX: 20, clientY: 100 })
    fireEvent.pointerUp(block, { pointerId: 1, clientX: 20, clientY: 100 })
    const stored = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { start: string }>
    expect(new Date(stored[moved.id].start).getHours()).toBe(9)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    await user.click(block)
    expect(await screen.findByRole('heading', { name: 'Appuntamento' })).toBeInTheDocument()
  })

  it('in settimana il click su Apri Rex non cambia la data salvata', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const created = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 5, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05&vista=settimana" />)
    await user.click(await screen.findByRole('button', { name: 'Apri Rex' }))
    const stored = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { start: string }>
    const start = new Date(stored[created.id].start)
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(9)
    expect(start.getDate()).toBe(5)
    expect(start.getHours()).toBe(9)
    expect(start.getMinutes()).toBe(0)
  })

  it('le frecce del giorno spostano di un giorno', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-11" />)
    await user.click(await screen.findByRole('button', { name: 'Giorno successivo' }))
    expect(await screen.findByRole('button', { name: 'Seleziona Lunedì 12 ottobre', pressed: true })).toBeInTheDocument()
  })

  it('le frecce della settimana spostano di sette giorni', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-11&vista=settimana" />)
    await user.click(await screen.findByRole('button', { name: 'Settimana successiva' }))
    expect(await screen.findByRole('button', { name: 'Seleziona Domenica 18 ottobre', pressed: true })).toBeInTheDocument()
  })

  it('lo swipe a sinistra sulla griglia vuota passa al giorno dopo', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-11" />)
    const grid = await screen.findByRole('grid', { name: 'Orari' })
    fireEvent.pointerDown(grid, { pointerId: 1, clientX: 200, clientY: 100 })
    fireEvent.pointerUp(grid, { pointerId: 1, clientX: 100, clientY: 110 })
    expect(await screen.findByRole('button', { name: 'Seleziona Lunedì 12 ottobre', pressed: true })).toBeInTheDocument()
  })

  it('lo swipe sulla settimana cambia settimana e il numero in testata', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-11&vista=settimana" />)
    expect(await screen.findByRole('heading', { name: /Ottobre 2026/ })).toHaveTextContent('Settimana 41')
    const week = screen.getByRole('region', { name: 'Settimana' })
    fireEvent.pointerDown(week, { pointerId: 1, clientX: 200, clientY: 80 })
    fireEvent.pointerUp(week, { pointerId: 1, clientX: 100, clientY: 88 })
    expect(await screen.findByRole('button', { name: 'Seleziona Domenica 18 ottobre', pressed: true })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Ottobre 2026/ })).toHaveTextContent('Settimana 42')
    fireEvent.pointerDown(week, { pointerId: 1, clientX: 80, clientY: 80 })
    fireEvent.pointerUp(week, { pointerId: 1, clientX: 180, clientY: 90 })
    expect(await screen.findByRole('button', { name: 'Seleziona Domenica 11 ottobre', pressed: true })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Ottobre 2026/ })).toHaveTextContent('Settimana 41')
  })

  it('lo swipe sul mese cambia mese', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-11&vista=mese" />)
    const month = await screen.findByRole('grid', { name: 'Mese' })
    fireEvent.pointerDown(month, { pointerId: 1, clientX: 200, clientY: 80 })
    fireEvent.pointerUp(month, { pointerId: 1, clientX: 80, clientY: 90 })
    expect(await screen.findByRole('heading', { name: 'Novembre 2026' })).toBeInTheDocument()
    fireEvent.pointerDown(screen.getByRole('grid', { name: 'Mese' }), { pointerId: 1, clientX: 40, clientY: 80 })
    fireEvent.pointerUp(screen.getByRole('grid', { name: 'Mese' }), { pointerId: 1, clientX: 160, clientY: 88 })
    expect(await screen.findByRole('heading', { name: 'Ottobre 2026' })).toBeInTheDocument()
  })

  it('il mese mostra il tondo verde col conteggio e non sulla cella vuota', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 10, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-11&vista=mese" />)
    const busy = await screen.findByRole('button', { name: 'Sabato 10 ottobre, 1 appuntamento' })
    const badge = busy.querySelector('[data-badge]')
    expect(badge?.textContent).toBe('1')
    expect(badge?.getAttribute('style')).toContain('background: var(--ok)')
    expect(screen.getByRole('button', { name: 'Venerdì 9 ottobre' }).querySelector('[data-badge]')).toBeNull()
  })

  it('il mese affianca il tondo verde delle visite e il tondo caldo dei personali, e il riepilogo non conta il personale', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 10, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    createAppointment(account.uid, {
      dogId: '',
      start: new Date(2026, 9, 10, 18, 0, 0, 0),
      services: [],
      kind: 'personale',
      title: 'Dentista',
    })
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-10&vista=mese" />)
    const cell = await screen.findByRole('button', { name: 'Sabato 10 ottobre, 1 appuntamento, 1 appuntamento personale' })
    const salon = cell.querySelector('[data-badge]')
    const personal = cell.querySelector('[data-personal-badge]')
    expect(salon?.textContent).toBe('1')
    expect(salon?.getAttribute('style')).toContain('background: var(--ok)')
    expect(salon?.getAttribute('style')).toContain('color: var(--on-pri)')
    expect(personal?.textContent).toBe('1')
    expect(personal?.getAttribute('style')).toContain('background: var(--personal)')
    expect(personal?.getAttribute('style')).toContain('color: var(--on-pri)')
    expect(screen.getByText('1 cane · 30m stimate')).toBeInTheDocument()
    expect(screen.queryByText(/2 cani/)).not.toBeInTheDocument()
  })

  it('un giorno di Ferie mostra Chiuso e, nel giorno, la fascia apre la chiusura', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const stamp = new Date(2026, 9, 1, 0, 0, 0, 0)
    saveClosureLocal(account.uid, {
      id: 'ferie',
      reason: 'Ferie',
      startDay: '2026-10-13',
      endDay: '2026-10-13',
      createdAt: stamp,
      updatedAt: stamp,
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-12&vista=mese" />)
    const closed = await screen.findByRole('button', { name: 'Martedì 13 ottobre, salone chiuso, Ferie' })
    expect(within(closed).getByText('Chiuso')).toBeInTheDocument()
    expect(closed.getAttribute('style') ?? '').toContain('var(--closed)')
    await user.click(screen.getByRole('radio', { name: 'Giorno' }))
    await user.click(screen.getByRole('button', { name: 'Seleziona Martedì 13 ottobre' }))
    const banner = screen.getByRole('button', { name: 'Apri chiusura Ferie' })
    expect(banner).toHaveTextContent('Salone chiuso · Ferie')
    const column = document.querySelector('[data-day-column="2026-10-13"]')
    expect(column?.getAttribute('style') ?? '').toContain('var(--closed)')
    await user.click(banner)
    expect(await screen.findByRole('heading', { name: 'Chiusura del salone' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ottobre 2026', hidden: true })).toBeInTheDocument()
  })

  it('il personale alle 18:00 senza fine non dichiara le 19:00 e con fine mostra l’intervallo', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createAppointment(account.uid, {
      dogId: '',
      start: new Date(2026, 9, 5, 18, 0, 0, 0),
      services: [],
      kind: 'personale',
      title: 'Dentista',
    })
    const user = userEvent.setup()
    const first = render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05" />)
    const open = await screen.findByRole('button', { name: 'Apri Dentista' })
    expect(within(open).queryByText('18:00–19:00')).not.toBeInTheDocument()
    expect(within(open).queryByText(/19:00/)).not.toBeInTheDocument()
    expect(within(open).getByText('18:00')).toBeInTheDocument()
    expect(parseFloat(open.style.height)).toBeLessThan(50)
    await user.click(open)
    expect(await screen.findByRole('heading', { name: 'Appuntamento personale' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ottobre 2026', hidden: true })).toBeInTheDocument()
    first.unmount()

    createAppointment(account.uid, {
      dogId: '',
      start: new Date(2026, 9, 6, 18, 0, 0, 0),
      services: [],
      kind: 'personale',
      title: 'Dentista',
      plannedEnd: new Date(2026, 9, 6, 19, 0, 0, 0),
    })
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-06" />)
    const ranged = await screen.findByRole('button', { name: 'Apri Dentista' })
    expect(within(ranged).getByText('18:00–19:00')).toBeInTheDocument()
  })

  it('il personale dalle 18:00 alle 20:00 copre due ore vuote', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createAppointment(account.uid, {
      dogId: '',
      start: new Date(2026, 9, 7, 18, 0, 0, 0),
      services: [],
      kind: 'personale',
      title: 'Dentista',
      plannedEnd: new Date(2026, 9, 7, 20, 0, 0, 0),
    })
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-07" />)
    const block = await screen.findByRole('button', { name: 'Apri Dentista' })
    expect(within(block).getByText('18:00–20:00')).toBeInTheDocument()
    expect(parseFloat(block.style.height)).toBeGreaterThanOrEqual(EMPTY_HOUR_PX * 2 - 3)
  })

  it('la settimana mostra Dentista senza sticker del carattere', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createAppointment(account.uid, {
      dogId: '',
      start: new Date(2026, 9, 5, 18, 0, 0, 0),
      services: [],
      kind: 'personale',
      title: 'Dentista',
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05&vista=settimana" />)
    const card = await screen.findByRole('button', { name: 'Apri Dentista' })
    expect(within(card).getByText('Dentista')).toBeInTheDocument()
    expect(within(card).queryByRole('img')).not.toBeInTheDocument()
    await user.click(card)
    expect(await screen.findByRole('heading', { name: 'Appuntamento personale' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Ottobre 2026/, hidden: true })).toBeInTheDocument()
  })

  it('Elimina non sta accanto a Modifica', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const created = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 11, 10, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    expect(await screen.findByRole('button', { name: 'Modifica appuntamento' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Elimina' })).not.toBeInTheDocument()
  })

  it('un mensile fuori scadenza chiede il ritmo e Annulla non scrive', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 0, 10, 12, 0, 0, 0))
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex', { clientType: 'mensile', recurrenceWeeks: 4 }))
    completeAppointment(account.uid, createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 0, 1, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    }).id)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/nuovo?cane=${rex.id}`} />)
    expect(await screen.findByRole('button', { name: /^Bagno · / })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.change(screen.getByLabelText('Giorno'), { target: { value: '2026-01-20' } })
    await user.click(screen.getByRole('button', { name: '09:30' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    const choice = await screen.findByRole('dialog', { name: 'Cane Mensile' })
    expect(choice.parentElement).toHaveStyle({ alignItems: 'center', justifyContent: 'center' })
    expect(within(choice).getByRole('heading', { name: 'Cane Mensile' })).toBeInTheDocument()
    expect(within(choice).getByText('Far ripartire la frequenza mensile da questa data?')).toBeInTheDocument()
    expect(within(choice).getByRole('button', { name: 'Sì, 4 settimane a partire da questa data' })).toBeInTheDocument()
    expect(within(choice).getByRole('button', { name: 'No, tiene la frequenza impostata con la data precedente' })).toBeInTheDocument()
    await user.click(within(choice).getByRole('button', { name: 'Chiudi' }))
    expect(screen.queryByRole('heading', { name: 'Cane Mensile' })).not.toBeInTheDocument()
    const before = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string }>
    expect(Object.values(before).filter((item) => item.status === 'programmato')).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    await user.click(await screen.findByRole('button', { name: 'Sì, 4 settimane a partire da questa data' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Appuntamento salvato')
    const saved = Object.values(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string; cycleAnchor?: string; coveredDue?: string }>)
      .find((item) => item.status === 'programmato')
    expect(saved?.cycleAnchor).toBe('visita')
    expect(saved?.coveredDue).toBe(new Date(2026, 0, 29, 9, 30, 0, 0).toISOString())
    vi.useRealTimers()
  })

  it('il giorno della scadenza salva senza domanda', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 0, 10, 12, 0, 0, 0))
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex', { clientType: 'mensile' }))
    completeAppointment(account.uid, createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 0, 1, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    }).id)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/nuovo?cane=${rex.id}`} />)
    expect(await screen.findByRole('button', { name: /^Bagno · / })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.change(screen.getByLabelText('Giorno'), { target: { value: '2026-01-29' } })
    await user.click(screen.getByRole('button', { name: '11:00' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Appuntamento salvato')
    expect(screen.queryByRole('heading', { name: 'Cane Mensile' })).not.toBeInTheDocument()
    const saved = Object.values(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string; cycleAnchor?: string }>)
      .find((item) => item.status === 'programmato')
    expect(saved?.cycleAnchor).toBeUndefined()
    vi.useRealTimers()
  })

  it('il secondo appuntamento dello stesso salvataggio non copia la scelta', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 0, 10, 12, 0, 0, 0))
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex', { clientType: 'mensile', recurrenceWeeks: 4 }))
    completeAppointment(account.uid, createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 0, 1, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    }).id)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/nuovo?cane=${rex.id}`} />)
    expect(await screen.findByRole('button', { name: /^Bagno · / })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.change(screen.getByLabelText('Giorno'), { target: { value: '2026-01-20' } })
    await user.click(screen.getByRole('button', { name: '09:30' }))
    await user.click(screen.getByRole('button', { name: 'Fissa anche il prossimo' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    await user.click(await screen.findByRole('button', { name: 'No, tiene la frequenza impostata con la data precedente' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Appuntamento salvato')
    const items = Object.values(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string; start: string; cycleAnchor?: string }>)
      .filter((item) => item.status === 'programmato')
      .sort((a, b) => a.start.localeCompare(b.start))
    expect(items).toHaveLength(2)
    expect(items[0].cycleAnchor).toBe('ritmo')
    expect(items[1].cycleAnchor).toBeUndefined()
    vi.useRealTimers()
  })

  it('in inglese il nuovo appuntamento ha titolo e pulsante e il nome del cane resta', async () => {
    localStorage.setItem('groomly.lingua', 'en')
    const account = await createAccount('maria-en@salone.it', 'segretissimo')
    createDog(account.uid, dog('Luna'))
    render(<App memory isDev={false} initialPath="/appuntamenti/nuovo" />)
    expect(await screen.findByRole('heading', { name: 'New appointment' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    const user = userEvent.setup()
    await user.type(screen.getByRole('textbox', { name: 'Search dogs' }), 'Luna')
    expect(await screen.findByText('Luna')).toBeInTheDocument()
    cleanup()
    localStorage.clear()
    localStorage.setItem('groomly.lingua', 'en')
    await createAccount('vuoto-app@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/appuntamenti/assente" />)
    expect(await screen.findByRole('heading', { name: 'Appointment' })).toBeInTheDocument()
    expect(screen.getByText('Appointment missing')).toBeInTheDocument()
  })
})

const BAGNO = { serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }
const LUNGO = { serviceId: 'bagno', name: 'Bagno', durationMin: 90, price: 20 }
const PAST = '/calendario?data=2020-01-06'

function when(hour: number, minute = 0): Date {
  return new Date(2020, 0, 6, hour, minute, 0, 0)
}

function owned(name: string, owner: string, breed = 'Maltese'): DogWrite {
  return dog(name, { breed, contact: { name: owner, phone: '333' } })
}

describe('calendario disegnato', () => {
  beforeEach(() => {
    localStorage.clear()
    salonDesk.access = { enabled: false, members: [], openInviteExpiries: [] }
  })

  it('in settimana un appuntamento senza sovrapposizioni mostra le prime lettere', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const ercole = createDog(account.uid, dog('Ercole'))
    createAppointment(account.uid, { dogId: ercole.id, start: when(10), services: [LUNGO] })
    render(<App memory isDev={false} initialPath={`${PAST}&vista=settimana`} />)
    expect(await screen.findByText('Ercole')).toBeTruthy()
    expect(screen.queryByText('E')).toBeNull()
  })

  it('in settimana un blocco diviso mostra le iniziali, o il mark se c’è un omonimo', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const bella = createDog(account.uid, dog('Bella Rosa'))
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, { dogId: bella.id, start: when(10), services: [LUNGO] })
    createAppointment(account.uid, { dogId: rex.id, start: when(10, 30), services: [LUNGO] })
    render(<App memory isDev={false} initialPath={`${PAST}&vista=settimana`} />)
    expect(await screen.findByText('Bella Rosa')).toBeTruthy()
    expect(screen.getByText('Rex')).toBeTruthy()
  })

  it('in settimana un blocco diviso con un omonimo mostra il mark troncato, non una lettera', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const uno = createDog(account.uid, owned('Luna', 'Mario Bianchi'))
    const due = createDog(account.uid, owned('Luna', 'Anna Usai'))
    createAppointment(account.uid, { dogId: uno.id, start: when(10), services: [LUNGO] })
    createAppointment(account.uid, { dogId: due.id, start: when(10, 30), services: [LUNGO] })
    render(<App memory isDev={false} initialPath={`${PAST}&vista=settimana`} />)
    const cards = await screen.findAllByRole('button', { name: 'Apri Luna' })
    expect(cards).toHaveLength(2)
    expect(screen.getAllByText('Luna')).toHaveLength(2)
  })

  it('in settimana il mark di un omonimo sta su una seconda riga solo se il blocco è alto 32 px', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const uno = createDog(account.uid, owned('Luna', 'Mario Bianchi'))
    const due = createDog(account.uid, owned('Luna', 'Anna Usai'))
    createAppointment(account.uid, { dogId: uno.id, start: when(9), services: [LUNGO] })
    createAppointment(account.uid, { dogId: due.id, start: when(12), services: [BAGNO] })
    render(<App memory isDev={false} initialPath={`${PAST}&vista=settimana`} />)
    expect(await screen.findAllByText('Luna')).toHaveLength(2)
  })

  it('due Luna attive si distinguono e una archiviata no', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const bianchi = createDog(account.uid, owned('Luna', 'Mario Bianchi'))
    const usai = createDog(account.uid, owned('Luna', 'Anna Usai'))
    createAppointment(account.uid, { dogId: bianchi.id, start: when(9), services: [BAGNO] })
    createAppointment(account.uid, { dogId: usai.id, start: when(11), services: [BAGNO] })
    const view = render(<App memory isDev={false} initialPath={PAST} />)
    expect(await screen.findByRole('button', { name: 'Apri Luna, Maltese, Bianchi' })).toBeTruthy()
    expect(within(screen.getByRole('button', { name: 'Apri Luna, Maltese, Bianchi' })).getByText('Maltese · Bianchi')).toBeTruthy()
    view.unmount()

    localStorage.clear()
    const second = await createAccount('maria@salone.it', 'segretissimo')
    const active = createDog(second.uid, owned('Luna', 'Mario Bianchi'))
    const old = createDog(second.uid, owned('Luna', 'Anna Usai'))
    createAppointment(second.uid, { dogId: active.id, start: when(9), services: [BAGNO] })
    createAppointment(second.uid, { dogId: old.id, start: when(11), services: [BAGNO] })
    archiveDog(second.uid, old.id, 'non_in_cura')
    render(<App memory isDev={false} initialPath={PAST} />)
    expect(await screen.findAllByRole('button', { name: /^Apri Luna/ })).toHaveLength(2)
    expect(screen.queryByText(/Bianchi/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Apri Luna, Maltese, Bianchi' })).toBeNull()
  })

  it('tre appuntamenti sovrapposti hanno tre colonne e la linea resta sopra', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const clocks = { Rex: '10:00', Luna: '10:30', Birba: '11:00' } as const
    for (const [name, minute] of [['Rex', 0], ['Luna', 30], ['Birba', 60]] as const) {
      const created = createDog(account.uid, dog(name, name === 'Rex' ? { criticalNote: 'Morde' } : {}))
      createAppointment(account.uid, { dogId: created.id, start: when(10, minute), services: [LUNGO] })
    }
    render(<App memory isDev={false} initialPath={PAST} />)
    const blocks = await screen.findAllByRole('button', { name: /^Apri (Rex|Luna|Birba)$/ })
    expect(blocks.map((item) => item.getAttribute('data-column-count'))).toEqual(['3', '3', '3'])
    expect(blocks.map((item) => item.getAttribute('data-column')).sort()).toEqual(['0', '1', '2'])
    expect(blocks[0].getAttribute('style')).toContain('var(--warn)')
    for (const block of blocks) {
      const name = block.getAttribute('aria-label')?.replace(/^Apri /, '') as keyof typeof clocks
      expect(within(block).getByText('Bagno')).toBeTruthy()
      expect(within(block).getByText(clocks[name])).toBeTruthy()
    }
    expect(within(screen.getByRole('button', { name: 'Apri Rex' })).getByText('Morde')).toBeTruthy()
  })

  it('due appuntamenti che si toccano non si dividono', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const luna = createDog(account.uid, dog('Luna'))
    createAppointment(account.uid, { dogId: rex.id, start: when(10), services: [BAGNO, BAGNO] })
    createAppointment(account.uid, { dogId: luna.id, start: when(11), services: [BAGNO] })
    render(<App memory isDev={false} initialPath={PAST} />)
    expect((await screen.findByRole('button', { name: 'Apri Rex' })).getAttribute('data-column-count')).toBe('1')
    expect(screen.getByRole('button', { name: 'Apri Luna' }).getAttribute('data-column-count')).toBe('1')
  })

  it('nella griglia del giorno il provvisorio resta ambra col nome ospite', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    createAppointment(account.uid, { dogId: luna.id, start: when(11), services: [BAGNO] })
    const start = when(10).toISOString()
    const scadeIl = '2020-01-06T16:30:00.000Z'
    const ora = oraRoma(new Date(scadeIl))
    const stored = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, unknown>
    stored.guest = {
      id: 'guest',
      dogId: '',
      start,
      services: [BAGNO],
      status: 'programmato',
      createdAt: start,
      updatedAt: start,
      provvisorio: true,
      scadeIl,
      richiestaId: 'r1',
      ospiteNome: 'Rex',
    }
    localStorage.setItem(storageKeys.appointments(account.uid), JSON.stringify(stored))
    render(<App memory isDev={false} initialPath={PAST} />)
    const block = await screen.findByRole('button', { name: 'Apri Rex' })
    expect(block).not.toBeDisabled()
    expect(block.getAttribute('style')).toContain('var(--warn-s)')
    expect(block).toHaveTextContent(`Da confermare · entro le ${ora}`)
    expect(within(block).queryByText('Bagno')).not.toBeInTheDocument()
    const definitive = screen.getByRole('button', { name: 'Apri Luna' })
    expect(definitive.getAttribute('style')).toContain('var(--card)')
    expect(definitive.getAttribute('style')).not.toContain('var(--warn-s)')
    expect(within(definitive).getByText('Bagno')).toBeInTheDocument()
    expect(within(definitive).queryByText(/Da confermare/)).not.toBeInTheDocument()
  })

  it('un appuntamento alle 07:00 si vede al suo posto e le ore vuote cliccabili restano 08-19', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, { dogId: rex.id, start: when(7), services: [BAGNO] })
    render(<App memory isDev={false} initialPath={PAST} />)
    expect(await screen.findByRole('button', { name: 'Apri Rex' })).toBeInTheDocument()
    expect(screen.getAllByText('07:00').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: 'Apri Rex' }).style.top).toBe('0px')
    expect(screen.queryByRole('button', { name: /alle 07:00$/ })).toBeNull()
    expect(screen.getByRole('button', { name: /alle 8:00$/ })).toBeInTheDocument()
  })

  it('un blocco molto corto è alto almeno 18 px e la posizione verticale è l’ora esatta', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: when(9, 20),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 5, price: 20 }],
    })
    render(<App memory isDev={false} initialPath={PAST} />)
    const block = await screen.findByRole('button', { name: 'Apri Rex' })
    const height = parseFloat(block.style.height)
    expect(height).toBeGreaterThanOrEqual(18)
    expect(height).toBe(contentMinHeightPx({ serviceCount: 1, hasNote: false, hasMark: false, compact: false }) - 3)
    // 9:20 è il primo segno del gruppo, subito sotto la riga vuota delle 8
    expect(parseFloat(block.style.top)).toBe(EMPTY_HOUR_PX)
  })

  it('nel giorno una card breve con nota non taglia il testo della nota e altro', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna Piccola', {
      criticalNote: 'Sempre pieno di nodi',
    }))
    createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 14, 13, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno + tosatura', durationMin: 30, price: 35 }],
      extraNotes: [{ id: 'n1', text: 'Pelo cortissimo', createdAt: new Date('2026-10-01T00:00:00.000Z') }],
    })
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-14" />)
    const block = await screen.findByRole('button', { name: /Apri Luna Piccola/ })
    expect(within(block).getByText('Sempre pieno di nodi')).toBeInTheDocument()
    expect(screen.getByText('altro')).toBeInTheDocument()
    expect(screen.queryByText('Pelo cortissimo')).not.toBeInTheDocument()
    expect(parseFloat(block.style.height)).toBeGreaterThan(30 * (50 / 60))
    expect(parseFloat(block.style.height)).toBeGreaterThanOrEqual(
      contentMinHeightPx({ serviceCount: 1, hasNote: true, hasMark: false, compact: false }) - 3,
    )
    expect(block.style.overflow).not.toBe('hidden')
  })

  it('un cane con extraNotes e una visita senza note non mostra altro', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna Piccola', {
      criticalNote: 'Sempre pieno di nodi',
      extraNotes: [{ id: 'n1', text: 'Pelo cortissimo', createdAt: new Date('2026-10-01T00:00:00.000Z') }],
    }))
    createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 14, 13, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno + tosatura', durationMin: 30, price: 35 }],
    })
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-14" />)
    const block = await screen.findByRole('button', { name: /Apri Luna Piccola/ })
    expect(within(block).getByText('Sempre pieno di nodi')).toBeInTheDocument()
    expect(within(block).queryByText('altro')).not.toBeInTheDocument()
    expect(within(block).queryByText('Pelo cortissimo')).not.toBeInTheDocument()
  })

  it('nella lista del giorno altro sta accanto al nome e le extraNotes del cane non lo accendono', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna', { criticalNote: 'Sempre pieno di nodi' }))
    const rex = createDog(account.uid, dog('Rex', {
      extraNotes: [{ id: 'old', text: 'Pelo cortissimo', createdAt: new Date('2026-10-01T00:00:00.000Z') }],
    }))
    createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 5, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
      extraNotes: [{ id: 'n1', text: 'Pelo cortissimo', createdAt: new Date('2026-10-01T00:00:00.000Z') }],
    })
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 5, 10, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-05&vista=mese" />)
    await user.click(await screen.findByRole('button', { name: 'Lunedì 5 ottobre, 2 appuntamenti' }))
    const list = await screen.findByRole('region', { name: 'Appuntamenti Lunedì 5 ottobre' })
    const lunaRow = within(list).getByRole('button', { name: 'Apri Luna' })
    const name = within(lunaRow).getByText('Luna')
    const altro = within(lunaRow).getByText('altro')
    expect(name.parentElement?.contains(altro)).toBe(true)
    expect(within(lunaRow).queryByText('Pelo cortissimo')).not.toBeInTheDocument()
    expect(within(lunaRow).queryByText('Sempre pieno di nodi')).not.toBeInTheDocument()
    const rexRow = within(list).getByRole('button', { name: 'Apri Rex' })
    expect(within(rexRow).queryByText('altro')).not.toBeInTheDocument()
    expect(within(rexRow).queryByText('Pelo cortissimo')).not.toBeInTheDocument()
  })

  it('gli avvisi fuori fascia compaiono solo mentre quel tratto non si vede', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const luna = createDog(account.uid, dog('Luna'))
    createAppointment(account.uid, { dogId: rex.id, start: when(7), services: [BAGNO] })
    createAppointment(account.uid, { dogId: luna.id, start: when(19, 30), services: [BAGNO] })
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight')
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 300 })
    try {
      render(<App memory isDev={false} initialPath={PAST} />)
      const grid = await screen.findByRole('grid', { name: 'Orari' })
      // il gruppo delle 7 è alto quanto la chip; le 8:00 stanno subito sotto, più i 10px di margine
      const band = contentMinHeightPx({ serviceCount: 1, hasNote: false, hasMark: false, compact: false })
      expect(grid.scrollTop).toBe(band + 10)
      expect(screen.getByRole('button', { name: '↑ 1 prima delle 8' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '↓ 1 dopo le 19' })).toBeInTheDocument()
      grid.scrollTop = 0
      fireEvent.scroll(grid)
      expect(screen.queryByRole('button', { name: '↑ 1 prima delle 8' })).toBeNull()
      grid.scrollTop = 1000
      fireEvent.scroll(grid)
      expect(screen.queryByRole('button', { name: '↓ 1 dopo le 19' })).toBeNull()
      expect(screen.getByRole('button', { name: '↑ 1 prima delle 8' })).toBeInTheDocument()
    } finally {
      if (original) Object.defineProperty(HTMLElement.prototype, 'clientHeight', original)
      else Reflect.deleteProperty(HTMLElement.prototype, 'clientHeight')
    }
  })

  it('i colori di stato: completato con spunta, da chiudere, disdetto e cane archiviato', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const done = createDog(account.uid, dog('Fatto'))
    const open = createDog(account.uid, dog('Aperto'))
    const gone = createDog(account.uid, dog('Assente'))
    const old = createDog(account.uid, dog('Vecchio'))
    const a = createAppointment(account.uid, { dogId: done.id, start: when(9), services: [BAGNO] })
    createAppointment(account.uid, { dogId: open.id, start: when(10), services: [BAGNO] })
    const c = createAppointment(account.uid, { dogId: gone.id, start: when(11), services: [BAGNO] })
    createAppointment(account.uid, { dogId: old.id, start: when(12), services: [BAGNO] })
    completeAppointment(account.uid, a.id)
    setAppointmentStatus(account.uid, c.id, 'disdetto', 'cliente')
    archiveDog(account.uid, old.id, 'non_in_cura')
    render(<App memory isDev={false} initialPath={PAST} />)
    const fatto = await screen.findByRole('button', { name: 'Apri Fatto' })
    expect(fatto.getAttribute('data-state')).toBe('completato')
    expect(fatto.getAttribute('style')).toContain('var(--ok)')
    expect(within(fatto).getByLabelText('Completato')).toBeInTheDocument()
    const aperto = screen.getByRole('button', { name: 'Apri Aperto' })
    expect(aperto.getAttribute('data-state')).toBe('da-chiudere')
    expect(aperto.getAttribute('style')).toContain('var(--warn)')
    const assente = screen.getByRole('button', { name: 'Apri Assente' })
    expect(assente.getAttribute('data-state')).toBe('disdetto')
    expect(assente.getAttribute('style')).toContain('line-through')
    expect(assente.getAttribute('style')).toContain('var(--tx3)')
    const vecchio = screen.getByRole('button', { name: 'Apri Vecchio' })
    expect(within(vecchio).getByLabelText('Cane archiviato')).toBeInTheDocument()
    expect(vecchio.getAttribute('style')).toContain('var(--tx3)')
  })

  it('il mese non ha la striscia della settimana, mostra il numero e non apre un foglio', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const luna = createDog(account.uid, dog('Luna'))
    createAppointment(account.uid, { dogId: rex.id, start: when(9), services: [BAGNO] })
    createAppointment(account.uid, { dogId: luna.id, start: when(10), services: [BAGNO] })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`${PAST}&vista=mese`} />)
    const cell = await screen.findByRole('button', { name: 'Lunedì 6 gennaio, 2 appuntamenti' })
    expect(within(cell).getByText('2')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Seleziona / })).toBeNull()
    await user.click(cell)
    expect(screen.queryByRole('dialog')).toBeNull()
    const list = screen.getByRole('region', { name: 'Appuntamenti Lunedì 6 gennaio' })
    expect(within(list).getByRole('button', { name: 'Apri Rex' })).toBeInTheDocument()
    expect(within(list).getByRole('button', { name: 'Apri Luna' })).toBeInTheDocument()
  })

  it('sotto il mese Dentista apre il personale e non la scheda del cane', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 10, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    createAppointment(account.uid, {
      dogId: '',
      start: new Date(2026, 9, 10, 18, 0, 0, 0),
      services: [],
      kind: 'personale',
      title: 'Dentista',
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-10&vista=mese" />)
    const list = await screen.findByRole('region', { name: 'Appuntamenti Sabato 10 ottobre' })
    const visit = within(list).getByRole('button', { name: 'Apri Rex' })
    const personal = within(list).getByRole('button', { name: 'Apri Dentista' })
    expect(visit.compareDocumentPosition(personal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(personal).toBeEnabled()
    expect(personal.getAttribute('style')).toContain('background: var(--personal-s)')
    expect(within(personal).getByText('Personale')).toBeInTheDocument()
    expect(within(personal).getByText('Dentista')).toBeInTheDocument()
    expect(within(personal).getByText('18:00')).toBeInTheDocument()
    expect(within(personal).queryByText('Completato')).not.toBeInTheDocument()
    expect(within(personal).queryByText('Non venuto')).not.toBeInTheDocument()
    expect(within(personal).queryByText('Disdetto')).not.toBeInTheDocument()
    expect(within(list).queryByRole('button', { name: 'Apri Cane assente' })).not.toBeInTheDocument()
    await user.click(personal)
    expect(await screen.findByRole('heading', { name: 'Appuntamento personale' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Scheda' })).not.toBeInTheDocument()
  })

  it('sotto il mese il personale con fine mostra l’intervallo', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createAppointment(account.uid, {
      dogId: '',
      start: new Date(2026, 9, 10, 18, 0, 0, 0),
      services: [],
      kind: 'personale',
      title: 'Dentista',
      plannedEnd: new Date(2026, 9, 10, 19, 0, 0, 0),
    })
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-10&vista=mese" />)
    const personal = await screen.findByRole('button', { name: 'Apri Dentista' })
    expect(within(personal).getByText('18:00\u201319:00')).toBeInTheDocument()
  })

  it('sotto il mese un giorno di Ferie senza niente mostra prima la chiusura', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const stamp = new Date(2026, 9, 1)
    saveClosureLocal(account.uid, {
      id: 'ferie',
      reason: 'Ferie',
      startDay: '2026-10-10',
      endDay: '2026-10-10',
      createdAt: stamp,
      updatedAt: stamp,
    })
    render(<App memory isDev={false} initialPath="/calendario?data=2026-10-10&vista=mese" />)
    const list = await screen.findByRole('region', { name: 'Appuntamenti Sabato 10 ottobre' })
    const banner = within(list).getByRole('button', { name: 'Apri chiusura Ferie' })
    const empty = within(list).getByText('Nessun appuntamento')
    expect(banner).toHaveTextContent('Salone chiuso · Ferie')
    expect(banner.compareDocumentPosition(empty) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(list).queryByRole('button', { name: '+ Aggiungi' })).not.toBeInTheDocument()
  })

  function storedAppointments(uid: string): Record<string, { dogId?: string; assigneeUid?: string }> {
    return JSON.parse(localStorage.getItem(storageKeys.appointments(uid)) ?? '{}') as Record<string, { dogId?: string; assigneeUid?: string }>
  }

  it('Chi lo fa: Pro spento non assegna, con Pro si sceglie la persona e la sovrapposizione è sua', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 25, 8, 0, 0, 0))
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/appuntamenti/nuovo" />)
    await user.type(await screen.findByRole('textbox', { name: 'Cerca cane' }), 'Rex')
    await user.click(await screen.findByRole('button', { name: 'Rex' }))
    await user.click(screen.getByRole('button', { name: /^Bagno · / }))
    expect(screen.queryByRole('group', { name: 'Chi lo fa' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    const plain = Object.values(storedAppointments(account.uid))
    expect(plain).toHaveLength(1)
    expect(Object.hasOwn(plain[0], 'assigneeUid')).toBe(false)

    cleanup()
    const luna = createDog(account.uid, dog('Luna'))
    createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 60, price: 20 }],
      assigneeUid: 'giulia',
    })
    salonDesk.access = {
      enabled: true,
      openInviteExpiries: [],
      members: [
        { uid: account.uid, email: 'maria@salone.it', role: 'titolare', firstName: 'Maria', lastName: 'Rossi', status: 'attivo' },
        { uid: 'giulia', email: 'giulia@salone.it', role: 'collaboratore', firstName: 'Giulia', lastName: 'Neri', status: 'attivo' },
      ],
    }
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-key')
    const client = await import('../data/firebase/client')
    const watchAuth = vi.spyOn(client, 'watchAuth').mockImplementation(async () => () => {})
    const listenClosures = vi.spyOn(client, 'listenClosures').mockImplementation(async () => () => {})
    try {
      render(<App memory isDev={false} initialPath="/appuntamenti/nuovo?data=2026-10-03" />)
      const who = await screen.findByRole('group', { name: 'Chi lo fa' })
      expect(within(who).getByRole('button', { name: 'Maria Rossi' })).toHaveAttribute('aria-pressed', 'true')
      expect(within(who).getByRole('button', { name: 'Giulia Neri' })).toHaveAttribute('aria-pressed', 'false')
      await user.type(screen.getByRole('textbox', { name: 'Cerca cane' }), 'Rex')
      await user.click(await screen.findByRole('button', { name: 'Rex' }))
      const bagno = screen.getByRole('button', { name: /^Bagno · / })
      if (bagno.getAttribute('aria-pressed') !== 'true') await user.click(bagno)
      expect(screen.queryByText('Si sovrappone a Luna 09:00–10:00')).not.toBeInTheDocument()
      const hours = screen.getByRole('group', { name: 'Ora' })
      expect(within(hours).getByRole('button', { name: '09:00' })).not.toHaveAttribute('data-busy')
      await user.click(within(who).getByRole('button', { name: 'Giulia Neri' }))
      expect(within(who).getByRole('button', { name: 'Giulia Neri' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByText('Si sovrappone a Luna 09:00–10:00')).toBeInTheDocument()
      expect(within(hours).getByRole('button', { name: '09:00' })).toHaveAttribute('data-busy', 'true')
      await user.click(within(hours).getByRole('button', { name: '11:00' }))
      expect(screen.queryByText('Si sovrappone a Luna 09:00–10:00')).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Salva' }))
      expect(await screen.findByRole('heading', { name: 'Ottobre 2026' })).toBeInTheDocument()
      const ofRex = Object.values(storedAppointments(account.uid)).filter((item) => item.dogId === rex.id)
      expect(ofRex).toHaveLength(2)
      expect(ofRex.filter((item) => item.assigneeUid === 'giulia')).toHaveLength(1)
      expect(ofRex.filter((item) => !Object.hasOwn(item, 'assigneeUid'))).toHaveLength(1)
    } finally {
      watchAuth.mockRestore()
      listenClosures.mockRestore()
      vi.unstubAllEnvs()
      vi.useRealTimers()
    }
  })

  it('Chi lo fa: un personale nuovo salva chi lo crea e non mostra la riga', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/appuntamenti/personale/nuovo" />)
    const sheet = await screen.findByRole('dialog', { name: 'Appuntamento personale' })
    expect(within(sheet).queryByRole('group', { name: 'Chi lo fa' })).not.toBeInTheDocument()
    await user.type(within(sheet).getByLabelText('Titolo'), 'Dentista')
    fireEvent.change(within(sheet).getByLabelText('Data'), { target: { value: '2026-10-21' } })
    fireEvent.change(within(sheet).getByLabelText('Ora di inizio'), { target: { value: '18:00' } })
    await user.click(within(sheet).getByRole('button', { name: 'Salva' }))
    const saved = Object.values(storedAppointments(account.uid))
    expect(saved).toHaveLength(1)
    expect(saved[0].assigneeUid).toBe(account.uid)
  })

  it('Chi lo fa: il collaboratore su un completato non cambia persona, senza ruolo sì', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    writeJson(storageKeys.auth, { ...account, role: 'collaboratore', salonId: account.uid })
    const rex = createDog(account.uid, dog('Rex'))
    const created = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 3, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
      assigneeUid: 'titolare-1',
    })
    const done = completeAppointment(account.uid, created.id)
    const stamp = new Date(2026, 9, 1, 0, 0, 0, 0)
    const bagno: Service = {
      id: 'bagno', name: 'Bagno', kind: 'principale', order: 0, active: true, createdAt: stamp, updatedAt: stamp,
      durationMin: { piccola: 30, media: 45, grande: 60 },
      price: { piccola: 20, media: 28, grande: 38 },
    }
    const members = [
      { uid: 'titolare-1', email: 'maria@salone.it', role: 'titolare' as const, firstName: 'Maria', lastName: 'Rossi', status: 'attivo' as const },
      { uid: account.uid, email: 'giulia@salone.it', role: 'collaboratore' as const, firstName: 'Giulia', lastName: 'Neri', status: 'attivo' as const },
    ]
    const writes: AppointmentWrite[] = []
    function openForm() {
      const stored = getAccount()
      if (!stored) throw new Error('account assente')
      const role = stored.role === 'socio' || stored.role === 'collaboratore' ? stored.role : 'titolare'
      const props = {
        dogs: [rex],
        services: [bagno],
        appointments: [done],
        ignoreId: done.id,
        initial: { dogId: rex.id, serviceIds: ['bagno'], day: '2026-10-03', time: '09:00' },
        onSubmit: (write: AppointmentWrite) => { writes.push(write) },
        assignee: {
          access: { enabled: true, members, openInviteExpiries: [] },
          ownerUid: stored.salonId || stored.uid,
          sessionUid: stored.uid,
          role,
        },
      }
      render(<AppointmentForm {...(props as ComponentProps<typeof AppointmentForm>)} />)
    }
    const user = userEvent.setup()
    openForm()
    const who = await screen.findByRole('group', { name: 'Chi lo fa' })
    const maria = within(who).getByRole('button', { name: 'Maria Rossi' })
    const giulia = within(who).getByRole('button', { name: 'Giulia Neri' })
    expect(maria).toHaveAttribute('aria-pressed', 'true')
    expect(maria).toBeDisabled()
    expect(giulia).toBeDisabled()
    fireEvent.click(giulia)
    expect(maria).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(writes.at(-1)?.assigneeUid).toBe('titolare-1')

    cleanup()
    writes.length = 0
    writeJson(storageKeys.auth, { ...getAccount(), role: undefined })
    openForm()
    const open = await screen.findByRole('group', { name: 'Chi lo fa' })
    expect(within(open).getByRole('button', { name: 'Maria Rossi' })).toBeEnabled()
    await user.click(within(open).getByRole('button', { name: 'Giulia Neri' }))
    expect(within(open).getByRole('button', { name: 'Giulia Neri' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(writes.at(-1)?.assigneeUid).toBe(account.uid)
  })
})