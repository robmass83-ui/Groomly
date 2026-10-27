// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { completeAppointment, createAppointment } from '../data/local/appointments'
import { createAccount } from '../data/local/auth'
import { createDog } from '../data/local/dogs'
import { getSettings, type SettingsMain } from '../data/local/settings'
import { readJson, storageKeys, writeJson } from '../data/local/storage'
import type { DogWrite } from '../types/models'

function write(partial: Partial<DogWrite> & Pick<DogWrite, 'name'>): DogWrite {
  return {
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: '', phone: '333' },
    ...partial,
  }
}

function oggiRoma(adesso = new Date()): string {
  const parti = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(adesso)
  const valore = (tipo: Intl.DateTimeFormatPartTypes) => parti.find((parte) => parte.type === tipo)?.value ?? ''
  return `${valore('year')}-${valore('month')}-${valore('day')}`
}

function salvaServizi(uid: string, servizi: NonNullable<SettingsMain['serviziEmail']>, extra: Partial<SettingsMain> = {}) {
  const settings = getSettings(uid)
  writeJson(storageKeys.settings(uid), {
    ...settings,
    ...extra,
    serviziEmail: { ...settings.serviziEmail, ...servizi },
  })
}

describe('scheda del cane', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('con un servizio acceso mostra l’aiuto e l’errore solo se l’email non è vuota e non è valida', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    salvaServizi(account.uid, { promemoria: { modo: 'manuale' } })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    expect(await screen.findByRole('heading', { name: 'Nuovo cane' })).toBeInTheDocument()
    expect(screen.getByText('Qui arrivano promemoria e avvisi.')).toBeInTheDocument()
    const email = screen.getByRole('textbox', { name: 'Email' })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await user.type(email, 'maria@salon')
    expect(screen.getByRole('alert')).toHaveTextContent('Inserisci un’email valida')
    await user.clear(email)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await user.type(email, 'maria@salon.it')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('con i servizi email spenti il campo non c’è, nemmeno se è accesa solo la fedeltà', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    expect(await screen.findByRole('heading', { name: 'Nuovo cane' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Email' })).not.toBeInTheDocument()
    expect(screen.queryByText('Qui arrivano promemoria e avvisi.')).not.toBeInTheDocument()
    cleanup()
    localStorage.clear()
    sessionStorage.clear()
    const secondo = await createAccount('maria@salone.it', 'segretissimo')
    salvaServizi(secondo.uid, { fedelta: { modo: 'manuale' } })
    render(<App memory isDev={false} initialPath="/animali/nuovo" />)
    expect(await screen.findByRole('heading', { name: 'Nuovo cane' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Email' })).not.toBeInTheDocument()
  })

  it('con le mail spente il collaboratore vede Mail spente e Riattiva le riaccende', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi', contact: { name: 'Ada', phone: '333', email: 'ada@cliente.it' } }))
    const chiave = storageKeys.dogs(account.uid)
    const mappa = readJson<Record<string, { emailBloccata?: boolean }>>(chiave) ?? {}
    mappa[created.id].emailBloccata = true
    writeJson(chiave, mappa)
    writeJson(storageKeys.auth, { ...account, role: 'collaboratore' })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByText('Mail spente')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Riattiva' }))
    await waitFor(() => expect(screen.queryByText('Mail spente')).not.toBeInTheDocument())
    const dopo = readJson<Record<string, { emailBloccata?: boolean; contact?: { email?: string } }>>(chiave)
    expect(dopo?.[created.id]?.emailBloccata).not.toBe(true)
    expect(dopo?.[created.id]?.contact?.email).toBe('ada@cliente.it')
  })

  it('il collaboratore non vede Metti in lista se l’attesa è spenta', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    writeJson(storageKeys.auth, { ...account, role: 'collaboratore' })
    salvaServizi(account.uid, { attesa: { modo: 'spento' } })
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Metti in lista' })).not.toBeInTheDocument()
  })

  it('il collaboratore mette in lista la mattina senza giorno, poi Togli toglie solo quel cane', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    writeJson(storageKeys.auth, { ...account, role: 'collaboratore' })
    const altro = { id: 'altro', dogId: 'cane-altro', durataMin: 30, preferenza: 'mattina' as const, arrivato: '2026-10-01' }
    salvaServizi(account.uid, { attesa: { modo: 'manuale' } }, { attesa: [altro] })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    const metti = await screen.findByRole('button', { name: 'Metti in lista' })
    expect(metti).toBeEnabled()
    expect(metti.getAttribute('style')).toMatch(/min-height:\s*48px/)
    await user.click(metti)
    const mattina = await screen.findByRole('button', { name: 'Mattina' })
    expect(mattina.getAttribute('style')).toMatch(/min-height:\s*48px/)
    await user.click(mattina)
    await waitFor(() => {
      const attesa = getSettings(account.uid).attesa
      expect(attesa).toEqual([
        altro,
        {
          id: expect.any(String),
          dogId: created.id,
          durataMin: 60,
          preferenza: 'mattina',
          arrivato: oggiRoma(),
        },
      ])
    })
    expect(getSettings(account.uid).attesa?.[1]).not.toHaveProperty('giorno')
    await user.click(screen.getByRole('button', { name: 'Togli' }))
    await waitFor(() => {
      expect(getSettings(account.uid).attesa).toEqual([altro])
    })
  })

  it('pomeriggio salva la preferenza e la durata media già nota', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    writeJson(storageKeys.auth, { ...account, role: 'collaboratore' })
    const visita = createAppointment(account.uid, {
      dogId: created.id,
      start: new Date(2026, 9, 1, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 45, price: 20 }],
    })
    completeAppointment(account.uid, visita.id)
    salvaServizi(account.uid, { attesa: { modo: 'automatico' } })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Metti in lista' }))
    const pomeriggio = await screen.findByRole('button', { name: 'Pomeriggio' })
    expect(pomeriggio.getAttribute('style')).toMatch(/min-height:\s*48px/)
    await user.click(pomeriggio)
    await waitFor(() => {
      expect(getSettings(account.uid).attesa).toEqual([
        {
          id: expect.any(String),
          dogId: created.id,
          durataMin: 45,
          preferenza: 'pomeriggio',
          arrivato: oggiRoma(),
        },
      ])
    })
    expect(getSettings(account.uid).attesa?.[0]).not.toHaveProperty('giorno')
  })

  it('un giorno salva preferenza qualsiasi e la data', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    writeJson(storageKeys.auth, { ...account, role: 'collaboratore' })
    salvaServizi(account.uid, { attesa: { modo: 'manuale' } })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    await user.click(await screen.findByRole('button', { name: 'Metti in lista' }))
    const giorno = await screen.findByLabelText('Giorno')
    expect(giorno.getAttribute('style')).toMatch(/height:\s*48px/)
    fireEvent.change(giorno, { target: { value: '2026-11-02' } })
    await waitFor(() => {
      expect(getSettings(account.uid).attesa).toEqual([
        {
          id: expect.any(String),
          dogId: created.id,
          durataMin: 60,
          preferenza: 'qualsiasi',
          arrivato: oggiRoma(),
          giorno: '2026-11-02',
        },
      ])
    })
  })
})
