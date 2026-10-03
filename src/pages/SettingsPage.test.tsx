import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { storageKeys } from '../data/local/storage'

async function enter(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'maria@salone.it')
  await user.type(screen.getByLabelText('Password'), 'segretissimo')
  await user.click(screen.getByRole('button', { name: 'Crea accesso' }))
  await screen.findByRole('heading', { name: 'Groomly' })
  await user.click(screen.getByRole('link', { name: 'Impostazioni' }))
}

describe('impostazioni', () => {
  beforeEach(() => localStorage.clear())

  it("mostra solo aspetto e servizi, e esce lasciando l'account", async () => {
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await enter(user)
    expect(screen.getByRole('heading', { name: 'Impostazioni' })).toBeInTheDocument()
    expect(screen.getByText('Aspetto')).toBeInTheDocument()
    expect(screen.getByText('8 servizi · tempi stimati')).toBeInTheDocument()
    expect(screen.getByText('Groomly v1.0')).toBeInTheDocument()
    expect(screen.queryByText('Attività')).not.toBeInTheDocument()
    expect(screen.queryByText('Backup')).not.toBeInTheDocument()
    expect(screen.queryByText('Campi scheda')).not.toBeInTheDocument()
    expect(screen.queryByText('Tag caratteristiche')).not.toBeInTheDocument()
    expect(screen.queryByText('Archivio animali')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Esci' }))
    expect(await screen.findByRole('button', { name: 'Entra' })).toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.session)).toBeNull()
    expect(localStorage.getItem(storageKeys.auth)).toContain('maria@salone.it')
  })

  it('applica il tema scuro e lo ripristina se il salvataggio fallisce', async () => {
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await enter(user)
    await user.click(screen.getByRole('radio', { name: 'Scuro' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    await user.click(screen.getByRole('radio', { name: 'Chiaro' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByRole('status')).toHaveTextContent('Salvataggio non riuscito')
    vi.restoreAllMocks()
  })
})
