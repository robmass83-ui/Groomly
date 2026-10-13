// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { getSettings } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'

describe('aggiorna prezzi', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('+10% sulla piccola porta il bagno Yorkshire da 25 a 28, la valutazione resta, Salva azzera il contatore', async () => {
    const user = userEvent.setup()
    const account = await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/listino/prezzi" />)
    expect(await screen.findByRole('heading', { name: 'Aggiorna prezzi' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '+10%' }))
    expect(screen.getByRole('textbox', { name: 'Prezzo Bagno Yorkshire' })).toHaveValue('28')
    expect(screen.getByText('su valutazione')).toBeInTheDocument()
    expect(screen.getByText('14 prezzi modificati')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('0 prezzi modificati')).toBeInTheDocument()
    const stored = getSettings(account.uid)
    const york = stored.priceSheet?.razze.find((breed) => breed.nome === 'Yorkshire')
    expect(york?.voci.find((item) => item.nome === 'Bagno')?.prezzo).toBe(28)
    const chihuahua = stored.priceSheet?.razze.find((breed) => breed.nome === 'Chihuahua / Pinscher')
    expect(chihuahua?.voci.find((item) => item.nome === 'Bagno + tosatura')?.tipo).toBe('valutazione')
  })

  it('digitare 27, lascia 27, nel campo finché non esce', async () => {
    const user = userEvent.setup()
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/listino/prezzi" />)
    const field = await screen.findByRole('textbox', { name: 'Prezzo Bagno Yorkshire' })
    await user.clear(field)
    await user.type(field, '27,')
    expect(field).toHaveValue('27,')
  })

  it('un listino illeggibile non viene sostituito quando si salvano i prezzi', async () => {
    const user = userEvent.setup()
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const settings = getSettings(account.uid)
    writeJson(storageKeys.settings(account.uid), { ...settings, priceSheet: { version: 1 } })
    render(<App memory isDev={false} initialPath="/listino/prezzi" />)
    expect(await screen.findByRole('heading', { name: 'Aggiorna prezzi' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '+10%' }))
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Il listino salvato non è leggibile. Non l\'ho sostituito.')
    expect(getSettings(account.uid).priceSheet).toEqual({ version: 1 })
  })

  it('uscire con bozza sporca apre il dialogo e Annulla resta sulla pagina', async () => {
    const user = userEvent.setup()
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/listino/prezzi" />)
    expect(await screen.findByRole('heading', { name: 'Aggiorna prezzi' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '+10%' }))
    expect(screen.getByText('14 prezzi modificati')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Indietro' }))
    expect(screen.getByRole('dialog', { name: /Uscire senza salvare\?/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    expect(screen.getByRole('heading', { name: 'Aggiorna prezzi' })).toBeInTheDocument()
    expect(screen.getByText('14 prezzi modificati')).toBeInTheDocument()
  })
})
