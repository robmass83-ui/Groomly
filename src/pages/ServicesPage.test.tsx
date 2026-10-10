// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { storageKeys } from '../data/local/storage'

async function openServices(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'maria@salone.it')
  await user.type(screen.getByLabelText('Password'), 'segretissimo')
  await user.click(screen.getByRole('button', { name: 'Crea accesso' }))
  await screen.findByRole('heading', { name: 'Groomly' })
  await user.click(screen.getByRole('link', { name: 'Impostazioni' }))
  await user.click(screen.getByRole('link', { name: /Servizi e durate/ }))
  await screen.findByRole('heading', { name: 'Servizi e durate' })
}

describe('servizi', () => {
  beforeEach(() => localStorage.clear())

  it('modifica un extra, aggiunge un servizio e non offre elimina', async () => {
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await openServices(user)
    expect(screen.queryByRole('button', { name: /Elimina/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sposta su Bagno' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Apri Gestione nodi' }))
    const price = screen.getByLabelText('Prezzo')
    await user.clear(price)
    await user.type(price, '9')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvato')
    const raw = localStorage.getItem(storageKeys.services(JSON.parse(localStorage.getItem(storageKeys.auth)!).uid))!
    const nodi = JSON.parse(raw).nodi
    expect(nodi.price).toEqual({ piccola: 9, media: 9, grande: 9 })
    await user.click(screen.getByRole('button', { name: 'Aggiungi servizio' }))
    await user.type(screen.getByLabelText('Nome'), 'Spazzolata')
    await user.click(screen.getByRole('radio', { name: 'Extra' }))
    await user.type(screen.getByLabelText('Durata'), '10')
    await user.type(screen.getByLabelText('Prezzo'), '5')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Spazzolata')).toBeInTheDocument()
    expect(within(screen.getByTestId('icon-Spazzolata')).getByTestId('service-fallback')).toBeInTheDocument()
  })

  it('se la scrittura fallisce lascia il nome precedente', async () => {
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await openServices(user)
    await user.click(screen.getByRole('button', { name: 'Apri Bagno' }))
    const name = screen.getByLabelText('Nome')
    await user.clear(name)
    await user.type(name, 'Bagno nuovo')
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvataggio non riuscito')
    const dialog = screen.getByRole('dialog', { name: 'Modifica servizio' })
    expect(within(dialog).queryByTestId('sheet-grabber')).not.toBeInTheDocument()
    expect(dialog.parentElement?.getAttribute('style')).toContain('align-items: center')
    vi.restoreAllMocks()
    expect(screen.getByRole('button', { name: 'Apri Bagno' })).toBeInTheDocument()
  })
})
