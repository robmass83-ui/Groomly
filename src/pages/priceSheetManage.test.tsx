// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { getSettings } from '../data/local/settings'

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
