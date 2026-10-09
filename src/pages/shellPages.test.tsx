// @vitest-environment happy-dom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import brandIcon from '../assets/brand/groomly-icon.svg'
import { App } from '../app/App'
import { createAppointment } from '../data/local/appointments'
import { createAccount } from '../data/local/auth'
import { archiveDog, createDog } from '../data/local/dogs'
import { getSettings, rememberDog } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'
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
    expect(screen.getByText('Nessun cane')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Cerca' })).toHaveFocus())
    expect(screen.queryByText('In arrivo')).not.toBeInTheDocument()
  })

  it('mostra l’icona rotonda accanto al titolo', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    const header = screen.getByRole('heading', { name: 'Groomly' }).closest('header')
    const img = header?.querySelector('img')
    expect(img).toHaveAttribute('src', brandIcon)
    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveAttribute('width', '26')
    expect(img).toHaveAttribute('height', '26')
  })

  it('nuovo appuntamento apre il modulo', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    await user.click(screen.getByRole('button', { name: 'Apri azioni' }))
    await user.click(screen.getByRole('button', { name: 'Nuovo appuntamento' }))
    expect(await screen.findByRole('heading', { name: 'Nuovo appuntamento' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('il campanello segna i mensili in arrivo e la riga di oggi apre la scheda', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const birba = createDog(account.uid, dog('Birba'))
    createDog(account.uid, dog('Luna', { clientType: 'mensile' }))
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
    await user.click(screen.getByRole('link', { name: 'Indietro' }))
    await user.click(await screen.findByRole('link', { name: 'Home' }))
    expect(await screen.findByRole('heading', { name: 'Visti di recente' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tutti 2 ›' })).toHaveAttribute('href', '/animali')
    expect(screen.getByRole('link', { name: /Birba/ })).toHaveAttribute('href', `/animali/${birba.id}`)
  })

  it('i recenti saltano un assente e un archiviato', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const birba = createDog(account.uid, dog('Birba'))
    const nero = createDog(account.uid, dog('Nero'))
    archiveDog(account.uid, nero.id, 'deceduto')
    const settings = rememberDog(rememberDog(rememberDog(getSettings(account.uid), 'mancante'), nero.id), birba.id)
    writeJson(storageKeys.settings(account.uid), settings)
    render(<App memory isDev={false} />)
    expect(await screen.findByRole('heading', { name: 'Visti di recente' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Birba/ })).toHaveAttribute('href', `/animali/${birba.id}`)
    expect(screen.queryByText('Nero')).not.toBeInTheDocument()
    expect(screen.queryByText('mancante')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tutti 1 ›' })).toHaveAttribute('href', '/animali')
  })

  it('nuovo cane apre la scheda vuota', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    await user.click(screen.getByRole('button', { name: 'Apri azioni' }))
    await user.click(screen.getByRole('button', { name: 'Nuovo cane' }))
    expect(await screen.findByRole('heading', { name: 'Nuovo cane' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Indietro' }))
    expect(await screen.findByRole('heading', { name: 'Animali' })).toBeInTheDocument()
  })
})

afterEach(() => {
  vi.useRealTimers()
})
