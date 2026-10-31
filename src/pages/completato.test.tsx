// @vitest-environment happy-dom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

async function finishUnchanged(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Completato' }))
  await user.click(await screen.findByRole('button', { name: 'POS' }))
  await user.click(await screen.findByRole('button', { name: 'Nessuna modifica' }))
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

  it('Completato tiene il prezzo, apre Note del lavoro e Fissa il prossimo apre il modulo', async () => {
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
    const stored = () => JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[created.id] as { status: string; total?: number; actualDurationMin?: number; adjustmentNote?: string }
    await user.click(await screen.findByRole('button', { name: 'Completato' }))
    expect(screen.getByRole('dialog', { name: 'Completare' })).toBeInTheDocument()
    expect(stored().status).toBe('programmato')
    await user.click(screen.getByRole('button', { name: 'POS' }))
    await user.click(screen.getByRole('button', { name: 'Nessuna modifica' }))
    expect(await within(screen.getByRole('dialog')).findByText('Completato')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Completare' })).not.toBeInTheDocument()
    expect(stored()).toMatchObject({ status: 'completato', actualDurationMin: 30 })
    expect(stored().total).toBeUndefined()
    expect(stored().adjustmentNote).toBeUndefined()
    expect(screen.queryByRole('button', { name: 'Completato' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Note del lavoro' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('textbox', { name: 'Strumenti' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Durata reale' })).not.toBeInTheDocument()
    expect(screen.getByText('Tempo impiegato').parentElement).toHaveTextContent('30 min')
    expect(screen.getByRole('button', { name: 'Correggi' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Anticipa/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Posticipa/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Modifica appuntamento' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Disdici' })).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[created.id].status).toBe('completato')
    expect(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[created.id].services[0].price).toBe(99)
    expect(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[created.id].actualDurationMin).toBe(30)
    await user.click(screen.getByRole('button', { name: 'Fissa il prossimo' }))
    expect(await screen.findByRole('dialog', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).toBeNull()
    const map = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string }>
    expect(Object.keys(map)).toEqual([created.id])
    expect(map[created.id].status).toBe('completato')
  })

  it('Salva e completa scrive prezzo, tempo e nota senza toccare il listino, e Correggi li riporta senza cambiare stato', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 99 }],
    })
    const stored = () => JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[created.id] as {
      status: string
      total?: number
      actualDurationMin?: number
      adjustmentNote?: string
      services: { price: number }[]
    }
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Completato' }))
    const dialog = screen.getByRole('dialog', { name: 'Completare' })
    const price = within(dialog).getByLabelText('Prezzo')
    await user.clear(price)
    await user.type(price, '70')
    const hours = within(dialog).getByLabelText('Ore')
    await user.clear(hours)
    await user.type(hours, '2')
    const minutes = within(dialog).getByLabelText('Minuti')
    await user.clear(minutes)
    await user.type(minutes, '0')
    await user.type(within(dialog).getByLabelText('Nota'), 'Pieno di nodi')
    await user.click(within(dialog).getByRole('button', { name: 'POS' }))
    await user.click(within(dialog).getByRole('button', { name: 'Salva e completa' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Completare' })).not.toBeInTheDocument())
    expect(stored()).toMatchObject({ status: 'completato', total: 70, actualDurationMin: 120, adjustmentNote: 'Pieno di nodi' })
    expect(stored().services[0].price).toBe(99)
    expect(screen.getByText('Totale').parentElement).toHaveTextContent('€ 70')
    expect(within(screen.getByText('Totale').parentElement!).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('Tempo impiegato').parentElement).toHaveTextContent('2 h 00')
    expect(screen.getByText('Pieno di nodi')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Correggi' }))
    const fix = screen.getByRole('dialog', { name: 'Correggi' })
    const fixPrice = within(fix).getByLabelText('Prezzo')
    expect(fixPrice).toHaveValue('70')
    await user.clear(fixPrice)
    await user.type(fixPrice, '99')
    const fixHours = within(fix).getByLabelText('Ore')
    await user.clear(fixHours)
    await user.type(fixHours, '0')
    const fixMinutes = within(fix).getByLabelText('Minuti')
    await user.clear(fixMinutes)
    await user.type(fixMinutes, '30')
    await user.click(within(fix).getByRole('button', { name: 'Salva' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Correggi' })).not.toBeInTheDocument())
    expect(stored().status).toBe('completato')
    expect(stored().total).toBeUndefined()
    expect(stored().adjustmentNote).toBe('Pieno di nodi')
    expect(stored().actualDurationMin).toBe(30)
  })

  it('la X del popup Completare lascia programmato, e domani Completato è spento e non apre il popup', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const line = [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }]
    const today = createAppointment(account.uid, { dogId: luna.id, start: new Date(2026, 9, 3, 9, 30, 0, 0), services: line })
    const tomorrow = createAppointment(account.uid, { dogId: luna.id, start: new Date(2026, 9, 4, 9, 30, 0, 0), services: line })
    const status = (id: string) => (JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[id] as { status: string }).status
    const user = userEvent.setup()
    const first = render(<App memory isDev={false} initialPath={`/appuntamenti/${today.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Completato' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Completare' })).getByRole('button', { name: 'Chiudi' }))
    expect(screen.queryByRole('dialog', { name: 'Completare' })).not.toBeInTheDocument()
    expect(status(today.id)).toBe('programmato')
    first.unmount()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${tomorrow.id}`} />)
    const button = await screen.findByRole('button', { name: 'Completato' })
    expect(button).toBeDisabled()
    await user.click(button)
    expect(screen.queryByRole('dialog', { name: 'Completare' })).not.toBeInTheDocument()
    expect(status(tomorrow.id)).toBe('programmato')
  })

  it('Fissa il prossimo apre il modulo con cane e servizi e senza data', async () => {
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
    const dialog = await screen.findByRole('dialog', { name: 'Nuovo appuntamento' })
    expect(dialog).toBeInTheDocument()
    expect(screen.queryByRole('status')).toBeNull()
    expect(Object.keys(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!))).toHaveLength(1)
    expect(await within(dialog).findByText('Luna')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Bagno · / })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Giorno')).toHaveValue('')
    expect(screen.getByRole('button', { name: '09:30' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('Fissa il prossimo di una serie salva il nuovo con lo stesso seriesId', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
      seriesId: 'serie-1',
    })
    completeAppointment(account.uid, created.id)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Fissa il prossimo' }))
    expect(await screen.findByRole('dialog', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).toBeNull()
    fireEvent.change(screen.getByLabelText('Giorno'), { target: { value: '2026-11-02' } })
    await user.click(screen.getByRole('button', { name: '09:30' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    const map = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string; seriesId?: string }>
    const next = Object.values(map).find((item) => item.status === 'programmato')
    expect(next?.seriesId).toBe('serie-1')
    expect(screen.queryByText(/^Fissato per/)).not.toBeInTheDocument()
  })

  it('Fissa il prossimo di una serie senza lo stesso cane non copia seriesId', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    createDog(account.uid, dog('Ercole'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
      seriesId: 'serie-1',
    })
    completeAppointment(account.uid, created.id)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Fissa il prossimo' }))
    expect(await screen.findByRole('dialog', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cambia cane' }))
    await user.type(screen.getByLabelText(/cerca cane/i), 'Erc')
    await user.click(screen.getByRole('button', { name: 'Ercole' }))
    fireEvent.change(screen.getByLabelText('Giorno'), { target: { value: '2026-11-02' } })
    await user.click(screen.getByRole('button', { name: '09:30' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    const map = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string; seriesId?: string }>
    const next = Object.values(map).find((item) => item.status === 'programmato')
    expect(next?.seriesId).toBeUndefined()
  })

  it('Fissa il prossimo di un ritmo apre il modulo senza scrivere il 26 febbraio', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 0, 21, 12, 0, 0, 0))
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna', { clientType: 'mensile', recurrenceWeeks: 4 }))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 0, 20, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
      cycleAnchor: 'ritmo',
      coveredDue: new Date(2026, 0, 29, 9, 30, 0, 0),
    })
    completeAppointment(account.uid, created.id)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Fissa il prossimo' }))
    expect(await screen.findByRole('dialog', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Cane Mensile' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Giorno')).toHaveValue('')
    expect(screen.queryByRole('status')).toBeNull()
    const stored = Object.values(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string; start: string }>)
    expect(stored.filter((item) => item.status === 'programmato')).toHaveLength(0)
    expect(stored.some((item) => new Date(item.start).getTime() === new Date(2026, 1, 26, 9, 30, 0, 0).getTime())).toBe(false)
    vi.useRealTimers()
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
    const programmed = () => Object.values(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string }>).filter((item) => item.status === 'programmato')
    await user.click(await screen.findByRole('button', { name: 'Fissa il prossimo' }))
    expect(screen.getByText('Ercole ha già un appuntamento il 22 ott. Crearne un altro?')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Nuovo appuntamento' })).not.toBeInTheDocument()
    expect(Object.keys(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!))).toHaveLength(2)
    expect(programmed()).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Non creare' }))
    expect(screen.queryByRole('dialog', { name: 'Nuovo appuntamento' })).not.toBeInTheDocument()
    expect(programmed()).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Fissa il prossimo' }))
    await user.click(screen.getByRole('button', { name: 'Crea' }))
    expect(await screen.findByRole('dialog', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).toBeNull()
    expect(Object.keys(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!))).toHaveLength(2)
    expect(programmed()).toHaveLength(1)
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
      await finishUnchanged(user)
      expect(await screen.findByText('Salvataggio non riuscito')).toBeInTheDocument()
      expect(screen.getByRole('dialog', { name: 'Completare' })).toBeInTheDocument()
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
      await user.click(await screen.findByRole('button', { name: 'POS' }))
      await user.click(await screen.findByRole('button', { name: 'Nessuna modifica' }))
      expect(await within(screen.getByRole('dialog')).findByText('Completato')).toBeInTheDocument()
      expect(JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[item.id].status).toBe('completato')
      view.unmount()
    }
  })

  it('la scheda dice Da chiudere un’ora dopo la fine, non appena l’ora è passata', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const line = [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }]
    const due = createAppointment(account.uid, { dogId: luna.id, start: new Date(2026, 9, 3, 8, 0, 0, 0), services: line })
    const waiting = createAppointment(account.uid, { dogId: luna.id, start: new Date(2026, 9, 3, 11, 0, 0, 0), services: line })
    const first = render(<App memory isDev={false} initialPath={`/appuntamenti/${due.id}`} />)
    expect(await screen.findByText('Da chiudere')).toBeInTheDocument()
    first.unmount()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${waiting.id}`} />)
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
    const orario = await screen.findByTestId('riquadro-orario')
    expect(within(orario).getByText('10:00')).toBeInTheDocument()
    expect(within(orario).getByText('Sab 10 ott · fino 12:00 · 120 min')).toBeInTheDocument()
    expect(screen.queryByText('Data')).not.toBeInTheDocument()
    expect(screen.queryByText('Telefono')).not.toBeInTheDocument()
    expect(screen.getByText('€ 20')).toBeInTheDocument()
    expect(screen.getByText('€ 30')).toBeInTheDocument()
    expect(screen.getByText('€ 50')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anticipa −15' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Posticipa +15' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Modifica appuntamento' })).toBeInTheDocument()
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

  it('Fissa il prossimo apre il modulo senza scrivere, e il completato resta', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await finishUnchanged(user)
    await within(screen.getByRole('dialog')).findByText('Completato')
    const original = localStorage.setItem.bind(localStorage)
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (String(key).endsWith('.appointments')) throw new Error('pieno')
      original(String(key), String(value))
    })
    try {
      await user.click(screen.getByRole('button', { name: 'Fissa il prossimo' }))
      expect(await screen.findByRole('dialog', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
      expect(screen.queryByText('Salvataggio non riuscito')).not.toBeInTheDocument()
      expect(screen.queryByRole('status')).toBeNull()
      const map = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string }>
      expect(Object.keys(map)).toEqual([created.id])
      expect(map[created.id].status).toBe('completato')
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
    await finishUnchanged(user)
    await user.click(await screen.findByRole('button', { name: 'Fissa il prossimo' }))
    expect(await screen.findByRole('dialog', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).toBeNull()
    fireEvent.change(screen.getByLabelText('Giorno'), { target: { value: '2026-11-02' } })
    await user.click(screen.getByRole('button', { name: '09:30' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent(/Appuntamento salvato/)
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

  it('Fissa il prossimo da un completato passato apre il modulo senza data', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 7, 5, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await finishUnchanged(user)
    await user.click(await screen.findByRole('button', { name: 'Fissa il prossimo' }))
    expect(await screen.findByRole('dialog', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByLabelText('Giorno')).toHaveValue('')
    const map = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!) as Record<string, { status: string, start: string }>
    expect(Object.keys(map)).toEqual([created.id])
    expect(Object.values(map).some((item) => new Date(item.start).getTime() === new Date(2026, 8, 2, 9, 30, 0, 0).getTime())).toBe(false)
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
    expect(await screen.findByRole('heading', { name: 'Mensili' })).toBeInTheDocument()
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

  it('sulle note di un completato c’è la pill Completato e il tempo impiegato ha il suffisso min', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    completeAppointment(account.uid, created.id)
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    const notes = await screen.findByRole('button', { name: 'Note del lavoro' })
    expect(notes).toHaveAttribute('aria-expanded', 'true')
    const pill = within(notes.parentElement!).getByText('Completato')
    expect(pill.getAttribute('style')).toContain('background: var(--ok-s)')
    expect(screen.queryByRole('textbox', { name: 'Durata reale' })).not.toBeInTheDocument()
    expect(screen.getByText('Tempo impiegato').parentElement).toHaveTextContent(/min/)
  })

  it('Correggi cambia il tempo lasciando lo stato completato', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const created = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 9, 3, 9, 30, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/appuntamenti/${created.id}`} />)
    await finishUnchanged(user)
    await user.click(await screen.findByRole('button', { name: 'Correggi' }))
    const fix = screen.getByRole('dialog', { name: 'Correggi' })
    const minutes = within(fix).getByLabelText('Minuti')
    await user.clear(minutes)
    await user.type(minutes, '45')
    await user.type(within(fix).getByLabelText('Nota'), 'Cane agitato')
    await user.click(within(fix).getByRole('button', { name: 'Salva' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Correggi' })).not.toBeInTheDocument())
    const stored = JSON.parse(localStorage.getItem(storageKeys.appointments(account.uid))!)[created.id] as { status: string, actualDurationMin?: number, adjustmentNote?: string }
    expect(stored.status).toBe('completato')
    expect(stored.actualDurationMin).toBe(45)
    expect(stored.adjustmentNote).toBe('Cane agitato')
    expect(screen.getByText('Tempo impiegato').parentElement).toHaveTextContent('45 min')
  })
})
