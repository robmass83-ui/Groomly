// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
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

  it('Completato tiene il prezzo, mostra i chip, e +4 sett copia le righe', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 99 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Completato · fissa il prossimo' }))
    expect(await screen.findByText('Completato')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Completato · fissa il prossimo' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+2 sett' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+6 sett' })).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[created.id].status).toBe('completato')
    expect(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[created.id].services[0].price).toBe(99)
    expect(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[created.id].actualDurationMin).toBe(30)
    await user.click(screen.getByRole('button', { name: '+4 sett' }))
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

  it('se completare fallisce resta il bottone e non compaiono i chip', async () => {
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
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Completato · fissa il prossimo' }))
    expect(await screen.findByText('Salvataggio non riuscito')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Completato · fissa il prossimo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+2 sett' })).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[created.id].status).toBe('programmato')
    spy.mockRestore()
  })

  it('Modifica di un completato lo lascia completato', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Completato · fissa il prossimo' }))
    await user.click(await screen.findByRole('button', { name: 'Modifica' }))
    expect(screen.queryByRole('button', { name: 'Completato · fissa il prossimo' })).not.toBeInTheDocument()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Ora' }), '11:00')
    await user.click(screen.getByRole('button', { name: 'Salva appuntamento' }))
    expect(await screen.findByText('Completato')).toBeInTheDocument()
    const stored = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[created.id] as { status: string, start: string }
    expect(stored.status).toBe('completato')
    expect(new Date(stored.start).getHours()).toBe(11)
  })

  it('se il chip non scrive, il completato e i chip restano', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Completato · fissa il prossimo' }))
    await screen.findByText('Completato')
    const original = localStorage.setItem.bind(localStorage)
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (String(key).endsWith('.appointments')) throw new Error('pieno')
      original(String(key), String(value))
    })
    await user.click(screen.getByRole('button', { name: '+2 sett' }))
    expect(await screen.findByText('Salvataggio non riuscito')).toBeInTheDocument()
    expect(screen.getByText('Completato')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+2 sett' })).toBeInTheDocument()
    expect(Object.keys(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!))).toEqual([created.id])
    spy.mockRestore()
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
    await user.click(await screen.findByRole('button', { name: 'Completato · fissa il prossimo' }))
    await user.click(await screen.findByRole('button', { name: '+4 sett' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Fissato per sab 31 ott 09:30')
    const original = localStorage.setItem.bind(localStorage)
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (String(key).endsWith('.appointments')) throw new Error('pieno')
      original(String(key), String(value))
    })
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    expect(await screen.findByText('Salvataggio non riuscito')).toBeInTheDocument()
    const map = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string }>
    expect(Object.keys(map)).toHaveLength(2)
    expect(map[created.id].status).toBe('completato')
    spy.mockRestore()
  })

  it('un +2 sett che cade ancora nel passato si salva lo stesso', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 8, 5, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Completato · fissa il prossimo' }))
    await user.click(await screen.getByRole('button', { name: '+2 sett' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Fissato per sab 19 set 09:30')
    const map = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string, start: string }>
    const next = Object.values(map).find((item) => item.status === 'programmato')
    expect(new Date(next!.start)).toEqual(new Date(2026, 8, 19, 9, 30, 0, 0))
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

  it('un mensile il cui unico futuro è completato torna Da fissare, e Oggi lo tiene', async () => {
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
    const user = userEvent.setup()
    const first = render(<App memory isDev={false} initialPath="/mensili" />)
    expect(await screen.findByRole('heading', { name: 'Clienti mensili' })).toBeInTheDocument()
    expect(screen.queryByText('Luna')).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'nov' }))
    expect(screen.getByRole('heading', { name: 'Da fissare' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Fissati' })).not.toBeInTheDocument()
    expect(screen.getByText('Luna')).toBeInTheDocument()
    expect(screen.getByText('Ultimo 17 ott · scade 14 nov')).toBeInTheDocument()
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
    await user.click(await screen.findByRole('button', { name: 'Completato · fissa il prossimo' }))
    const field = await screen.findByRole('textbox', { name: 'Durata reale' })
    await user.clear(field)
    await user.type(field, '45')
    await user.tab()
    const stored = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[created.id] as { status: string, actualDurationMin?: number }
    expect(stored.status).toBe('completato')
    expect(stored.actualDurationMin).toBe(45)
  })
})
