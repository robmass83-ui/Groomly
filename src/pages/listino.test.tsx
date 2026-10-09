// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { ensureServiceSeed, updateService } from '../data/local/services'

describe('listino', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 3, 12, 0, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('mostra i prezzi attivi e la data dell’ultimo aggiornamento', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/listino" />)
    expect(await screen.findByRole('heading', { name: 'Listino prezzi' })).toBeInTheDocument()
    expect(screen.getByText('Aggiornato 3 ott 2026')).toBeInTheDocument()
    expect(screen.queryByText('In arrivo')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sostituisci' })).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Servizio' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Piccola' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Media' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Grande' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Listino' })).toBeInTheDocument()
    const bagno = screen.getByText('Bagno').closest('tr')
    expect(bagno).not.toBeNull()
    expect(within(bagno!).getByText('30–60m')).toBeInTheDocument()
    expect(within(bagno!).getByText('€ 20')).toBeInTheDocument()
    expect(within(bagno!).getByText('€ 28')).toBeInTheDocument()
    expect(within(bagno!).getByText('€ 38')).toBeInTheDocument()
    expect(within(bagno!).getAllByRole('cell')).toHaveLength(4)
    const nodi = screen.getByText('Gestione nodi').closest('tr')
    expect(nodi).not.toBeNull()
    expect(within(nodi!).getByText('+20m')).toBeInTheDocument()
    expect(within(nodi!).getByText('€ 5')).toBeInTheDocument()
    expect(within(nodi!).getAllByRole('cell')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Modifica' })).toHaveAttribute('href', '/impostazioni/servizi')
  })

  it('Modifica apre Servizi e durate e Indietro torna a Impostazioni', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino" />)
    await user.click(await screen.findByRole('link', { name: 'Modifica' }))
    expect(await screen.findByRole('heading', { name: 'Servizi e durate' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Indietro' })).toHaveAttribute('href', '/impostazioni')
  })

  it('senza servizi attivi dice Nessun servizio e tiene Modifica', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    for (const service of ensureServiceSeed(account.uid)) {
      updateService(account.uid, service.id, { active: false })
    }
    render(<App memory isDev={false} initialPath="/listino" />)
    expect(await screen.findByText('Nessun servizio')).toBeInTheDocument()
    expect(screen.queryByText(/Aggiornato/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Modifica' })).toHaveAttribute('href', '/impostazioni/servizi')
  })
})
