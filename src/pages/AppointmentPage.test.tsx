// @vitest-environment happy-dom
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const pianoPlus = vi.hoisted(() => ({ acceso: false, inRitardo: false }))
vi.mock('../hooks/usePiano', async () => {
  const actual = await vi.importActual<typeof import('../hooks/usePiano')>('../hooks/usePiano')
  const { statoPiano } = await import('../lib/piano')
  const { useEffect, useState } = await import('react')
  return {
    ...actual,
    usePiano: () => {
      const valore = actual.usePiano()
      // Il piano arriva dopo il primo render: prima è quello gratuito e non ancora pronto.
      const [arrivato, setArrivato] = useState(!pianoPlus.inRitardo)
      useEffect(() => {
        if (arrivato) return
        const timer = window.setTimeout(() => setArrivato(true), 20)
        return () => window.clearTimeout(timer)
      }, [arrivato])
      if (!arrivato) return { ...valore, pronto: false }
      return pianoPlus.acceso ? { ...valore, stato: statoPiano({ piano: 'pro', stato: 'attivo', fonte: 'manuale' }, new Date()) } : valore
    },
  }
})
const impostazioniFerme = vi.hoisted(() => ({ attive: false }))
vi.mock('../hooks/useSettings', async () => {
  const actual = await vi.importActual<typeof import('../hooks/useSettings')>('../hooks/useSettings')
  return {
    ...actual,
    useSettings: () => {
      const valore = actual.useSettings()
      return impostazioniFerme.attive ? { ...valore, ready: false } : valore
    },
  }
})
const salonDesk = vi.hoisted(() => ({ access: null as unknown }))
vi.mock('../data/firebase/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data/firebase/client')>()
  return {
    ...actual,
    watchSalonAccess: async (_salonId: string, onChange: (access: unknown) => void) => {
      onChange(salonDesk.access)
      return () => {}
    },
  }
})
import { App } from '../app/App'
import { Providers } from '../app/providers'
import { buildRoutes } from '../app/router'
import { AppointmentForm } from './AppointmentForm'
import { completeAppointment, createAppointment, saveClose, setAppointmentStatus } from '../data/local/appointments'
import { createAccount } from '../data/local/auth'
import { saveClosureLocal } from '../data/local/closures'
import { createDog, listDogs } from '../data/local/dogs'
import { getSettings } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'
import { hrefChat } from '../lib/messaggiManuali'
import { SERVICE_SEED } from '../data/seed/services'
import { seedPriceSheet } from '../data/seed/priceSheet'
import type { SalonAccess } from '../lib/salonRoster'
import type { Appointment, AppointmentWrite, Dog, DogWrite, Service } from '../types/models'

beforeEach(() => {
  pianoPlus.acceso = false
})

function dog(name: string, extra: Partial<DogWrite> = {}): DogWrite {
  return {
    name,
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: '', phone: '333' },
    ...extra,
  }
}

function storedAppointments(uid: string): Appointment[] {
  const map = JSON.parse(localStorage.getItem(storageKeys.appointments(uid)) ?? '{}') as Record<string, Appointment>
  return Object.values(map)
}

function storedDogs(uid: string): Dog[] {
  return listDogs(uid)
}

async function openFrom(path: string) {
  const router = createMemoryRouter(buildRoutes(false), { initialEntries: [path] })
  render(<Providers><RouterProvider router={router} /></Providers>)
  const user = userEvent.setup()
  const nav = await screen.findByRole('navigation', { name: 'Navigazione principale' })
  await user.click(within(nav).getByRole('button', { name: 'Aggiungi' }))
  await user.click(screen.getByRole('button', { name: 'Fissa un appuntamento' }))
  expect(await screen.findByRole('heading', { name: 'Nuovo appuntamento' })).toBeTruthy()
  return { router, user }
}

async function goBack(router: ReturnType<typeof createMemoryRouter>) {
  await act(async () => {
    await router.navigate(-1)
  })
}

function sheetOf() {
  return screen.getByRole('dialog')
}

function appointmentForm(dogs: Dog[], dogId: string, onDirty?: (dirty: boolean) => void) {
  return (
    <AppointmentForm
      dogs={dogs}
      services={[]}
      appointments={[]}
      initial={{ dogId, serviceIds: [], day: '2026-10-12', time: '09:00' }}
      onDirtyChange={onDirty}
      onSubmit={() => {}}
    />
  )
}

