// @vitest-environment happy-dom
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import logoTestata from '../assets/brand/groomly-logo-testata.svg'
import { App } from '../app/App'
import { completeAppointment, createAppointment } from '../data/local/appointments'
import { createAccount } from '../data/local/auth'
import { createDog } from '../data/local/dogs'
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

async function enter(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'maria@salone.it')
  await user.type(screen.getByLabelText('Password'), 'segretissimo')
  await user.click(screen.getByRole('button', { name: 'Crea accesso' }))
  await screen.findByRole('heading', { name: 'Groomly' })
}

describe('guscio', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 9, 1, 12))
  })

  it('mostra la data, nasconde il campanello e apre Animali dalla ricerca', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    expect(screen.getByText('Giovedì 1 ottobre')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Notifiche' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Avvisi' })).toBeInTheDocument()
    expect(screen.queryByTestId('bell-dot')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cerca' }))
    expect(await screen.findByRole('heading', { name: 'Animali' })).toBeInTheDocument()
    expect(screen.getByText('0 attivi · 0 in archivio')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aggiungi il primo cane' })).toBeInTheDocument()
    expect(screen.queryByText('Nessun cane')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Cerca' })).toHaveFocus())
    expect(screen.queryByText('In arrivo')).not.toBeInTheDocument()
  })

  it('in Home il logo grande è il titolo e sotto c’è la data', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    const heading = screen.getByRole('heading', { name: 'Groomly' })
    const logo = within(heading).getByRole('img', { name: 'Groomly' })
    expect(logo).toHaveAttribute('src', logoTestata)
    expect(logo).toHaveAttribute('height', '44')
    expect(heading.closest('header')).toHaveTextContent('Giovedì 1 ottobre')
    expect(screen.queryByText(/^Ciao/)).not.toBeInTheDocument()
  })

  it('nelle altre pagine il logo sta sopra il titolo', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    await user.click(screen.getByRole('link', { name: 'Animali' }))
    const title = await screen.findByRole('heading', { name: 'Animali' })
    const header = title.closest('header')!
    const logo = within(header).getByRole('img', { name: 'Groomly' })
    expect(logo).toHaveAttribute('height', '30')
    expect(logo.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await user.click(screen.getByRole('link', { name: 'Agenda' }))
    await screen.findByRole('heading', { name: 'Ottobre 2026' })
    expect(screen.getByRole('img', { name: 'Groomly' })).toHaveAttribute('height', '30')
  })

  it('nuovo appuntamento apre il modulo', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    await user.click(screen.getByRole('button', { name: 'Aggiungi' }))
    await user.click(screen.getByRole('button', { name: 'Appuntamento' }))
    expect(await screen.findByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('il «+» offre Appuntamento prima di Animale, due bottoni grandi', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    await user.click(screen.getByRole('button', { name: 'Aggiungi' }))
    const appointment = screen.getByRole('button', { name: 'Appuntamento' })
    const animal = screen.getByRole('button', { name: 'Animale' })
    expect(appointment.compareDocumentPosition(animal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    for (const button of [appointment, animal]) {
      expect(button.getAttribute('style')).toContain('min-height: 44px')
      expect(button.getAttribute('style')).toContain('width: 100%')
    }
    expect(appointment.parentElement?.getAttribute('style')).toContain('gap: 8px')
  })

  it('il campanello segna i mensili in arrivo e la riga di oggi apre la scheda', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const birba = createDog(account.uid, dog('Birba'))
    const luna = createDog(account.uid, dog('Luna', { clientType: 'mensile' }))
    const done = createAppointment(account.uid, {
      dogId: luna.id,
      start: new Date(2026, 7, 1, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    completeAppointment(account.uid, done.id)
    createAppointment(account.uid, {
      dogId: birba.id,
      start: new Date(2026, 9, 1, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 45, price: 20 }],
    })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    expect(await screen.findByRole('heading', { name: 'Groomly' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Avvisi' })).toHaveAttribute('href', '/mensili')
    expect(screen.getByTestId('bell-dot')).toBeInTheDocument()
    expect(screen.getByText('scadono entro 7 gg')).toBeInTheDocument()
    expect(screen.getByText('Cerca cane, proprietario, razza…')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Oggi/ })).toHaveAttribute('href', '/calendario?data=2026-10-01')
    expect(screen.getByText('1 · 45m')).toBeInTheDocument()
    expect(screen.getByText('0/1')).toBeInTheDocument()
    expect(screen.getByText('Mensili ott')).toBeInTheDocument()
    expect(screen.getByText('Apri')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Calendario ›' })).toHaveAttribute('href', '/calendario?data=2026-10-01')
    expect(screen.queryByRole('heading', { name: 'Visti di recente' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Apri Birba' }))
    expect(screen.getByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    const back = screen.getByRole('link', { name: 'Indietro' })
    expect(back.closest('header')).toBeNull()
    expect(screen.getByTestId('back-bar')).toContainElement(back)
    await user.click(back)
    await user.click(await screen.findByRole('link', { name: 'Home' }))
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Visti di recente' })).not.toBeInTheDocument()
  })

  it('nuovo cane apre la scheda vuota', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    await user.click(screen.getByRole('button', { name: 'Aggiungi' }))
    await user.click(screen.getByRole('button', { name: 'Animale' }))
    expect(await screen.findByRole('heading', { name: 'Nuovo cane' })).toBeInTheDocument()
    const back = screen.getByRole('link', { name: 'Indietro' })
    expect(back.closest('header')).toBeNull()
    expect(screen.getByTestId('back-bar')).toContainElement(back)
    await user.click(back)
    expect(await screen.findByRole('heading', { name: 'Animali' })).toBeInTheDocument()
  })
})

afterEach(() => {
  vi.useRealTimers()
})
