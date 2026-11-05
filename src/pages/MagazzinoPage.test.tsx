// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { listProdotti, saveProdottoLocal } from '../data/local/prodotti'
import { storageKeys, writeJson } from '../data/local/storage'
import type { Prodotto } from '../lib/prodotti'

const data = new Date('2026-11-05T10:00:00.000Z')

function prodotto(over: Partial<Prodotto> = {}): Prodotto {
  return { id: 'p1', nome: 'Shampoo manto bianco', categoria: 'shampoo', quantita: 5, unita: 'l', ditta: 'Ditta Alfa', codice: 'SH-120', createdAt: data, updatedAt: data, ...over }
}

async function entra(role?: string) {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  if (role) writeJson(storageKeys.auth, { ...account, role, salonId: account.uid })
  return account
}

describe('magazzino', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('si apre da Altro con la scheda Altro attiva', async () => {
    await entra()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro" />)
    await user.click(await screen.findByRole('link', { name: /Magazzino/ }))
    expect(await screen.findByRole('heading', { name: 'Magazzino' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Altro' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Indietro' })).toHaveAttribute('href', '/altro')
  })

  it('senza prodotti invita ad aggiungere il primo e nasconde ricerca e filtri', async () => {
    await entra()
    render(<App memory isDev={false} initialPath="/altro/magazzino" />)
    expect(await screen.findByText('Nessun prodotto')).toBeInTheDocument()
    expect(screen.queryByText('0 prodotti')).toBeNull()
    expect(screen.getByRole('link', { name: 'Aggiungi il primo prodotto' })).toHaveAttribute('href', '/altro/magazzino/nuovo')
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Shampoo' })).toBeNull()
  })

  it('aggiunge un prodotto con la virgola e torna all’elenco', async () => {
    const account = await entra()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro/magazzino" />)
    await user.click(await screen.findByRole('link', { name: 'Aggiungi il primo prodotto' }))
    await user.type(await screen.findByLabelText('Prodotto'), 'Balsamo districante')
    await user.click(screen.getByRole('radio', { name: 'Balsami' }))
    await user.type(screen.getByLabelText('Quantità'), '0,5')
    await user.type(screen.getByLabelText('Fornitore / ditta'), 'Forniture Beta')
    await user.type(screen.getByLabelText('Codice prodotto'), 'BL-205')
    await user.click(screen.getByRole('button', { name: 'Salva prodotto' }))
    expect(await screen.findByRole('heading', { name: 'Magazzino' })).toBeInTheDocument()
    expect(screen.getByText('1 prodotto')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Aggiungi prodotto' })).toHaveAttribute('href', '/altro/magazzino/nuovo')
    const riga = screen.getByRole('link', { name: /Balsamo districante/ })
    expect(within(riga).getByText('Forniture Beta · BL-205')).toBeInTheDocument()
    expect(within(riga).getByText('0,5 L')).toBeInTheDocument()
    expect(listProdotti(account.uid)[0]).toMatchObject({ categoria: 'balsami', quantita: 0.5, unita: 'l' })
  })

  it('senza nome o con una quantità sbagliata non salva', async () => {
    const account = await entra()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro/magazzino/nuovo" />)
    await user.type(await screen.findByLabelText('Quantità'), 'tanta')
    await user.click(screen.getByRole('button', { name: 'Salva prodotto' }))
    expect(await screen.findByText('Scrivi il nome del prodotto')).toBeInTheDocument()
    expect(screen.getByText('Scrivi un numero maggiore di zero')).toBeInTheDocument()
    expect(listProdotti(account.uid)).toEqual([])
  })

  it('propone le ditte già inserite', async () => {
    const account = await entra()
    saveProdottoLocal(account.uid, prodotto())
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro/magazzino/nuovo" />)
    const campo = await screen.findByLabelText('Fornitore / ditta')
    await user.type(campo, 'dit')
    await user.click(screen.getByRole('button', { name: 'Ditta Alfa' }))
    expect(campo).toHaveValue('Ditta Alfa')
    expect(screen.queryByRole('button', { name: 'Ditta Alfa' })).toBeNull()
  })

  it('cerca, filtra e dice quando non trova nulla', async () => {
    const account = await entra()
    saveProdottoLocal(account.uid, prodotto())
    saveProdottoLocal(account.uid, prodotto({ id: 'p2', nome: 'Profumo talco', categoria: 'profumi', codice: 'PR-018' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro/magazzino" />)
    expect(await screen.findByText('2 prodotti')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Profumi' }))
    expect(screen.getByRole('button', { name: 'Profumi' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('link', { name: /Shampoo manto/ })).toBeNull()
    await user.type(screen.getByRole('textbox', { name: 'Cerca' }), 'sh-120')
    expect(screen.getByText('Nessun prodotto trovato')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tutti' }))
    expect(screen.getByRole('link', { name: /Shampoo manto/ })).toBeInTheDocument()
  })

  it('il titolare modifica ed elimina dopo la conferma', async () => {
    const account = await entra()
    saveProdottoLocal(account.uid, prodotto())
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro/magazzino/p1" />)
    expect(await screen.findByLabelText('Prodotto')).toHaveValue('Shampoo manto bianco')
    expect(screen.getByLabelText('Quantità')).toHaveValue('5')
    await user.click(screen.getByRole('button', { name: 'Elimina prodotto' }))
    const conferma = await screen.findByRole('dialog')
    expect(listProdotti(account.uid)).toHaveLength(1)
    await user.click(within(conferma).getByRole('button', { name: 'Elimina' }))
    expect(await screen.findByText('Nessun prodotto')).toBeInTheDocument()
    expect(listProdotti(account.uid)).toEqual([])
  })

  it('il collaboratore modifica ma non elimina', async () => {
    const account = await entra('collaboratore')
    saveProdottoLocal(account.uid, prodotto())
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/altro/magazzino/p1" />)
    const campo = await screen.findByLabelText('Codice prodotto')
    expect(screen.queryByRole('button', { name: 'Elimina prodotto' })).toBeNull()
    await user.clear(campo)
    await user.type(campo, 'SH-121')
    await user.click(screen.getByRole('button', { name: 'Salva prodotto' }))
    await screen.findByRole('heading', { name: 'Magazzino' })
    expect(listProdotti(account.uid)[0].codice).toBe('SH-121')
  })

  it('un prodotto che non esiste più riporta all’elenco', async () => {
    await entra()
    render(<App memory isDev={false} initialPath="/altro/magazzino/sparito" />)
    expect(await screen.findByRole('heading', { name: 'Magazzino' })).toBeInTheDocument()
  })
})