describe('foglio nuovo appuntamento', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 3, 8, 0, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('da pulito, Chiudi torna alla pagina sotto', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const { user } = await openFrom('/mensili')
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(screen.getByRole('heading', { name: /mensili/i })).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('da pulito, indietro torna alla pagina sotto senza saltarne', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const { router, user } = await openFrom('/mensili')
    expect(screen.queryByText('Chiudere senza salvare?')).toBeNull()
    await goBack(router)
    expect(router.state.location.pathname).toBe('/mensili')
    expect(screen.getByRole('heading', { name: /mensili/i })).toBeTruthy()
    expect(user).toBeTruthy()
  })

  it('non disegna una seconda shell, il link Calendario né la freccia Indietro', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    await openFrom('/mensili')
    expect(screen.getAllByTestId('phone-shell')).toHaveLength(1)
    expect(screen.queryByRole('link', { name: 'Calendario' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Indietro' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Indietro' })).toBeNull()
    expect(within(sheetOf()).getByRole('button', { name: 'Chiudi' })).toBeTruthy()
  })

  it('con dati inseriti, indietro chiede conferma e un secondo indietro è Resta', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Ercole', { breed: 'Terranova', contact: { name: 'Anna Usai', phone: '333' } }))
    const { router, user } = await openFrom('/mensili')
    await user.type(screen.getByLabelText(/cerca cane/i), 'Ercole')
    const url = router.state.location.pathname
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(screen.getByText('Chiudere senza salvare?')).toBeTruthy()
    const ask = screen.getByRole('dialog', { name: 'Chiudere senza salvare?' })
    expect(ask).toBeInTheDocument()
    expect(ask.compareDocumentPosition(screen.getByRole('dialog', { name: 'Nuovo appuntamento' })) & Node.DOCUMENT_POSITION_CONTAINED_BY).toBe(0)
    expect(router.state.location.pathname).toBe(url)
    expect(screen.queryByText('Annulla')).toBeNull()
    await goBack(router)
    expect(screen.queryByText('Chiudere senza salvare?')).toBeNull()
    expect(router.state.location.pathname).toBe(url)
    expect(screen.getByLabelText(/cerca cane/i)).toBeTruthy()
  })

  it('indietro con dati inseriti apre la domanda e Resta la chiude', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Ercole'))
    const { router, user } = await openFrom('/mensili')
    await user.type(screen.getByLabelText(/cerca cane/i), 'Erc')
    await goBack(router)
    expect(screen.getByText('Chiudere senza salvare?')).toBeTruthy()
    expect(router.state.location.pathname).toBe('/appuntamenti/nuovo')
    await user.click(screen.getByRole('button', { name: 'Resta' }))
    expect(screen.queryByText('Chiudere senza salvare?')).toBeNull()
    expect(screen.getByLabelText(/cerca cane/i)).toHaveValue('Erc')
  })

  it('Chiudi senza salvare esce sulla pagina sotto', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Ercole'))
    const { user } = await openFrom('/mensili')
    await user.type(screen.getByLabelText(/cerca cane/i), 'Erc')
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    await user.click(screen.getByRole('button', { name: 'Chiudi senza salvare' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('heading', { name: /mensili/i })).toBeTruthy()
  })

  it('lo sfondo chiama requestClose', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Ercole'))
    const { user } = await openFrom('/mensili')
    await user.type(screen.getByLabelText(/cerca cane/i), 'Erc')
    await user.click(screen.getByTestId('sheet-backdrop'))
    expect(screen.getByText('Chiudere senza salvare?')).toBeTruthy()
    await user.click(screen.getByTestId('sheet-backdrop'))
    expect(screen.queryByText('Chiudere senza salvare?')).toBeNull()
  })

  it('uno swipe di 80 px sulla maniglia chiude, sotto gli 80 px il foglio torna su', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    await openFrom('/mensili')
    const grabber = screen.getByTestId('sheet-grabber')
    fireEvent.pointerDown(grabber, { clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(grabber, { clientY: 170, pointerId: 1 })
    fireEvent.pointerUp(grabber, { clientY: 179, pointerId: 1 })
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.pointerDown(grabber, { clientY: 100, pointerId: 1 })
    fireEvent.pointerMove(grabber, { clientY: 190, pointerId: 1 })
    fireEvent.pointerUp(grabber, { clientY: 180, pointerId: 1 })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('heading', { name: /mensili/i })).toBeTruthy()
  })

  it('uno swipe sporco chiede la conferma', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Ercole'))
    const { user } = await openFrom('/mensili')
    await user.type(screen.getByLabelText(/cerca cane/i), 'Erc')
    const grabber = screen.getByTestId('sheet-grabber')
    fireEvent.pointerDown(grabber, { clientY: 0, pointerId: 1 })
    fireEvent.pointerUp(grabber, { clientY: 120, pointerId: 1 })
    expect(screen.getByText('Chiudere senza salvare?')).toBeTruthy()
  })

  it('da indirizzo diretto un passo indietro rivela la pagina di backTarget', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/appuntamenti/nuovo?da=mensili" />)
    expect(await screen.findByRole('heading', { name: 'Nuovo appuntamento' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(screen.getByRole('heading', { name: /mensili/i })).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('senza parametri il foglio diretto torna alla Home, con ?data= al calendario di quel giorno', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    const first = render(<App memory isDev={false} initialPath="/appuntamenti/nuovo" />)
    await user.click(await screen.findByRole('button', { name: 'Chiudi' }))
    expect(screen.getByRole('heading', { name: 'Oggi' })).toBeTruthy()
    first.unmount()
    render(<App memory isDev={false} initialPath="/appuntamenti/nuovo?data=2026-10-12" />)
    await user.click(await screen.findByRole('button', { name: 'Chiudi' }))
    expect(screen.getByRole('heading', { name: 'Ottobre 2026' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Seleziona Lunedì 12 ottobre' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('?cane= apre la scheda del cane se esiste', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/nuovo?cane=${rex.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Chiudi' }))
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeTruthy()
  })

  it('aprire con cane, data e ora già messi e chiudere subito non chiede nulla', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/nuovo?cane=${rex.id}&data=2026-10-12&ora=10:00&servizi=bagno`} />)
    await user.click(await screen.findByRole('button', { name: 'Chiudi' }))
    expect(screen.queryByText('Chiudere senza salvare?')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('il dettaglio in lettura non è sporco e Appuntamento assente si chiude senza domanda', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const created = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 5, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    const first = render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Chiudi' }))
    expect(screen.queryByText('Chiudere senza salvare?')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
    first.unmount()
    render(<App memory isDev={false} initialPath="/appuntamenti/inesistente" />)
    expect(await screen.findByText('Appuntamento assente')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(screen.queryByText('Chiudere senza salvare?')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('dopo il salvataggio torna ai Mensili e Vedi apre il calendario di quel giorno', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Ercole'))
    const { user } = await openFrom('/mensili')
    await user.type(screen.getByLabelText(/cerca cane/i), 'Erc')
    await user.click(screen.getByRole('button', { name: 'Ercole' }))
    await user.click(screen.getByRole('button', { name: /^Bagno · / }))
    await user.click(screen.getByRole('button', { name: 'Domani' }))
    await user.click(screen.getByRole('button', { name: '09:00' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(screen.getByRole('heading', { name: /mensili/i })).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Appuntamento salvato per dom 4 ott 09:00')
    expect(within(status).getByRole('button', { name: 'Annulla' })).toBeTruthy()
    await user.click(within(status).getByRole('button', { name: 'Vedi' }))
    expect(await screen.findByRole('heading', { name: 'Ottobre 2026' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Seleziona Domenica 4 ottobre' })).toHaveAttribute('aria-pressed', 'true')
    expect(storedAppointments(account.uid)).toHaveLength(1)
  })

  it('Annulla toglie l’appuntamento appena creato e la lista sotto si aggiorna', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Ercole'))
    const { user } = await openFrom('/mensili')
    await user.type(screen.getByLabelText(/cerca cane/i), 'Erc')
    await user.click(screen.getByRole('button', { name: 'Ercole' }))
    await user.click(screen.getByRole('button', { name: /^Bagno · / }))
    await user.click(screen.getByRole('button', { name: '09:00' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(storedAppointments(account.uid)).toHaveLength(1)
    await user.click(within(screen.getByRole('status')).getByRole('button', { name: 'Annulla' }))
    expect(storedAppointments(account.uid)).toHaveLength(0)
    expect(storedDogs(account.uid)).toHaveLength(1)
  })

  it('Annulla toglie anche il cane nato nella stessa azione', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Zeus'))
    const { user } = await openFrom('/mensili')
    await user.type(screen.getByLabelText(/cerca cane/i), 'Birba')
    await user.click(screen.getByRole('button', { name: /\+ Nuovo cane/ }))
    expect(screen.getByRole('textbox', { name: 'Nome' })).toHaveValue('Birba')
    await user.click(screen.getByRole('button', { name: /^Bagno · / }))
    await user.click(screen.getByRole('button', { name: '10:00' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(storedDogs(account.uid).map((item) => item.name).sort()).toEqual(['Birba', 'Zeus'])
    expect(storedAppointments(account.uid)).toHaveLength(1)
    await user.click(within(screen.getByRole('status')).getByRole('button', { name: 'Annulla' }))
    expect(storedAppointments(account.uid)).toHaveLength(0)
    expect(storedDogs(account.uid).map((item) => item.name)).toEqual(['Zeus'])
  })

  it('un gatto creato nel foglio resta gatto e ha i valori di default del cane', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const { user } = await openFrom('/')
    await user.type(screen.getByLabelText(/cerca cane/i), 'Micia')
    await user.click(screen.getByRole('button', { name: /\+ Nuovo cane/ }))
    expect(screen.getByRole('radio', { name: 'Cane' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Piccola' })).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByRole('radio', { name: 'Gatto' }))
    await user.type(screen.getByRole('textbox', { name: 'Proprietario' }), 'Lea Rossi')
    await user.type(screen.getByRole('textbox', { name: 'Telefono' }), '3331112222')
    await user.click(screen.getByRole('button', { name: /^Bagno · / }))
    await user.click(screen.getByRole('button', { name: '09:00' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    const [created] = storedDogs(account.uid)
    expect(created.species).toBe('gatto')
    expect(created.size).toBe('piccola')
    expect(created.ageCategory).toBe('adulto')
    expect(created.temperament).toBe('bravo')
    expect(created.clientType).toBe('occasionale')
    expect(created.contact).toEqual({ name: 'Lea Rossi', phone: '3331112222' })
  })

  it('una taglia Grande usa subito i prezzi da grande', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const { user } = await openFrom('/')
    await user.type(screen.getByLabelText(/cerca cane/i), 'Bruto')
    await user.click(screen.getByRole('button', { name: /\+ Nuovo cane/ }))
    const small = screen.getByRole('button', { name: /^Bagno · / }).textContent ?? ''
    await user.click(screen.getByRole('radio', { name: 'Grande' }))
    const large = screen.getByRole('button', { name: /^Bagno · / }).textContent ?? ''
    expect(large).not.toBe(small)
    await user.click(screen.getByRole('button', { name: /^Bagno · / }))
    await user.click(screen.getByRole('button', { name: '09:00' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    const [line] = storedAppointments(account.uid)[0].services
    expect(line.price).toBe(38)
    expect(line.durationMin).toBe(60)
    expect(storedDogs(account.uid)[0].size).toBe('grande')
  })

  it('un nome uguale a un cane attivo chiede conferma prima della mini-scheda', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Ercole', { breed: 'Terranova', contact: { name: 'Anna Usai', phone: '333' } }))
    const { user } = await openFrom('/')
    await user.type(screen.getByLabelText(/cerca cane/i), 'Ercole')
    await user.click(screen.getByRole('button', { name: /\+ Nuovo cane/ }))
    expect(screen.getByText('Esiste già Ercole (Terranova, Usai). Crearne un altro?')).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'Nome' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Crea un altro' }))
    expect(screen.getByRole('textbox', { name: 'Nome' })).toHaveValue('Ercole')
  })

  it('dopo la scelta il campo diventa la card del cane e i suggerimenti si chiudono', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Ercole', { breed: 'Terranova', criticalNote: 'Morde', contact: { name: 'Anna Usai', phone: '333' } }))
    const { user } = await openFrom('/')
    await user.type(screen.getByLabelText(/cerca cane/i), 'Erc')
    await user.click(screen.getByRole('button', { name: 'Ercole' }))
    expect(screen.queryByLabelText(/cerca cane/i)).toBeNull()
    expect(screen.getByText('Ercole')).toBeTruthy()
    expect(screen.getByText('Terranova · Anna Usai')).toBeTruthy()
    expect(screen.getByText('Morde')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Cambia cane' }))
    expect(screen.getByLabelText(/cerca cane/i)).toBeTruthy()
  })

  it('prima di scrivere mostra al massimo 5 cani recenti, i più recenti prima', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const names = ['Uno', 'Due', 'Tre', 'Quattro', 'Cinque', 'Sei']
    const created = names.map((name) => createDog(account.uid, dog(name)))
    const raw = JSON.parse(localStorage.getItem(storageKeys.settings(account.uid)) ?? '{}') as Record<string, unknown>
    localStorage.setItem(storageKeys.settings(account.uid), JSON.stringify({
      ...getSettings(account.uid),
      ...raw,
      recentDogIds: [...created].reverse().map((item) => item.id),
    }))
    await openFrom('/')
    const rows = within(sheetOf()).getAllByRole('button').map((button) => button.getAttribute('aria-label') ?? '')
    const shown = rows.filter((label) => names.includes(label))
    expect(shown).toEqual(['Sei', 'Cinque', 'Quattro', 'Tre', 'Due'])
    expect(screen.queryByText('Nessun cane')).toBeNull()
  })

  it('senza recenti non scrive Nessun cane se esistono cani attivi, ma solo senza cani', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Rex'))
    const first = await openFrom('/')
    expect(screen.queryByText('Nessun cane')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Rex' })).toBeNull()
    expect(first.user).toBeTruthy()
  })

  it('senza nessun cane attivo mostra Nessun cane', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    await openFrom('/')
    expect(screen.getByText('Nessun cane')).toBeTruthy()
  })

  it('la ricerca trova anche per proprietario e telefono, ultimi i telefoni', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Zeus', { contact: { name: 'Marta Neri', phone: '3470000001' } }))
    createDog(account.uid, dog('Neri', { contact: { name: 'Anna Bianchi', phone: '3480000002' } }))
    createDog(account.uid, dog('Lux', { contact: { name: 'Gino Verdi', phone: '3335550000' } }))
    const { user } = await openFrom('/')
    await user.type(screen.getByLabelText(/cerca cane/i), 'neri')
    const labels = within(sheetOf()).getAllByRole('button').map((button) => button.getAttribute('aria-label') ?? '')
    const found = labels.filter((label) => ['Zeus', 'Neri', 'Lux'].includes(label))
    expect(found).toEqual(['Neri', 'Zeus'])
    await user.clear(screen.getByLabelText(/cerca cane/i))
    await user.type(screen.getByLabelText(/cerca cane/i), '333555')
    expect(screen.getByRole('button', { name: 'Lux' })).toBeTruthy()
  })

  it('Salva è disabilitato finché mancano cane, servizio, data e ora, e il totale è vivo', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Ercole'))
    const { user } = await openFrom('/')
    const save = screen.getByRole('button', { name: 'Salva' })
    expect(save).toBeDisabled()
    await user.type(screen.getByLabelText(/cerca cane/i), 'Erc')
    await user.click(screen.getByRole('button', { name: 'Ercole' }))
    expect(save).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /^Bagno · / }))
    expect(save).toBeEnabled()
    expect(screen.getByTestId('appointment-summary')).toHaveTextContent('09:00 → 09:30 · 30 min · €20')
    expect(screen.getByTestId('services-total')).toHaveTextContent('09:00 → 09:30 · 30 min · €20')
    await user.click(screen.getByRole('button', { name: '10:00' }))
    expect(save).toBeEnabled()
    expect(screen.getByTestId('appointment-summary')).toHaveTextContent('10:00 → 10:30 · 30 min · €20')
    expect(screen.getByTestId('services-total')).toHaveTextContent('10:00 → 10:30 · 30 min · €20')
    await user.click(screen.getByRole('button', { name: /^Taglio \/ tosatura · / }))
    expect(screen.getByTestId('appointment-summary')).toHaveTextContent('10:00 → 11:15 · 1h15 · €50')
    expect(screen.getByTestId('services-total').textContent).toBe(screen.getByTestId('appointment-summary').textContent)
    expect(screen.queryByText(/^Totale/)).toBeNull()
  })

  it('i chip servizio sono Nome · durata · prezzo con i prezzi del cane', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Ercole', { servicePrices: [{ serviceId: 'bagno', price: 25, durationMin: 40 }] }))
    const { user } = await openFrom('/')
    expect(screen.getByRole('button', { name: 'Bagno · 30 min · €20' })).toBeTruthy()
    await user.type(screen.getByLabelText(/cerca cane/i), 'Erc')
    await user.click(screen.getByRole('button', { name: 'Ercole' }))
    expect(screen.getByRole('button', { name: 'Bagno · 40 min · €25' })).toBeTruthy()
  })

  it('le scorciatoie portano a oggi, domani, +7 e +30 giorni', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const { user } = await openFrom('/')
    await user.click(screen.getByRole('button', { name: 'Oggi' }))
    expect(screen.getByLabelText('Giorno')).toHaveValue('2026-10-03')
    await user.click(screen.getByRole('button', { name: 'Domani' }))
    expect(screen.getByLabelText('Giorno')).toHaveValue('2026-10-04')
    await user.click(screen.getByRole('button', { name: '+7 gg' }))
    expect(screen.getByLabelText('Giorno')).toHaveValue('2026-10-10')
    await user.click(screen.getByRole('button', { name: '+30 gg' }))
    expect(screen.getByLabelText('Giorno')).toHaveValue('2026-11-02')
  })

  it('gli slot occupati, data la durata totale, sono grigi e la sovrapposizione è un riquadro giallo anche in creazione', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Ercole'))
    const zeus = createDog(account.uid, dog('Zeus'))
    createAppointment(account.uid, {
      dogId: zeus.id,
      start: new Date(2026, 9, 3, 11, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 180, price: 20 }],
    })
    const { user } = await openFrom('/')
    await user.click(screen.getByRole('button', { name: 'Oggi' }))
    await user.type(screen.getByLabelText(/cerca cane/i), 'Erc')
    await user.click(screen.getByRole('button', { name: 'Ercole' }))
    await user.click(screen.getByRole('button', { name: /^Bagno · / }))
    expect(screen.getByRole('button', { name: '11:00' })).toHaveAttribute('data-busy', 'true')
    expect(screen.getByRole('button', { name: '10:45' })).toHaveAttribute('data-busy', 'true')
    expect(screen.getByRole('button', { name: '10:15' })).not.toHaveAttribute('data-busy')
    expect(screen.queryByRole('alert')).toBeNull()
    await user.click(screen.getByRole('button', { name: '10:30' }))
    await user.click(screen.getByRole('button', { name: /^Taglio \/ tosatura · / }))
    const chosenBusy = screen.getByRole('button', { name: '10:30' })
    expect(chosenBusy).toHaveAttribute('aria-pressed', 'true')
    expect(chosenBusy).not.toBeDisabled()
    expect(chosenBusy.getAttribute('style')).toContain('background: var(--pri-solid)')
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Si sovrappone a Zeus 11:00–14:00')
    expect(alert.getAttribute('style')).toContain('var(--warn-s)')
    expect(screen.getByRole('button', { name: 'Salva' })).toBeEnabled()
  })

  it('con la sovrapposizione Salva chiede conferma in un foglio e scrive solo dopo', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Ercole'))
    const zeus = createDog(account.uid, dog('Zeus'))
    createAppointment(account.uid, {
      dogId: zeus.id,
      start: new Date(2026, 9, 3, 11, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 60, price: 20 }],
    })
    const confirmSpy = vi.spyOn(window, 'confirm')
    const { user } = await openFrom('/')
    await user.click(screen.getByRole('button', { name: 'Oggi' }))
    await user.type(screen.getByLabelText(/cerca cane/i), 'Erc')
    await user.click(screen.getByRole('button', { name: 'Ercole' }))
    await user.click(screen.getByRole('button', { name: /^Bagno · / }))
    await user.click(screen.getByRole('button', { name: '10:30' }))
    await user.click(screen.getByRole('button', { name: /^Taglio \/ tosatura · / }))
    expect(screen.getByRole('alert')).toHaveTextContent('Si sovrappone a Zeus 11:00–12:00')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    const sheet = screen.getByRole('dialog', { name: 'Orario già occupato' })
    expect(within(sheet).getByText('Si sovrappone a Zeus 11:00–12:00')).toBeTruthy()
    expect(within(sheet).queryByText(/annulla/i)).toBeNull()
    expect(screen.queryByRole('button', { name: /annulla/i })).toBeNull()
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(storedAppointments(account.uid)).toHaveLength(1)
    await user.click(within(sheet).getByRole('button', { name: 'Cambia ora' }))
    expect(screen.queryByRole('dialog', { name: 'Orario già occupato' })).toBeNull()
    expect(storedAppointments(account.uid)).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Orario già occupato' })).getByRole('button', { name: 'Salva comunque' }))
    expect(storedAppointments(account.uid)).toHaveLength(2)
    confirmSpy.mockRestore()
  })

  it('un personale coperto dall’orario non chiede la sovrapposizione e resta; una visita cane sì', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Ercole'))
    const zeus = createDog(account.uid, dog('Zeus'))
    createAppointment(account.uid, {
      kind: 'personale',
      title: 'Dentista',
      dogId: '',
      start: new Date(2026, 9, 3, 18, 0, 0, 0),
      services: [],
    })
    createAppointment(account.uid, {
      dogId: zeus.id,
      start: new Date(2026, 9, 3, 11, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 60, price: 20 }],
    })
    const { user } = await openFrom('/')
    await user.click(screen.getByRole('button', { name: 'Oggi' }))
    await user.type(screen.getByLabelText(/cerca cane/i), 'Erc')
    await user.click(screen.getByRole('button', { name: 'Ercole' }))
    await user.click(screen.getByRole('button', { name: /^Bagno · / }))
    await user.click(screen.getByRole('button', { name: '10:30' }))
    await user.click(screen.getByRole('button', { name: /^Taglio \/ tosatura · / }))
    expect(screen.getByRole('alert')).toHaveTextContent('Si sovrappone a Zeus 11:00–12:00')
    expect(screen.queryByText(/Cane assente 18:00/)).toBeNull()
    const covering = screen.getByRole('button', { name: '17:45' })
    expect(covering).not.toHaveAttribute('data-busy')
    expect(covering).not.toBeDisabled()
    await user.click(covering)
    expect(screen.queryByRole('alert')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(screen.queryByRole('dialog', { name: 'Orario già occupato' })).toBeNull()
    const saved = storedAppointments(account.uid)
    expect(saved).toHaveLength(3)
    const personal = saved.find((item) => item.kind === 'personale')
    expect(personal?.title).toBe('Dentista')
    expect(new Date(personal?.start ?? '').getHours()).toBe(18)
    expect(saved.filter((item) => item.kind !== 'personale')).toHaveLength(2)
  })

  it('aprire e chiudere il foglio non rimonta Mensili: mese e filtro scelti restano', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const router = createMemoryRouter(buildRoutes(false), { initialEntries: ['/mensili'] })
    render(<Providers><RouterProvider router={router} /></Providers>)
    const user = userEvent.setup()
    await user.click(await within(await screen.findByRole('radiogroup', { name: 'Mese' })).findByRole('radio', { name: /nov/i }))
    await user.click(screen.getByRole('button', { name: 'Fissati' }))
    const group = screen.getByRole('group', { name: 'Filtro' })
    expect(screen.getByRole('button', { name: 'Fissati' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Aggiungi' }))
    await user.click(screen.getByRole('button', { name: 'Fissa un appuntamento' }))
    expect(await screen.findByRole('heading', { name: 'Nuovo appuntamento' })).toBeTruthy()
    expect(document.querySelectorAll('[role="group"][aria-label="Filtro"]')).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('group', { name: 'Filtro' })).toBe(group)
    expect(screen.getByRole('button', { name: 'Fissati' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Tutti' })).toHaveAttribute('aria-pressed', 'false')
    expect(within(screen.getByRole('radiogroup', { name: 'Mese' })).getByRole('radio', { name: /nov/i })).toHaveAttribute('aria-checked', 'true')
  })

  it('dal profilo il cane che arriva dopo resta già scelto, senza risultare una modifica', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex', { breed: 'Labrador', contact: { name: 'Sara', phone: '333' } }))
    const dirty: boolean[] = []
    const view = render(appointmentForm([], '', (value) => { dirty.push(value) }))
    expect(screen.getByLabelText(/cerca cane/i)).toBeTruthy()
    view.rerender(appointmentForm([rex], rex.id, (value) => { dirty.push(value) }))
    expect(await screen.findByRole('button', { name: 'Cambia cane' })).toBeTruthy()
    expect(screen.queryByLabelText(/cerca cane/i)).toBeNull()
    expect(screen.getByText('Rex')).toBeTruthy()
    expect(screen.getByText('Labrador · Sara')).toBeTruthy()
    expect(dirty.at(-1)).toBe(false)
  })

  it('un Yorkshire piccolo con Bagno propone 25 euro e dice che viene dal listino', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex', { breed: 'Yorkshire' }))
    const stamp = new Date(2026, 9, 1)
    const servizi: Service[] = SERVICE_SEED.map((seed) => ({ ...seed, createdAt: stamp, updatedAt: stamp }))
    const listino = seedPriceSheet({ name: 'Salone', phone: '333', address: 'Via Roma' })
    render(
      <AppointmentForm
        dogs={[rex]}
        services={servizi}
        appointments={[]}
        initial={{ dogId: rex.id, serviceIds: ['bagno'], day: '2026-10-12', time: '09:00' }}
        listino={listino}
        onSubmit={() => {}}
      />,
    )
    expect(await screen.findByRole('button', { name: /^Bagno · .*25.*dal listino Yorkshire$/ })).toBeTruthy()
    expect(screen.getAllByText('dal listino Yorkshire').length).toBeGreaterThan(0)
    expect(screen.getByTestId('services-total').textContent).toContain('25')
  })

  describe('orari del salone nel modulo', () => {
    const giorniFeriali = [{ da: '09:00', a: '13:00' }, { da: '15:00', a: '19:00' }]
    const ORARI = { 1: giorniFeriali, 2: giorniFeriali, 3: giorniFeriali, 4: giorniFeriali, 5: giorniFeriali, 6: [{ da: '09:00', a: '13:00' }] }

    async function conOrari(percorso: (dogId: string) => string, orari: typeof ORARI | null = ORARI) {
      pianoPlus.acceso = orari !== null
      const account = await createAccount('maria@salone.it', 'segretissimo')
      if (orari) writeJson(storageKeys.settings(account.uid), { ...getSettings(account.uid), orari })
      const rex = createDog(account.uid, dog('Rex'))
      render(<App memory isDev={false} initialPath={percorso(rex.id)} />)
      await screen.findByRole('heading', { name: 'Nuovo appuntamento' })
    }

    it('una visita da 120 minuti che finisce dopo la chiusura avvisa e Salva resta attivo', async () => {
      await conOrari((id) => `/appuntamenti/nuovo?cane=${id}&data=2026-10-05&ora=12:45&servizi=stripping`)
      expect(await screen.findByRole('alert')).toHaveTextContent('Finisce dopo la chiusura delle 13:00')
      expect(screen.getByRole('button', { name: 'Salva' })).not.toBeDisabled()
    })

    it('la stessa visita alle 11:00 non avvisa', async () => {
      await conOrari((id) => `/appuntamenti/nuovo?cane=${id}&data=2026-10-05&ora=11:00&servizi=stripping`)
      expect(screen.getByRole('button', { name: 'Salva' })).not.toBeDisabled()
      expect(screen.queryByText(/Finisce dopo la chiusura/)).toBeNull()
    })

    it('un giorno chiuso lo dice sotto le scorciatoie', async () => {
      await conOrari((id) => `/appuntamenti/nuovo?cane=${id}&data=2026-10-04`)
      expect(await screen.findByText('Il salone è chiuso questo giorno')).toBeTruthy()
    })

    it('un giorno aperto non dice che è chiuso', async () => {
      await conOrari((id) => `/appuntamenti/nuovo?cane=${id}&data=2026-10-05`)
      expect(screen.queryByText('Il salone è chiuso questo giorno')).toBeNull()
    })

    it('senza data, di domenica, il giorno di partenza è il lunedì e l’ora la prima apertura', async () => {
      vi.setSystemTime(new Date(2026, 10, 8, 10, 0, 0, 0))
      await conOrari(() => '/appuntamenti/nuovo')
      expect(screen.getByLabelText('Giorno')).toHaveValue('2026-11-09')
      expect(screen.getByRole('button', { name: '09:00' })).toHaveAttribute('aria-pressed', 'true')
    })

    it('aperto a freddo, con il piano che arriva dopo il primo render, parte comunque dal lunedì alle 09:00', async () => {
      vi.setSystemTime(new Date(2026, 10, 8, 10, 0, 0, 0))
      pianoPlus.inRitardo = true
      try {
        await conOrari(() => '/appuntamenti/nuovo')
        expect(await screen.findByLabelText('Giorno')).toHaveValue('2026-11-09')
        expect(screen.getByRole('button', { name: '09:00' })).toHaveAttribute('aria-pressed', 'true')
      } finally {
        pianoPlus.inRitardo = false
      }
    })

    it('se le impostazioni non arrivano mai, dopo l’attesa il modulo si apre comunque', async () => {
      impostazioniFerme.attive = true
      try {
        await conOrari(() => '/appuntamenti/nuovo')
        expect(screen.queryByLabelText('Giorno')).toBeNull()
        expect(await screen.findByLabelText('Giorno', {}, { timeout: 5000 })).toBeTruthy()
      } finally {
        impostazioniFerme.attive = false
      }
    }, 10000)

    it('con ?cane= di domenica il giorno passa al lunedì ma l’ora resta vuota', async () => {
      vi.setSystemTime(new Date(2026, 10, 8, 10, 0, 0, 0))
      await conOrari((id) => `/appuntamenti/nuovo?cane=${id}`)
      expect(screen.getByLabelText('Giorno')).toHaveValue('2026-11-09')
      expect(screen.queryByRole('button', { name: '09:00', pressed: true })).toBeNull()
    })

    it('senza orari (Go) il giorno di partenza resta oggi', async () => {
      vi.setSystemTime(new Date(2026, 10, 8, 10, 0, 0, 0))
      await conOrari((id) => `/appuntamenti/nuovo?cane=${id}`, null)
      expect(screen.getByLabelText('Giorno')).toHaveValue('2026-11-08')
    })
  })

  describe('prezzo dal listino al salvataggio', () => {
    const stamp = new Date(2026, 9, 1)
    const servizi: Service[] = SERVICE_SEED.map((seed) => ({ ...seed, createdAt: stamp, updatedAt: stamp }))
    const listino = seedPriceSheet({ name: 'Salone', phone: '333', address: 'Via Roma' })

    function aperta(rex: Dog, serviceIds: string[], onSubmit: (write: AppointmentWrite) => void, esistente?: Appointment) {
      render(
        <AppointmentForm
          dogs={[rex]}
          services={servizi}
          appointments={esistente ? [esistente] : []}
          ignoreId={esistente?.id}
          initial={{ dogId: rex.id, serviceIds, day: '2026-10-12', time: '09:00' }}
          listino={listino}
          onSubmit={onSubmit}
        />,
      )
    }

    it('un nuovo appuntamento Yorkshire con Bagno salva 25', async () => {
      const account = await createAccount('maria@salone.it', 'segretissimo')
      const rex = createDog(account.uid, dog('Rex', { breed: 'Yorkshire' }))
      const writes: AppointmentWrite[] = []
      aperta(rex, ['bagno'], (write) => { writes.push(write) })
      await userEvent.setup().click(screen.getByRole('button', { name: 'Salva' }))
      expect(writes).toHaveLength(1)
      expect(writes[0].services).toEqual([expect.objectContaining({ serviceId: 'bagno', price: 25, durationMin: 30 })])
    })

    it('modificando una visita salvata prima del listino, il Bagno resta a 20 e il Taglio nuovo è quotato', async () => {
      const account = await createAccount('maria@salone.it', 'segretissimo')
      const rex = createDog(account.uid, dog('Rex', { breed: 'Yorkshire' }))
      const salvata = createAppointment(account.uid, {
        dogId: rex.id,
        start: new Date(2026, 9, 12, 9, 0, 0, 0),
        services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 35, price: 20 }],
      })
      const writes: AppointmentWrite[] = []
      const user = userEvent.setup()
      aperta(rex, ['bagno'], (write) => { writes.push(write) }, salvata)
      expect(screen.getByRole('button', { name: /^Bagno · .*20/ })).toBeTruthy()
      await user.click(screen.getByRole('button', { name: /^Taglio \/ tosatura/ }))
      await user.click(screen.getByRole('button', { name: 'Salva' }))
      expect(writes).toHaveLength(1)
      const righe = writes[0].services
      expect(righe.find((riga) => riga.serviceId === 'bagno')).toEqual(expect.objectContaining({ price: 20, durationMin: 35 }))
      expect(righe.find((riga) => riga.serviceId === 'taglio')).toEqual(expect.objectContaining({ price: 30, durationMin: 45 }))
    })
  })

  it('un salone che non ha mai salvato il listino propone 25 per un Yorkshire con Bagno', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex', { breed: 'Yorkshire' }))
    expect(getSettings(account.uid).priceSheet).toBeUndefined()
    render(<App memory isDev={false} initialPath={`/appuntamenti/nuovo?cane=${rex.id}&data=2026-10-12&ora=10:00&servizi=bagno`} />)
    expect(await screen.findByRole('button', { name: /^Bagno · .*25.*dal listino Yorkshire$/ })).toBeTruthy()
  })

  it('un listino salvato malformato non rompe il modulo e vale il prezzo della taglia', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex', { breed: 'Yorkshire' }))
    writeJson(storageKeys.settings(account.uid), { ...getSettings(account.uid), priceSheet: { version: 1, razze: 'x' } })
    render(<App memory isDev={false} initialPath={`/appuntamenti/nuovo?cane=${rex.id}&data=2026-10-12&ora=10:00&servizi=bagno`} />)
    expect(await screen.findByRole('button', { name: /^Bagno · / })).toBeTruthy()
  })

  it('se la ricerca è già iniziata, il cane del profilo non la sostituisce', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const user = userEvent.setup()
    const view = render(appointmentForm([], ''))
    await user.type(screen.getByLabelText(/cerca cane/i), 'Luna')
    view.rerender(appointmentForm([rex], rex.id))
    expect(screen.getByLabelText(/cerca cane/i)).toHaveValue('Luna')
    expect(screen.queryByRole('button', { name: 'Cambia cane' })).toBeNull()
  })

  it('togliere il cane arrivato dal profilo non lo rimette', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const user = userEvent.setup()
    const view = render(appointmentForm([], ''))
    view.rerender(appointmentForm([rex], rex.id))
    await user.click(await screen.findByRole('button', { name: 'Cambia cane' }))
    expect(screen.getByLabelText(/cerca cane/i)).toHaveValue('')
    view.rerender(appointmentForm([rex], rex.id))
    expect(screen.getByLabelText(/cerca cane/i)).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'Cambia cane' })).toBeNull()
  })

  it('un mensile arrivato dopo non accende il prossimo e tiene le settimane', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex', { clientType: 'mensile', recurrenceWeeks: 6 }))
    const user = userEvent.setup()
    const view = render(appointmentForm([], ''))
    view.rerender(appointmentForm([rex], rex.id))
    const next = await screen.findByRole('button', { name: 'Fissa anche il prossimo' })
    expect(next).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByLabelText('Settimane')).not.toBeInTheDocument()
    await user.click(next)
    expect(screen.getByLabelText('Settimane')).toHaveValue('6')
  })

  it('Fissa appuntamento dalla scheda apre il foglio con quel cane già scelto', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex', { breed: 'Labrador', contact: { name: 'Sara', phone: '333' } }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${rex.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Fissa appuntamento' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Nuovo appuntamento' })).toBeTruthy()
    expect(within(dialog).getByText('Rex')).toBeTruthy()
    expect(within(dialog).getByText('Labrador · Sara')).toBeTruthy()
    expect(within(dialog).queryByLabelText(/cerca cane/i)).toBeNull()
  })

  it('la card del cane apre la scheda e i bottoni stanno in ordine con Completato pieno', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    const open = await screen.findByRole('link', { name: 'Apri scheda' })
    expect(open).toHaveAttribute('href', `/animali/${luna.id}`)
    const dialog = screen.getByRole('dialog')
    const modifica = within(dialog).getByRole('button', { name: 'Modifica appuntamento' })
    const noShow = within(dialog).getByRole('button', { name: 'Non venuto' })
    const disdici = within(dialog).getByRole('button', { name: 'Disdici' })
    const done = within(dialog).getByRole('button', { name: 'Completato' })
    expect(modifica.compareDocumentPosition(done) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(done.compareDocumentPosition(noShow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(noShow.compareDocumentPosition(disdici) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(noShow.parentElement).toBe(disdici.parentElement)
    expect(noShow.parentElement?.getAttribute('style')).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))')
    expect(done.getAttribute('style')).toContain('background: var(--pri-solid)')
    expect(disdici.getAttribute('style')).toContain('color: var(--bad)')
    await user.click(open)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeTruthy()
  })

  it('Non venuto compare dal giorno della visita, Disdici c’è sempre', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const servizi = [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }]
    const domani = createAppointment(account.uid, { dogId: luna.id, start: new Date(2026, 9, 4, 9, 0, 0, 0), services: servizi })
    const oggi = createAppointment(account.uid, { dogId: luna.id, start: new Date(2026, 9, 3, 18, 0, 0, 0), services: servizi })
    const primo = render(<App memory isDev={false} initialPath={`/appuntamenti/${domani.id}`} />)
    await screen.findByRole('link', { name: 'Apri scheda' })
    let dialog = screen.getByRole('dialog')
    expect(within(dialog).queryByRole('button', { name: 'Non venuto' })).toBeNull()
    const disdici = within(dialog).getByRole('button', { name: 'Disdici' })
    expect(disdici.parentElement?.getAttribute('style') ?? '').not.toContain('repeat(2')
    primo.unmount()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${oggi.id}`} />)
    await screen.findByRole('link', { name: 'Apri scheda' })
    dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('button', { name: 'Non venuto' })).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Disdici' })).toBeTruthy()
  })

  it('il provvisorio senza cane mostra il nome dell’ospite e non la scheda', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createAppointment(account.uid, {
      dogId: '',
      ospiteNome: 'Rex',
      provvisorio: true,
      start: new Date(2026, 9, 2, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Rex')).toBeTruthy()
    expect(within(dialog).queryByText('Cane assente')).toBeNull()
    expect(within(dialog).queryByRole('link', { name: 'Apri scheda' })).toBeNull()
  })

  it('nell’appuntamento in Plus WhatsApp apre la chat semplice e Messaggi apre i messaggi prestabiliti', async () => {
    pianoPlus.acceso = true
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna', { contact: { name: 'Sara', phone: '333' } }))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    const contatti = await screen.findByTestId('contatti-appuntamento')
    expect(within(contatti).getByRole('link', { name: 'Chiama' })).toHaveAttribute('href', 'tel:333')
    const whats = within(contatti).getByRole('link', { name: 'WhatsApp' })
    expect(whats).toHaveAttribute('href', hrefChat('333'))
    expect(whats.getAttribute('href')).not.toContain('text=')
    const messaggi = within(contatti).getByRole('button', { name: 'Messaggi pronti' })
    expect(messaggi).toHaveTextContent('Messaggi')
    await user.click(messaggi)
    expect(await screen.findByRole('dialog', { name: 'Messaggi WhatsApp' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Promemoria' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Apri WhatsApp' })).toBeInTheDocument()
  })

  it('in Go nell’appuntamento WhatsApp apre la chat senza testo e Messaggi apre la finestra Plus', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna', { contact: { name: 'Sara', phone: '333' } }))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    const link = await screen.findByRole('link', { name: 'WhatsApp' })
    expect(link).toHaveAttribute('href', hrefChat('333'))
    expect(link.getAttribute('href')).not.toContain('text=')
    await user.click(screen.getByRole('button', { name: 'Messaggi pronti, Plus' }))
    expect(screen.queryByRole('link', { name: 'Apri WhatsApp' })).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Promemoria' })).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Prova Plus gratis|Avvisami|Abbonati/ })).toBeInTheDocument()
  })

  it('la nota critica è fuori dal link della scheda e con i messaggi spenti WhatsApp resta e Messaggi no', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    writeJson(storageKeys.settings(account.uid), { ...getSettings(account.uid), strumenti: { messaggi: false } })
    const luna = createDog(account.uid, dog('Luna', { criticalNote: 'Scalcia', contact: { name: 'Sara', phone: '333' } }))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    const link = await screen.findByRole('link', { name: 'Apri scheda' })
    const nota = screen.getByTestId('nota-critica')
    expect(nota).toHaveTextContent('Scalcia')
    expect(link.contains(nota)).toBe(false)
    const contatti = screen.getByTestId('contatti-appuntamento')
    expect(within(contatti).getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', hrefChat('333'))
    expect(within(contatti).queryByRole('button', { name: /Messaggi pronti/ })).not.toBeInTheDocument()
  })

  it('il riquadro dell’orario sposta di 15 minuti, apre Modifica e non c’è più la cella Telefono', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna', { contact: { name: 'Sara', phone: '333' } }))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    const orario = await screen.findByTestId('riquadro-orario')
    expect(orario).toHaveTextContent('09:00')
    expect(orario).toHaveTextContent('fino 09:30 · 30 min')
    expect(screen.queryByText('Telefono')).not.toBeInTheDocument()
    const startOf = () => new Date((JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { start: string }>)[created.id].start)
    await user.click(within(orario).getByRole('button', { name: 'Posticipa +15' }))
    expect(startOf().getMinutes()).toBe(15)
    expect(orario).toHaveTextContent('09:15')
    await user.click(within(orario).getByRole('button', { name: 'Anticipa −15' }))
    expect(startOf().getMinutes()).toBe(0)
    expect(within(orario).getByRole('button', { name: 'Anticipa −15' })).toHaveTextContent('−15')
    await user.click(within(orario).getByRole('button', { name: 'Modifica appuntamento' }))
    expect(await screen.findByRole('button', { name: 'Salva' })).toBeInTheDocument()
  })

  it('la tessera servizio scelta ha l’alone, lo slot occupato è barrato e quello scelto è pieno', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Ercole'))
    const zeus = createDog(account.uid, dog('Zeus'))
    createAppointment(account.uid, {
      dogId: zeus.id,
      start: new Date(2026, 9, 3, 11, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 180, price: 20 }],
    })
    const { user } = await openFrom('/')
    await user.click(screen.getByRole('button', { name: 'Oggi' }))
    await user.type(screen.getByLabelText(/cerca cane/i), 'Erc')
    await user.click(screen.getByRole('button', { name: 'Ercole' }))
    const bagno = screen.getByRole('button', { name: /^Bagno · / })
    await user.click(bagno)
    expect(bagno.getAttribute('style')).toContain('box-shadow: 0 0 0 3px var(--focus)')
    const busy = screen.getByRole('button', { name: '11:00' })
    expect(busy).toBeDisabled()
    expect(busy.getAttribute('style')).toContain('line-through')
    const chosen = screen.getByRole('button', { name: '09:00' })
    expect(chosen.getAttribute('style')).toContain('background: var(--pri-solid)')
  })

  it('un orario disdetto, saltato o già chiuso si può rifissare, quello in programma no', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Ercole'))
    const zeus = createDog(account.uid, dog('Zeus'))
    const linea = [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }]
    setAppointmentStatus(account.uid, createAppointment(account.uid, { dogId: zeus.id, start: new Date(2026, 9, 3, 10, 0, 0, 0), services: linea }).id, 'disdetto', 'cliente')
    setAppointmentStatus(account.uid, createAppointment(account.uid, { dogId: zeus.id, start: new Date(2026, 9, 3, 11, 0, 0, 0), services: linea }).id, 'non_venuto')
    completeAppointment(account.uid, createAppointment(account.uid, { dogId: zeus.id, start: new Date(2026, 9, 3, 12, 0, 0, 0), services: linea }).id)
    createAppointment(account.uid, { dogId: zeus.id, start: new Date(2026, 9, 3, 15, 0, 0, 0), services: linea })
    const { user } = await openFrom('/')
    await user.click(screen.getByRole('button', { name: 'Oggi' }))
    await user.type(screen.getByLabelText(/cerca cane/i), 'Erc')
    await user.click(screen.getByRole('button', { name: 'Ercole' }))
    for (const ora of ['10:00', '11:00', '12:00']) expect(screen.getByRole('button', { name: ora })).toBeEnabled()
    expect(screen.getByRole('button', { name: '15:00' })).toBeDisabled()
  })

  it('modificare un appuntamento resta sul dettaglio e la chiusura sporca chiede conferma', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const created = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 5, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica appuntamento' }))
    await user.click(screen.getByRole('button', { name: '10:00' }))
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(screen.getByText('Chiudere senza salvare?')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Resta' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText(/fino 10:30/)).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Appuntamento' })).toBeTruthy()
    expect(storedAppointments(account.uid)).toHaveLength(1)
  })

  it('propone Tosatrice anche se in impostazioni c’è solo Pettine tra gli strumenti', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    writeJson(storageKeys.settings(account.uid), {
      ...getSettings(account.uid),
      toolSuggestions: ['Pettine'],
      productSuggestions: ['Balsamo'],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Note del lavoro' }))
    expect(screen.getByRole('button', { name: /Tosatrice/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Pettine/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Shampoo/ })).toBeInTheDocument()
  })

  it('una foto del lavoro troppo grande lo dice con il messaggio della foto', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const created = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 5, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const photo = await import('../lib/dogPhoto')
    const { PhotoTooLargeError } = await import('../lib/photoCodec')
    const spy = vi.spyOn(photo, 'prepareDogPhoto').mockRejectedValue(new PhotoTooLargeError())
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: /Note del lavoro/ }))
    await user.upload(screen.getByLabelText('Aggiungi foto'), new File([new Uint8Array([1])], 'a.png', { type: 'image/png' }))
    expect(await screen.findByText('La foto è troppo grande per essere salvata. Prova con un’altra immagine.')).toBeTruthy()
    expect(screen.queryByText('Foto non utilizzabile')).toBeNull()
    expect(storedAppointments(account.uid)[0].photos ?? []).toEqual([])
    spy.mockRestore()
  })

  function stampClosure(uid: string, id: string, reason: string, day: string) {
    saveClosureLocal(uid, {
      id,
      reason,
      startDay: day,
      endDay: day,
      createdAt: new Date(2026, 9, 1),
      updatedAt: new Date(2026, 9, 1),
    })
  }

  async function chooseRexAndBagno(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByRole('textbox', { name: 'Cerca cane' }), 'Rex')
    await user.click(await screen.findByRole('button', { name: 'Rex' }))
    await user.click(screen.getByRole('button', { name: /^Bagno · / }))
  }

  it('salvare una visita su Ferie chiede conferma, Indietro non crea, e un servizio sullo stesso giorno non richiede di nuovo', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Rex'))
    stampClosure(account.uid, 'ferie', 'Ferie', '2026-10-21')
    stampClosure(account.uid, 'malattia', 'Malattia', '2026-10-22')
    const user = userEvent.setup()
    const first = render(<App memory isDev={false} initialPath="/appuntamenti/nuovo?data=2026-10-21" />)
    await chooseRexAndBagno(user)
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    const dialog = screen.getByRole('dialog', { name: 'Salone chiuso' })
    expect(dialog).toHaveTextContent('Il salone è chiuso questo giorno (Ferie). Salvare lo stesso la visita?')
    expect(within(dialog).getByRole('button', { name: 'Salva lo stesso' })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Indietro' }))
    expect(screen.queryByRole('dialog', { name: 'Salone chiuso' })).not.toBeInTheDocument()
    expect(storedAppointments(account.uid)).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Salone chiuso' })).getByRole('button', { name: 'Salva lo stesso' }))
    expect(storedAppointments(account.uid)).toHaveLength(1)
    const created = storedAppointments(account.uid)[0]
    expect(new Date(created.start).getDate()).toBe(21)
    first.unmount()

    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Modifica appuntamento' }))
    await user.click(screen.getByRole('button', { name: /^Taglio \/ tosatura · / }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(screen.queryByRole('dialog', { name: 'Salone chiuso' })).not.toBeInTheDocument()
    expect(storedAppointments(account.uid)[0].services).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Modifica appuntamento' }))
    fireEvent.change(screen.getByLabelText('Giorno'), { target: { value: '2026-10-22' } })
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    const moved = screen.getByRole('dialog', { name: 'Salone chiuso' })
    expect(moved).toHaveTextContent('Il salone è chiuso questo giorno (Malattia). Salvare lo stesso la visita?')
    expect(new Date(storedAppointments(account.uid)[0].start).getDate()).toBe(21)
  })

  it('una serie su due giorni chiusi elenca i giorni e Indietro non salva nessun giorno', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Rex'))
    stampClosure(account.uid, 'ferie', 'Ferie', '2026-10-21')
    stampClosure(account.uid, 'malattia', 'Malattia', '2026-10-28')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/appuntamenti/nuovo?data=2026-10-21" />)
    await chooseRexAndBagno(user)
    await user.click(screen.getByRole('button', { name: 'Fissa anche il prossimo' }))
    fireEvent.change(screen.getByLabelText('Settimane'), { target: { value: '1' } })
    expect(screen.getByText('Prossimo: mer 28 ott, 09:00')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    const dialog = screen.getByRole('dialog', { name: 'Salone chiuso' })
    expect(dialog).toHaveTextContent('Alcuni giorni sono chiusi: Mercoledì 21 ottobre, Ferie, Mercoledì 28 ottobre, Malattia. Salvare lo stesso?')
    await user.click(within(dialog).getByRole('button', { name: 'Indietro' }))
    expect(screen.queryByRole('dialog', { name: 'Salone chiuso' })).not.toBeInTheDocument()
    expect(storedAppointments(account.uid)).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Salone chiuso' })).getByRole('button', { name: 'Salva lo stesso' }))
    const saved = storedAppointments(account.uid)
    expect(saved).toHaveLength(2)
    expect(saved.map((item) => new Date(item.start).getDate()).sort((a, b) => a - b)).toEqual([21, 28])
  })

  it('a mezzanotte i pulsanti −15 e +15 non fanno passare la visita a un altro giorno, nemmeno su un giorno chiuso', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const created = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 22, 0, 10, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    stampClosure(account.uid, 'ferie', 'Ferie', '2026-10-22')
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    expect(await screen.findByRole('button', { name: 'Anticipa −15' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Posticipa +15' })).not.toBeDisabled()
  })

  it('nell’appuntamento aperto si aggiunge Sta in piedi e si toglie', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex', {
      criticalNote: 'Morde',
      extraNotes: [{ id: 'cane', text: 'Nota del cane', createdAt: new Date('2026-10-01T00:00:00.000Z') }],
    }))
    const created = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 5, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    const sheet = () => screen.getByRole('dialog', { name: 'Appuntamento' })
    expect(within(await screen.findByRole('dialog', { name: 'Appuntamento' })).getByText('Morde')).toBeInTheDocument()
    expect(within(sheet()).queryByText('altro')).not.toBeInTheDocument()
    expect(within(sheet()).queryByText('Nota del cane')).not.toBeInTheDocument()
    await user.click(within(sheet()).getByRole('button', { name: 'Aggiungi nota' }))
    const dialog = await screen.findByRole('dialog', { name: 'Aggiungi nota' })
    await user.type(within(dialog).getByLabelText('Nota'), 'Sta in piedi')
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    expect(within(sheet()).getByText('Sta in piedi')).toBeInTheDocument()
    const stored = () => JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { extraNotes?: { text: string }[] }>
    expect(stored()[created.id].extraNotes?.map((note) => note.text)).toEqual(['Sta in piedi'])
    await user.click(within(sheet()).getByRole('button', { name: 'Togli nota: Sta in piedi' }))
    expect(within(sheet()).queryByText('Sta in piedi')).not.toBeInTheDocument()
    expect(stored()[created.id].extraNotes).toBeUndefined()
    const dogs = JSON.parse(localStorage.getItem(storageKeys.dogs(account.uid))!) as Record<string, { extraNotes?: { text: string }[] }>
    expect(dogs[rex.id].extraNotes?.map((note) => note.text)).toEqual(['Nota del cane'])
  })

  it('una visita già completato mostra ancora Aggiungi nota', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const created = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 1, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    completeAppointment(account.uid, created.id)
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    expect(await screen.findByRole('button', { name: 'Aggiungi nota' })).toBeInTheDocument()
  })

  describe('Correggi chiusura per ruolo', () => {
    async function apriCompletata(role: 'titolare' | 'socio' | 'collaboratore') {
      const account = await createAccount('maria@salone.it', 'segretissimo')
      if (role !== 'titolare') writeJson(storageKeys.auth, { ...account, role })
      const rex = createDog(account.uid, dog('Rex'))
      const created = createAppointment(account.uid, {
        dogId: rex.id,
        start: new Date(2026, 9, 1, 9, 0, 0, 0),
        services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
      })
      completeAppointment(account.uid, created.id)
      render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
      await screen.findByRole('button', { name: 'Aggiungi nota' })
    }

    it('il collaboratore non vede Correggi e legge di chiedere al titolare', async () => {
      await apriCompletata('collaboratore')
      expect(screen.queryByRole('button', { name: 'Correggi' })).not.toBeInTheDocument()
      expect(screen.getByText('Per correggere la chiusura chiedi al titolare')).toBeInTheDocument()
    })

    it.each(['titolare', 'socio'] as const)('%s vede Correggi e non la riga', async (role) => {
      await apriCompletata(role)
      expect(screen.getByRole('button', { name: 'Correggi' })).toBeInTheDocument()
      expect(screen.queryByText('Per correggere la chiusura chiedi al titolare')).not.toBeInTheDocument()
    })
  })

  describe('Rimetti in programma', () => {
    async function apri(stato: 'completato' | 'disdetto' | 'programmato', role: 'titolare' | 'collaboratore') {
      const account = await createAccount('maria@salone.it', 'segretissimo')
      if (role !== 'titolare') writeJson(storageKeys.auth, { ...account, role })
      const rex = createDog(account.uid, dog('Rex'))
      const created = createAppointment(account.uid, {
        dogId: rex.id,
        start: new Date(2026, 9, 1, 9, 0, 0, 0),
        services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
      })
      if (stato === 'completato') saveClose(account.uid, created.id, { total: 50, actualDurationMin: 60, adjustmentNote: 'x', paymentMethod: 'contanti' }, true)
      if (stato === 'disdetto') setAppointmentStatus(account.uid, created.id, 'disdetto', 'cliente')
      const user = userEvent.setup()
      render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
      if (stato === 'completato' && role === 'collaboratore') {
        await screen.findByRole('button', { name: 'Aggiungi nota' })
        return { user, account, id: created.id }
      }
      await screen.findByRole('button', { name: 'Altre azioni' })
      await user.click(screen.getByRole('button', { name: 'Altre azioni' }))
      return { user, account, id: created.id }
    }

    it('il titolare rimette in programma una completata e l’incasso sparisce', async () => {
      const { user, account, id } = await apri('completato', 'titolare')
      await user.click(screen.getByRole('button', { name: 'Rimetti in programma' }))
      expect(screen.getByText('Rimettere la visita in programma?')).toBeInTheDocument()
      expect(screen.getByText('L’incasso registrato verrà tolto.')).toBeInTheDocument()
      await user.click(within(screen.getByRole('dialog', { name: 'Rimettere la visita in programma?' })).getByRole('button', { name: 'Rimetti in programma' }))
      const salvata = storedAppointments(account.uid).find((item) => item.id === id)
      expect(salvata?.status).toBe('programmato')
      expect(salvata?.total).toBeUndefined()
      expect(salvata?.paymentMethod).toBeUndefined()
    })

    it('il collaboratore non vede la voce su una completata', async () => {
      await apri('completato', 'collaboratore')
      expect(screen.queryByRole('button', { name: 'Rimetti in programma' })).not.toBeInTheDocument()
    })

    it('il collaboratore rimette in programma una disdetta, senza la frase sull’incasso', async () => {
      const { user, account, id } = await apri('disdetto', 'collaboratore')
      await user.click(screen.getByRole('button', { name: 'Rimetti in programma' }))
      expect(screen.queryByText('L’incasso registrato verrà tolto.')).not.toBeInTheDocument()
      await user.click(within(screen.getByRole('dialog', { name: 'Rimettere la visita in programma?' })).getByRole('button', { name: 'Rimetti in programma' }))
      expect(storedAppointments(account.uid).find((item) => item.id === id)?.status).toBe('programmato')
    })

    it('una visita in programma non ha la voce', async () => {
      await apri('programmato', 'titolare')
      expect(screen.queryByRole('button', { name: 'Rimetti in programma' })).not.toBeInTheDocument()
    })
  })

  describe('Collaboratore alla chiusura', () => {
    async function chiudi(role: 'titolare' | 'collaboratore') {
      pianoPlus.acceso = true
      const account = await createAccount('maria@salone.it', 'segretissimo')
      if (role !== 'titolare') writeJson(storageKeys.auth, { ...account, role })
      const rex = createDog(account.uid, dog('Rex', { contact: { name: 'Ada', phone: '333', email: 'ada@cliente.it' } }))
      const created = createAppointment(account.uid, {
        dogId: rex.id,
        start: new Date(2026, 9, 1, 9, 0, 0, 0),
        services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
      })
      writeJson(storageKeys.settings(account.uid), {
        ...getSettings(account.uid),
        fedeltaAccesa: true,
        premiInAttesa: { [rex.id]: true },
        serviziEmail: { pronto: { modo: 'manuale' } },
      })
      const user = userEvent.setup()
      render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
      await user.click(await screen.findByRole('button', { name: 'Completato' }))
      await user.click(screen.getByRole('button', { name: 'POS' }))
      await user.click(screen.getByRole('button', { name: 'Nessuna modifica' }))
      return { account, rex, id: created.id }
    }

    it('il collaboratore chiude senza applicare il premio né proporre la mail', async () => {
      const { account, rex, id } = await chiudi('collaboratore')
      const salvata = storedAppointments(account.uid).find((item) => item.id === id)
      expect(salvata?.status).toBe('completato')
      expect(salvata?.total).not.toBe(0)
      expect(salvata?.adjustmentNote).not.toBe('Premio fedeltà')
      expect(getSettings(account.uid).premiInAttesa).toEqual({ [rex.id]: true })
      expect(screen.queryByText('Salvataggio non riuscito')).not.toBeInTheDocument()
      expect(screen.queryByRole('dialog', { name: 'Cane pronto' })).not.toBeInTheDocument()
    })

    it('il titolare applica il premio e gli viene proposta la mail', async () => {
      const { account, id } = await chiudi('titolare')
      const salvata = storedAppointments(account.uid).find((item) => item.id === id)
      expect(salvata).toMatchObject({ status: 'completato', total: 0 })
      expect(getSettings(account.uid).premiInAttesa).toEqual({})
      expect(screen.getByRole('dialog', { name: 'Cane pronto' })).toBeInTheDocument()
    })

    it('il collaboratore non vede Elimina in Altre azioni, il titolare sì', async () => {
      const account = await createAccount('maria@salone.it', 'segretissimo')
      writeJson(storageKeys.auth, { ...account, role: 'collaboratore' })
      const rex = createDog(account.uid, dog('Rex'))
      const created = createAppointment(account.uid, {
        dogId: rex.id,
        start: new Date(2026, 9, 1, 9, 0, 0, 0),
        services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
      })
      setAppointmentStatus(account.uid, created.id, 'disdetto', 'cliente')
      const user = userEvent.setup()
      render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
      await user.click(await screen.findByRole('button', { name: 'Altre azioni' }))
      expect(screen.getByRole('button', { name: 'Rimetti in programma' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Elimina' })).not.toBeInTheDocument()
    })

    it('senza voci il pulsante Altre azioni del collaboratore non c’è', async () => {
      const account = await createAccount('maria@salone.it', 'segretissimo')
      writeJson(storageKeys.auth, { ...account, role: 'collaboratore' })
      const rex = createDog(account.uid, dog('Rex'))
      const created = createAppointment(account.uid, {
        dogId: rex.id,
        start: new Date(2026, 9, 1, 9, 0, 0, 0),
        services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
      })
      render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
      await screen.findByRole('button', { name: 'Completato' })
      expect(screen.queryByRole('button', { name: 'Altre azioni' })).not.toBeInTheDocument()
    })

    it('il titolare vede Elimina in Altre azioni', async () => {
      const account = await createAccount('maria@salone.it', 'segretissimo')
      const rex = createDog(account.uid, dog('Rex'))
      const created = createAppointment(account.uid, {
        dogId: rex.id,
        start: new Date(2026, 9, 1, 9, 0, 0, 0),
        services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
      })
      const user = userEvent.setup()
      render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
      await user.click(await screen.findByRole('button', { name: 'Altre azioni' }))
      expect(screen.getByRole('button', { name: 'Elimina' })).toBeInTheDocument()
    })
  })

  describe('−15 / +15 come il modulo', () => {
    const bagno30 = [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }]
    const feriali = [{ da: '09:00', a: '13:00' }, { da: '15:00', a: '19:00' }]
    const ORARI = { 1: feriali, 2: feriali, 3: feriali, 4: feriali, 5: feriali, 6: [{ da: '09:00', a: '13:00' }] }

    async function visita(ore: number, minuti: number, durata = 60, opzioni: { orari?: boolean } = {}) {
      const account = await createAccount('maria@salone.it', 'segretissimo')
      if (opzioni.orari) {
        pianoPlus.acceso = true
        writeJson(storageKeys.settings(account.uid), { ...getSettings(account.uid), orari: ORARI })
      }
      const rex = createDog(account.uid, dog('Rex'))
      const luna = createDog(account.uid, dog('Luna'))
      const created = createAppointment(account.uid, {
        dogId: rex.id,
        start: new Date(2026, 9, 5, ore, minuti, 0, 0),
        services: [{ ...bagno30[0], durationMin: durata }],
      })
      return { account, rex, luna, created }
    }

    const startOf = (uid: string, id: string) => new Date((JSON.parse(localStorage.getItem(storageKeys.appointments(uid))!) as Record<string, { start: string }>)[id].start)

    it('alle 19:00 «+15» è disattivato e «−15» attivo', async () => {
      const { created } = await visita(19, 0, 30)
      render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
      expect(await screen.findByRole('button', { name: 'Posticipa +15' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Anticipa −15' })).not.toBeDisabled()
    })

    it('alle 08:00 «−15» è disattivato', async () => {
      const { created } = await visita(8, 0, 30)
      render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
      expect(await screen.findByRole('button', { name: 'Anticipa −15' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Posticipa +15' })).not.toBeDisabled()
    })

    it('una visita salvata alle 19:45 ha «+15» disattivato e «−15» attivo', async () => {
      const { created } = await visita(19, 45, 30)
      render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
      expect(await screen.findByRole('button', { name: 'Posticipa +15' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Anticipa −15' })).not.toBeDisabled()
    })

    it('con un’altra visita alle 11:00 «+15» chiede, Annulla non sposta, Sposta comunque porta a 10:15', async () => {
      const { account, luna, created } = await visita(10, 0, 60)
      createAppointment(account.uid, { dogId: luna.id, start: new Date(2026, 9, 5, 11, 0, 0, 0), services: bagno30 })
      const user = userEvent.setup()
      render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
      await user.click(await screen.findByRole('button', { name: 'Posticipa +15' }))
      const dialog = screen.getByRole('dialog', { name: 'Orario già occupato' })
      expect(dialog).toHaveTextContent('Si sovrappone a Luna 11:00–11:30')
      await user.click(within(dialog).getByRole('button', { name: 'Annulla' }))
      expect(screen.queryByRole('dialog', { name: 'Orario già occupato' })).not.toBeInTheDocument()
      expect(startOf(account.uid, created.id).getMinutes()).toBe(0)
      await user.click(screen.getByRole('button', { name: 'Posticipa +15' }))
      await user.click(within(screen.getByRole('dialog', { name: 'Orario già occupato' })).getByRole('button', { name: 'Sposta comunque' }))
      expect(startOf(account.uid, created.id).getHours()).toBe(10)
      expect(startOf(account.uid, created.id).getMinutes()).toBe(15)
      expect(within(screen.getByRole('status')).getByRole('button', { name: 'Annulla' })).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent(/10:15/)
    })

    it('con gli orari 9–13/15–19 e una visita 12:00–13:00 «+15» avvisa che finisce dopo la chiusura', async () => {
      const { account, created } = await visita(12, 0, 60, { orari: true })
      const user = userEvent.setup()
      render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
      await user.click(await screen.findByRole('button', { name: 'Posticipa +15' }))
      const dialog = screen.getByRole('dialog', { name: 'Fuori dall\'orario del salone' })
      expect(dialog).toHaveTextContent('Finisce dopo la chiusura delle 13:00')
      expect(screen.queryByRole('dialog', { name: 'Orario già occupato' })).not.toBeInTheDocument()
      expect(startOf(account.uid, created.id).getHours()).toBe(12)
      expect(startOf(account.uid, created.id).getMinutes()).toBe(0)
    })

    describe('nel Salone con due persone', () => {
      beforeEach(async () => {
        vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-key')
        const client = await import('../data/firebase/client')
        vi.spyOn(client, 'watchAuth').mockImplementation(async () => () => {})
        vi.spyOn(client, 'listenClosures').mockImplementation(async () => () => {})
      })

      afterEach(() => {
        vi.restoreAllMocks()
        vi.unstubAllEnvs()
        salonDesk.access = null
      })

      it('la visita accanto è di un collega: «+15» sposta subito senza dialogo', async () => {
        const { account, luna, created } = await visita(10, 0, 60)
        createAppointment(account.uid, { dogId: luna.id, start: new Date(2026, 9, 5, 11, 0, 0, 0), services: bagno30, assigneeUid: 'anna' })
        salonDesk.access = {
          enabled: true,
          openInviteExpiries: [],
          members: [
            { uid: account.uid, email: 'maria@salone.it', role: 'titolare', firstName: 'Maria', lastName: 'Verdi', status: 'attivo' },
            { uid: 'anna', email: 'anna@salone.it', role: 'collaboratore', firstName: 'Anna', lastName: 'Rossi', status: 'attivo' },
          ],
        } satisfies SalonAccess
        const user = userEvent.setup()
        render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
        await user.click(await screen.findByRole('button', { name: 'Posticipa +15' }))
        expect(screen.queryByRole('dialog', { name: 'Orario già occupato' })).not.toBeInTheDocument()
        expect(startOf(account.uid, created.id).getMinutes()).toBe(15)
      })
    })
  })
})
