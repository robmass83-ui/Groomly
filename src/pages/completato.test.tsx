// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { createDog } from '../data/local/dogs'
import { completeAppointment, createAppointment } from '../data/local/appointments'
import { storageKeys } from '../data/local/storage'
import type { DogWrite } from '../types/models'

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

describe('completato', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 3, 12, 0, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('Completato tiene il prezzo, apre Note del lavoro e Fissa il prossimo copia le righe', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 99 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    expect(screen.getByRole('button', { name: 'Note del lavoro' })).toHaveAttribute('aria-expanded', 'false')
    await user.click(await screen.findByRole('button', { name: 'Completato' }))
    expect(await screen.findByText('Completato')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Completato' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Note del lavoro' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('textbox', { name: 'Strumenti' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Durata reale' })).toHaveValue('30')
    expect(screen.queryByRole('button', { name: /^Anticipa/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Posticipa/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Modifica' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Disdici' })).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[created.id].status).toBe('completato')
    expect(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[created.id].services[0].price).toBe(99)
    expect(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[created.id].actualDurationMin).toBe(30)
    await user.click(screen.getByRole('button', { name: 'Fissa il prossimo' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Fissato per sab 31 ott 09:30')
    const map = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string, services: { price: number }[], start: string }>
    expect(Object.keys(map)).toHaveLength(2)
    const createdNext = Object.values(map).find((item) => item.status === 'programmato')
    expect(createdNext?.services[0].price).toBe(99)
    expect(new Date(createdNext!.start).getDate()).toBe(31)
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    const after = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string }>
    expect(Object.keys(after)).toEqual([created.id])
    expect(after[created.id].status).toBe('completato')
    expect(screen.getByText('Completato')).toBeInTheDocument()
  })

  it('Fissa il prossimo usa la frequenza della scheda', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna', { clientType: 'mensile', recurrenceWeeks: 6 }))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    completeAppointment(account.uid, created.id)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Fissa il prossimo' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Fissato per sab 14 nov 09:30')
  })

  it('Fissa il prossimo con un futuro già presente chiede conferma e non scrive prima', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const ercole = createDog(account.uid, dog('Ercole'))
    const source = createAppointment(account.uid, {
      dogId: ercole.id,
      start: new Date(2026, 9, 3, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    createAppointment(account.uid, {
      dogId: ercole.id,
      start: new Date(2026, 9, 22, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    completeAppointment(account.uid, source.id)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${source.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Fissa il prossimo' }))
    expect(screen.getByText('Ercole ha già un appuntamento il 22 ott. Crearne un altro?')).toBeInTheDocument()
    expect(Object.keys(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!))).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Non creare' }))
    expect(Object.keys(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!))).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Fissa il prossimo' }))
    await user.click(screen.getByRole('button', { name: 'Crea' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Fissato per sab 31 ott 09:30')
    expect(Object.keys(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!))).toHaveLength(3)
  })

  it('se completare fallisce resta il bottone e non compare Fissa il prossimo', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const original = localStorage.setItem.bind(localStorage)
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (String(key).endsWith('.appointments')) throw new Error('pieno')
      original(String(key), String(value))
    })
    try {
      const user = userEvent.setup()
      render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
      await user.click(await screen.findByRole('button', { name: 'Completato' }))
      expect(await screen.findByText('Salvataggio non riuscito')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Completato' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Fissa il prossimo' })).not.toBeInTheDocument()
    } finally {
      spy.mockRestore()
    }
    expect(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[created.id].status).toBe('programmato')
  })

  it('Completato vale oggi a qualsiasi ora e nei giorni passati, ed è spento da domani', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const line = [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }]
    const early = createAppointment(account.uid, { dogId: luna.id, start: new Date(2026, 9, 3, 8, 0, 0, 0), services: line })
    const late = createAppointment(account.uid, { dogId: luna.id, start: new Date(2026, 9, 3, 18, 30, 0, 0), services: line })
    const past = createAppointment(account.uid, { dogId: luna.id, start: new Date(2026, 8, 5, 9, 0, 0, 0), services: line })
    const tomorrow = createAppointment(account.uid, { dogId: luna.id, start: new Date(2026, 9, 4, 9, 0, 0, 0), services: line })
    const user = userEvent.setup()
    const first = render(<App memory isDev={false} initialPath={`/appuntamenti/${tomorrow.id}`} />)
    expect(await screen.findByRole('button', { name: 'Completato' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Completato' }))
    expect(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[tomorrow.id].status).toBe('programmato')
    first.unmount()
    for (const item of [early, late, past]) {
      const view = render(<App memory isDev={false} initialPath={`/appuntamenti/${item.id}`} />)
      const button = await screen.findByRole('button', { name: 'Completato' })
      expect(button).toBeEnabled()
      await user.click(button)
      expect(await within(screen.getByRole('dialog')).findByText('Completato')).toBeInTheDocument()
      expect(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[item.id].status).toBe('completato')
      view.unmount()
    }
  })

  it('un programmato di ieri è da chiudere, uno di oggi con l’ora passata no', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const line = [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }]
    const yesterday = createAppointment(account.uid, { dogId: luna.id, start: new Date(2026, 9, 2, 9, 0, 0, 0), services: line })
    const today = createAppointment(account.uid, { dogId: luna.id, start: new Date(2026, 9, 3, 8, 0, 0, 0), services: line })
    const first = render(<App memory isDev={false} initialPath={`/appuntamenti/${yesterday.id}`} />)
    expect(await screen.findByText('Da chiudere')).toBeInTheDocument()
    first.unmount()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${today.id}`} />)
    await screen.findByRole('button', { name: 'Completato' })
    expect(screen.queryByText('Da chiudere')).not.toBeInTheDocument()
  })

  it('la scheda mostra giorno e fascia una sola volta, i servizi come scontrino e i tre bottoni uguali', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 10, 10, 0, 0, 0),
      services: [
        { serviceId: 'bagno', name: 'Bagno', durationMin: 60, price: 20 },
        { serviceId: 'taglio', name: 'Taglio', durationMin: 60, price: 30 },
      ],
    })
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    expect(await screen.findByText('Sab 10 ott · 10:00–12:00')).toBeInTheDocument()
    expect(screen.queryByText('Ora')).not.toBeInTheDocument()
    expect(screen.queryByText('Durata')).not.toBeInTheDocument()
    expect(screen.getByText('€ 20')).toBeInTheDocument()
    expect(screen.getByText('€ 30')).toBeInTheDocument()
    expect(screen.getByText('€ 50')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anticipa −15' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Posticipa +15' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Modifica' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sposta' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Disdici' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Non venuto' })).toBeInTheDocument()
  })

  it('Disdici chiede il motivo, lascia disdetto nello storico e Annulla del toast lo riporta programmato', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 15, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const stored = () => JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[created.id] as { status: string; cancelReason?: string }
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Disdici' }))
    expect(stored().status).toBe('programmato')
    const ask = screen.getByRole('dialog', { name: 'Chi disdice?' })
    expect(within(ask).queryByRole('button', { name: 'Annulla' })).not.toBeInTheDocument()
    await user.click(within(ask).getByRole('button', { name: 'Cliente' }))
    expect(stored()).toMatchObject({ status: 'disdetto', cancelReason: 'cliente' })
    expect(await screen.findByRole('status')).toHaveTextContent('Appuntamento disdetto · Annulla')
    expect(screen.getByText('Disdetto dal cliente')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Completato' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rimetti in programma' })).not.toBeInTheDocument()
    await user.click(within(screen.getByRole('status')).getByRole('button', { name: 'Annulla' }))
    expect(stored().status).toBe('programmato')
    expect(stored().cancelReason).toBeUndefined()
    expect(await screen.findByRole('button', { name: 'Completato' })).toBeInTheDocument()
  })

  it('Disdici con il salone e Non venuto scrivono i loro stati, e restano nello storico', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const line = [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }]
    const one = createAppointment(account.uid, { dogId: luna.id, start: new Date(2026, 9, 3, 15, 0, 0, 0), services: line })
    const two = createAppointment(account.uid, { dogId: luna.id, start: new Date(2026, 9, 3, 16, 0, 0, 0), services: line })
    const stored = (id: string) => JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[id] as { status: string; cancelReason?: string }
    const user = userEvent.setup()
    const first = render(<App memory isDev={false} initialPath={`/appuntamenti/${one.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Disdici' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Chi disdice?' })).getByRole('button', { name: 'Salone' }))
    expect(stored(one.id)).toMatchObject({ status: 'disdetto', cancelReason: 'salone' })
    first.unmount()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${two.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Non venuto' }))
    expect(stored(two.id).status).toBe('non_venuto')
    expect(await screen.findByRole('status')).toHaveTextContent('Non venuto · Annulla')
    expect(screen.queryByRole('button', { name: 'Rimetti in programma' })).not.toBeInTheDocument()
    await user.click(within(screen.getByRole('status')).getByRole('button', { name: 'Annulla' }))
    expect(stored(two.id).status).toBe('programmato')
    expect(Object.keys(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!))).toHaveLength(2)
  })

  it('se il chip non scrive, il completato resta', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Completato' }))
    await screen.findByText('Completato')
    const original = localStorage.setItem.bind(localStorage)
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (String(key).endsWith('.appointments')) throw new Error('pieno')
      original(String(key), String(value))
    })
    try {
      await user.click(screen.getByRole('button', { name: 'Fissa il prossimo' }))
      expect(await screen.findByText('Salvataggio non riuscito')).toBeInTheDocument()
      expect(screen.getByText('Completato')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Fissa il prossimo' })).toBeInTheDocument()
      expect(Object.keys(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!))).toEqual([created.id])
    } finally {
      spy.mockRestore()
    }
  })

  it('se Annulla non cancella, il nuovo resta e il completato pure', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Completato' }))
    await user.click(await screen.findByRole('button', { name: 'Fissa il prossimo' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Fissato per sab 31 ott 09:30')
    const original = localStorage.setItem.bind(localStorage)
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (String(key).endsWith('.appointments')) throw new Error('pieno')
      original(String(key), String(value))
    })
    try {
      await user.click(screen.getByRole('button', { name: 'Annulla' }))
      expect(await screen.findByText('Salvataggio non riuscito')).toBeInTheDocument()
      const map = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string }>
      expect(Object.keys(map)).toHaveLength(2)
      expect(map[created.id].status).toBe('completato')
    } finally {
      spy.mockRestore()
    }
  })

  it('Fissa il prossimo da un completato passato si salva lo stesso', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 7, 5, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Completato' }))
    await user.click(await screen.findByRole('button', { name: 'Fissa il prossimo' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Fissato per mer 2 set 09:30')
    const map = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string, start: string }>
    const next = Object.values(map).find((item) => item.status === 'programmato')
    expect(new Date(next!.start)).toEqual(new Date(2026, 8, 2, 9, 30, 0, 0))
  })

  it('il chip della scheda non marca completato l’appuntamento di partenza', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const source = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 17, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${rex.id}`} />)
    await user.click(await screen.findByRole('button', { name: '+2 sett' }))
    expect(screen.getByText('Rex ha già un appuntamento il 17 ott. Crearne un altro?')).toBeInTheDocument()
    expect(Object.keys(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!))).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Crea' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Fissato per sab 31 ott 09:00')
    const booked = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string }>
    expect(booked[source.id].status).toBe('programmato')
    expect(Object.values(booked).filter((item) => item.status === 'programmato')).toHaveLength(2)
  })

  it('senza aperti la scheda dice Nessun appuntamento e il chip parte dal completato', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const source = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 9, 17, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    completeAppointment(account.uid, source.id)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${rex.id}`} />)
    expect(await screen.findByText('Nessun appuntamento')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '+2 sett' }))
    const again = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string, start: string }>
    expect(again[source.id].status).toBe('completato')
    const next = Object.values(again).find((item) => item.status === 'programmato')
    expect(new Date(next!.start).getDate()).toBe(31)
  })

  it('un mensile il cui unico futuro è completato non è in nessun gruppo, e Oggi lo tiene', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna', { clientType: 'mensile' }))
    const future = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 17, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const today = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    completeAppointment(account.uid, future.id)
    completeAppointment(account.uid, today.id)
    const first = render(<App memory isDev={false} initialPath="/mensili" />)
    expect(await screen.findByRole('heading', { name: 'Clienti mensili' })).toBeInTheDocument()
    expect(screen.queryByText('Luna')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'In ritardo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'In scadenza questa settimana' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Nuovi' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Fissati' })).not.toBeInTheDocument()
    first.unmount()
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('button', { name: 'Apri Luna' })).toBeInTheDocument()
    expect(screen.queryByText('Nessun appuntamento')).not.toBeInTheDocument()
  })

  it('correggere la durata reale lascia lo stato completato', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Completato' }))
    const field = await screen.findByRole('textbox', { name: 'Durata reale' })
    await user.clear(field)
    await user.type(field, '45')
    await user.tab()
    const stored = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[created.id] as { status: string, actualDurationMin?: number }
    expect(stored.status).toBe('completato')
    expect(stored.actualDurationMin).toBe(45)
  })
})
