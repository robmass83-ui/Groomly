// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { completeAppointment, createAppointment } from '../data/local/appointments'
import { createAccount } from '../data/local/auth'
import { archiveDog, createDog } from '../data/local/dogs'
import { getSettings, rememberDog } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'
import type { DogWrite } from '../types/models'

const LINE = [{ serviceId: 'bagno', name: 'Bagno', durationMin: 60, price: 20 }]

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

function statusOf(uid: string, id: string): { status: string; cancelReason?: string } {
  return (JSON.parse(localStorage.getItem(storageKeys.appointments(uid))!) as Record<string, { status: string; cancelReason?: string }>)[id]
}

describe('home', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 10, 12, 0, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('tiene l’ordine: Oggi, banner, Da chiudere, statistiche; i completati stanno in fondo con la spunta', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const luna = createDog(account.uid, dog('Luna'))
    const bea = createDog(account.uid, dog('Bea'))
    const ciro = createDog(account.uid, dog('Ciro'))
    const ada = createDog(account.uid, dog('Ada', { clientType: 'mensile' }))
    const rex = createDog(account.uid, dog('Rex'))
    completeAppointment(account.uid, createAppointment(account.uid, { dogId: luna.id, start: new Date(2026, 9, 10, 9, 0, 0, 0), services: LINE }).id)
    createAppointment(account.uid, { dogId: bea.id, start: new Date(2026, 9, 10, 11, 30, 0, 0), services: LINE })
    createAppointment(account.uid, { dogId: ciro.id, start: new Date(2026, 9, 10, 14, 0, 0, 0), services: LINE })
    completeAppointment(account.uid, createAppointment(account.uid, { dogId: ada.id, start: new Date(2026, 7, 1, 9, 0, 0, 0), services: LINE }).id)
    createAppointment(account.uid, { dogId: rex.id, start: new Date(2026, 9, 8, 9, 0, 0, 0), services: LINE })
    render(<App memory isDev={false} initialPath="/" />)
    const oggi = await screen.findByRole('heading', { name: 'Oggi' })
    const banner = screen.getByRole('region', { name: 'Mensili da programmare' })
    const closing = screen.getByRole('heading', { name: 'Da chiudere (1)' })
    const stats = screen.getByText('Mensili ott')
    expect(oggi.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(banner.compareDocumentPosition(closing) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(closing.compareDocumentPosition(stats) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const labels = screen.getAllByRole('button', { name: /^Apri (Bea|Ciro|Luna)/ }).map((item) => item.getAttribute('aria-label'))
    expect(labels).toEqual(['Apri Bea', 'Apri Ciro', 'Apri Luna'])
    const lunaRow = screen.getByRole('button', { name: 'Apri Luna' }).closest('div')!
    expect(within(lunaRow).getByRole('img', { name: 'Completato' })).toBeInTheDocument()
    expect(within(screen.getByRole('button', { name: 'Apri Bea' }).closest('div')!).queryByRole('img', { name: 'Completato' })).not.toBeInTheDocument()
    const current = document.querySelectorAll('[data-current="true"]')
    expect(current).toHaveLength(1)
    expect(current[0].getAttribute('style')).toMatch(/border-left.*var\(--pri\)/)
    expect(within(current[0] as HTMLElement).getByRole('button', { name: 'Apri Bea' })).toBeInTheDocument()
  })

  it('senza un appuntamento in corso il bordo blu va al prossimo', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const bea = createDog(account.uid, dog('Bea'))
    const ciro = createDog(account.uid, dog('Ciro'))
    createAppointment(account.uid, { dogId: bea.id, start: new Date(2026, 9, 10, 9, 0, 0, 0), services: LINE })
    createAppointment(account.uid, { dogId: ciro.id, start: new Date(2026, 9, 10, 14, 0, 0, 0), services: LINE })
    render(<App memory isDev={false} initialPath="/" />)
    await screen.findByRole('heading', { name: 'Oggi' })
    const current = document.querySelectorAll('[data-current="true"]')
    expect(current).toHaveLength(1)
    expect(within(current[0] as HTMLElement).getByRole('button', { name: 'Apri Ciro' })).toBeInTheDocument()
  })

  it('Da chiudere offre Completato, Non venuto e Disdetto solo sui giorni passati', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const zoe = createDog(account.uid, dog('Zoe'))
    const past = createAppointment(account.uid, { dogId: rex.id, start: new Date(2026, 9, 8, 9, 0, 0, 0), services: LINE })
    const future = createAppointment(account.uid, { dogId: zoe.id, start: new Date(2026, 9, 20, 9, 0, 0, 0), services: LINE })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('heading', { name: 'Da chiudere (1)' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^(Completato|Non venuto|Disdetto) / })).toHaveLength(3)
    expect(screen.queryByRole('button', { name: /Zoe/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Completato Rex' }))
    expect(statusOf(account.uid, past.id).status).toBe('completato')
    expect(statusOf(account.uid, future.id).status).toBe('programmato')
    expect(screen.queryByRole('heading', { name: /Da chiudere/ })).not.toBeInTheDocument()
  })

  it('Non venuto e Disdetto usano gli stessi stati della scheda e Annulla li riporta programmato', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex'))
    const past = createAppointment(account.uid, { dogId: rex.id, start: new Date(2026, 9, 8, 9, 0, 0, 0), services: LINE })
    const other = createAppointment(account.uid, { dogId: rex.id, start: new Date(2026, 9, 7, 9, 0, 0, 0), services: LINE })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('heading', { name: 'Da chiudere (2)' })).toBeInTheDocument()
    const buttons = screen.getAllByRole('button', { name: 'Non venuto Rex' })
    await user.click(buttons[1])
    expect(statusOf(account.uid, past.id).status).toBe('non_venuto')
    expect(await screen.findByRole('status')).toHaveTextContent('Non venuto')
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    expect(statusOf(account.uid, past.id).status).toBe('programmato')
    await user.click(screen.getAllByRole('button', { name: 'Disdetto Rex' })[0])
    expect(screen.getByRole('button', { name: 'Cliente' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salone' }))
    expect(statusOf(account.uid, other.id)).toMatchObject({ status: 'disdetto', cancelReason: 'salone' })
    expect(statusOf(account.uid, past.id).status).toBe('programmato')
    expect(await screen.findByRole('heading', { name: 'Da chiudere (1)' })).toBeInTheDocument()
  })

  it('un mensile da fissare e un passato da chiudere convivono', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const ada = createDog(account.uid, dog('Ada', { clientType: 'mensile' }))
    completeAppointment(account.uid, createAppointment(account.uid, { dogId: ada.id, start: new Date(2026, 8, 1, 9, 0, 0, 0), services: LINE }).id)
    createAppointment(account.uid, { dogId: ada.id, start: new Date(2026, 9, 8, 9, 0, 0, 0), services: LINE })
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByText('1 mensile da programmare')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Da chiudere (1)' })).toBeInTheDocument()
    expect(screen.getByTestId('bell-dot')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Avvisi' })).toHaveAttribute('href', '/mensili')
  })

  it('Visti di recente compare solo con almeno 3 cani', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const dogs = ['Uno', 'Due', 'Tre'].map((name) => createDog(account.uid, dog(name)))
    writeJson(storageKeys.settings(account.uid), rememberDog(rememberDog(getSettings(account.uid), dogs[0].id), dogs[1].id))
    const first = render(<App memory isDev={false} initialPath="/" />)
    await screen.findByRole('heading', { name: 'Oggi' })
    expect(screen.queryByRole('heading', { name: 'Visti di recente' })).not.toBeInTheDocument()
    first.unmount()
    writeJson(storageKeys.settings(account.uid), rememberDog(rememberDog(rememberDog(getSettings(account.uid), dogs[0].id), dogs[1].id), dogs[2].id))
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('heading', { name: 'Visti di recente' })).toBeInTheDocument()
  })

  it('due Luna attive mostrano il mark e una archiviata non marca l’unica attiva', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const bianchi = createDog(account.uid, dog('Luna', { breed: 'Maltese', contact: { name: 'Mario Bianchi', phone: '333' } }))
    const usai = createDog(account.uid, dog('Luna', { breed: 'Barboncino', contact: { name: 'Anna Usai', phone: '333' } }))
    createAppointment(account.uid, { dogId: bianchi.id, start: new Date(2026, 9, 10, 9, 0, 0, 0), services: LINE })
    createAppointment(account.uid, { dogId: usai.id, start: new Date(2026, 9, 10, 11, 0, 0, 0), services: LINE })
    const view = render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByText('Maltese · Bianchi')).toBeInTheDocument()
    expect(screen.getByText('Barboncino · Usai')).toBeInTheDocument()
    const openers = screen.getAllByRole('button', { name: /^Apri Luna/ }).map((item) => item.getAttribute('aria-label'))
    expect(openers).toEqual(['Apri Luna, Maltese, Bianchi', 'Apri Luna, Barboncino, Usai'])
    view.unmount()

    localStorage.clear()
    const second = await createAccount('maria@salone.it', 'segretissimo')
    const active = createDog(second.uid, dog('Luna', { breed: 'Maltese', contact: { name: 'Mario Bianchi', phone: '333' } }))
    const archived = createDog(second.uid, dog('Luna', { breed: 'Barboncino', contact: { name: 'Anna Usai', phone: '333' } }))
    createAppointment(second.uid, { dogId: active.id, start: new Date(2026, 9, 10, 9, 0, 0, 0), services: LINE })
    archiveDog(second.uid, archived.id, 'non_in_cura')
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('button', { name: 'Apri Luna' })).toBeInTheDocument()
    expect(screen.queryByText('Maltese · Bianchi')).not.toBeInTheDocument()
    expect(screen.queryByText('Barboncino · Usai')).not.toBeInTheDocument()
  })
})
