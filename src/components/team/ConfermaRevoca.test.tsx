// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SalonMember } from '../../lib/salonRoster'
import { ConfermaRevoca } from './ConfermaRevoca'

const client = vi.hoisted(() => ({ revoke: vi.fn(async (_uid: string) => undefined) }))
vi.mock('../../data/firebase/client', () => ({ callRevokeMember: (uid: string) => client.revoke(uid) }))

const anna: SalonMember = { uid: 'a1', email: 'anna@salone.it', role: 'collaboratore', firstName: 'Anna', lastName: 'Rossi', status: 'attivo' }

describe('ConfermaRevoca', () => {
  beforeEach(() => client.revoke.mockReset().mockResolvedValue(undefined))

  it('con membro nullo non mostra nulla', () => {
    render(<ConfermaRevoca membro={null} onChiudi={() => undefined} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Togli chiama la revoca, avvisa e chiude', async () => {
    const onChiudi = vi.fn()
    const onTolto = vi.fn()
    render(<ConfermaRevoca membro={anna} onChiudi={onChiudi} onTolto={onTolto} />)
    expect(screen.getByText('Togliere Anna Rossi dal salone? Non vedrà più cani e appuntamenti del salone.')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Togli' }))
    expect(client.revoke).toHaveBeenCalledWith('a1')
    expect(onTolto).toHaveBeenCalledTimes(1)
    expect(onChiudi).toHaveBeenCalledTimes(1)
  })

  it('Annulla chiude senza chiamare', async () => {
    const onChiudi = vi.fn()
    render(<ConfermaRevoca membro={anna} onChiudi={onChiudi} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Annulla' }))
    expect(client.revoke).not.toHaveBeenCalled()
    expect(onChiudi).toHaveBeenCalledTimes(1)
  })

  it('un errore mostra il messaggio senza codici e resta aperto', async () => {
    client.revoke.mockRejectedValueOnce(Object.assign(new Error('failed-precondition: Accesso negato'), { code: 'functions/failed-precondition', details: { codice: 'accesso_negato' } }))
    const onChiudi = vi.fn()
    render(<ConfermaRevoca membro={anna} onChiudi={onChiudi} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Togli' }))
    expect(await screen.findByText('Accesso negato')).toBeInTheDocument()
    expect(onChiudi).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Togli' })).toBeEnabled()
  })

  it('un errore interno mostra Invio non riuscito. Riprova.', async () => {
    client.revoke.mockRejectedValueOnce(new Error('functions/internal: INTERNAL [500]'))
    render(<ConfermaRevoca membro={anna} onChiudi={() => undefined} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Togli' }))
    expect(await screen.findByText('Invio non riuscito. Riprova.')).toBeInTheDocument()
  })
})
