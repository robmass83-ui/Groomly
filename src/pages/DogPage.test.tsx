// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
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
    await createAccount('maria@salone.it', 'segretissimo')
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

  it('con la lista accesa la scheda non offre Metti in lista né Togli, in nessun modo', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    writeJson(storageKeys.auth, { ...account, role: 'collaboratore' })
    const altro = { id: 'altro', dogId: created.id, durataMin: 30, preferenza: 'mattina' as const, arrivato: '2026-10-01' }
    salvaServizi(account.uid, { attesa: { modo: 'manuale' } }, { attesa: [altro] })
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Metti in lista' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Togli' })).not.toBeInTheDocument()
    expect(getSettings(account.uid).attesa).toEqual([altro])
  })

  it('con la lista in automatico la scheda non ha il pulsante Metti in lista', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, write({ name: 'Bobi' }))
    writeJson(storageKeys.auth, { ...account, role: 'collaboratore' })
    salvaServizi(account.uid, { attesa: { modo: 'automatico' } })
    render(<App memory isDev={false} initialPath={`/animali/${created.id}`} />)
    expect(await screen.findByRole('heading', { name: 'Scheda' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Metti in lista' })).not.toBeInTheDocument()
    expect(getSettings(account.uid).attesa ?? []).toEqual([])
  })

  it('con ?campo=email apre la modifica e mette il fuoco sull’email', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    salvaServizi(account.uid, { promemoria: { modo: 'manuale' } })
    const created = createDog(account.uid, write({ name: 'Nina' }))
    render(<App memory isDev={false} initialPath={`/animali/${created.id}?campo=email`} />)
    const email = await screen.findByRole('textbox', { name: 'Email' })
    await waitFor(() => expect(email).toHaveFocus())
  })
})
