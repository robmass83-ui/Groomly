// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'

async function enter(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'maria@salone.it')
  await user.type(screen.getByLabelText('Password'), 'segretissimo')
  await user.click(screen.getByRole('button', { name: 'Crea accesso' }))
  await screen.findByRole('heading', { name: 'Groomly' })
}

describe('guscio', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 9, 1, 12))
  })

  it('mostra la data, nasconde il campanello e apre Animali dalla ricerca', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    expect(screen.getByText('Giovedì 1 ottobre')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Notifiche' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cerca' }))
    expect(screen.getByRole('heading', { name: 'Animali' })).toBeInTheDocument()
    expect(screen.getAllByText('In arrivo').length).toBeGreaterThan(0)
  })

  it('il più annuncia che le azioni arrivano dopo', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App memory isDev={false} />)
    await enter(user)
    await user.click(screen.getByRole('button', { name: 'Apri azioni' }))
    await user.click(screen.getByRole('button', { name: 'Nuovo appuntamento' }))
    expect(screen.getByRole('status')).toHaveTextContent('In arrivo')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

afterEach(() => {
  vi.useRealTimers()
})
