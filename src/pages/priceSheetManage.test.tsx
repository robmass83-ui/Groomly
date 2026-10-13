// @vitest-environment happy-dom
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { getSettings } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'
import { seedPriceSheet } from '../data/seed/priceSheet'

describe('gestione listino', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 3, 12, 0, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('da gestione, Razza apre la scheda e Barboncino toy sta nel gruppo della taglia media', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino/gestione" />)
    await user.click(await screen.findByRole('button', { name: 'Razza' }))
    await user.type(screen.getByRole('textbox', { name: 'Nome sul listino (senza "Tipo")' }), 'Barboncino toy')
    await user.click(screen.getByRole('radio', { name: 'Media' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    const media = await screen.findByRole('region', { name: 'Taglia media' })
    expect(within(media).getByText('Barboncino toy')).toBeInTheDocument()
  })

  it('Nascondi Servizi extra toglie SERVIZI EXTRA dal listino', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino/gestione" />)
    await user.click(await screen.findByRole('button', { name: 'Nascondi Servizi extra' }))
    await user.click(screen.getByRole('link', { name: 'Indietro' }))
    expect(await screen.findByRole('heading', { name: 'Listino prezzi' })).toBeInTheDocument()
    expect(screen.queryByText('SERVIZI EXTRA')).not.toBeInTheDocument()
    expect(getSettings(account.uid).priceSheet?.sezioni.find((section) => section.id === 'extra')?.visibile).toBe(false)
  })

  it('nome razza vuoto e Salva mostra il toast e non aggiunge la razza', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino/gestione" />)
    await user.click(await screen.findByRole('button', { name: 'Razza' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Scrivi il nome della razza')
    expect(getSettings(account.uid).priceSheet?.razze.some((breed) => breed.nome.trim() === '')).toBeFalsy()
  })

  it('togliere tutti i servizi di una razza non scrive e le razze già salvate restano', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const settings = getSettings(account.uid)
    const stored = seedPriceSheet(settings.business)
    writeJson(storageKeys.settings(account.uid), { ...settings, priceSheet: stored })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino/gestione" />)
    const piccola = await screen.findByRole('region', { name: 'Taglia piccola' })
    const opener = within(piccola).getAllByRole('button').find((button) => button.textContent?.startsWith('Yorkshire'))
    await user.click(opener!)
    const dialog = await screen.findByRole('dialog', { name: 'Modifica razza' })
    let remove = within(dialog).queryAllByRole('button', { name: 'Togli servizio' })
    while (remove.length > 0) {
      await user.click(remove[0]!)
      remove = within(dialog).queryAllByRole('button', { name: 'Togli servizio' })
    }
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Il listino non è stato salvato. Controlla nomi e prezzi.')
    const after = getSettings(account.uid).priceSheet
    expect(after?.razze).toEqual(stored.razze)
    expect(after?.razze.every((breed) => breed.voci.length > 0)).toBe(true)
  })

  it('un prezzo negativo non viene salvato', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const settings = getSettings(account.uid)
    const stored = seedPriceSheet(settings.business)
    writeJson(storageKeys.settings(account.uid), { ...settings, priceSheet: stored })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino/gestione" />)
    const piccola = await screen.findByRole('region', { name: 'Taglia piccola' })
    const opener = within(piccola).getAllByRole('button').find((button) => button.textContent?.startsWith('Yorkshire'))
    await user.click(opener!)
    const dialog = await screen.findByRole('dialog', { name: 'Modifica razza' })
    const field = within(dialog).getByRole('textbox', { name: 'Prezzo Bagno' })
    fireEvent.change(field, { target: { value: '-5' } })
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    const york = getSettings(account.uid).priceSheet?.razze.find((breed) => breed.nome === 'Yorkshire')
    expect(york?.voci.find((item) => item.nome === 'Bagno')?.prezzo).toBe(25)
    expect(getSettings(account.uid).priceSheet?.razze.some((breed) => breed.voci.some((item) => (item.prezzo ?? 0) < 0))).toBe(false)
  })

  it('un listino salvato illeggibile non viene sostituito', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const settings = getSettings(account.uid)
    writeJson(storageKeys.settings(account.uid), { ...settings, priceSheet: { version: 1 } })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino/gestione" />)
    await user.click(await screen.findByRole('button', { name: 'Nascondi Servizi extra' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Il listino salvato non è leggibile. Non l\'ho sostituito.')
    expect(getSettings(account.uid).priceSheet).toEqual({ version: 1 })
  })

  it('nel prezzo della razza 27, resta nel campo finché non esce', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino/gestione" />)
    const piccola = await screen.findByRole('region', { name: 'Taglia piccola' })
    const opener = within(piccola).getAllByRole('button').find((button) => button.textContent?.startsWith('Yorkshire'))
    await user.click(opener!)
    const field = await screen.findByRole('textbox', { name: 'Prezzo Bagno' })
    await user.clear(field)
    await user.type(field, '27,')
    expect(field).toHaveValue('27,')
  })

  it('i punti elenco tengono la riga nuova prima del blur', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino/gestione" />)
    const field = await screen.findByRole('textbox', { name: 'Punti elenco (uno per riga)' }) as HTMLTextAreaElement
    field.focus()
    field.setSelectionRange(field.value.length, field.value.length)
    await user.keyboard('{Enter}ciao')
    expect(field.value.split('\n')).toContain('ciao')
  })
})
