// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SalonMember } from '../../lib/salonRoster'
import { ConfermaRuolo } from './ConfermaRuolo'

const client = vi.hoisted(() => ({ change: vi.fn(async (_uid: string, _role: string) => undefined) }))
vi.mock('../../data/firebase/client', () => ({ callChangeMemberRole: (uid: string, role: 'socio' | 'collaboratore') => client.change(uid, role) }))

const anna: SalonMember = { uid: 'anna-uid', email: 'anna@salone.it', role: 'collaboratore', firstName: 'Anna', lastName: '', status: 'attivo' }
const sara: SalonMember = { uid: 'sara-uid', email: 'sara@salone.it', role: 'socio', firstName: 'Sara', lastName: '', status: 'attivo' }

describe('ConfermaRuolo', () => {
  beforeEach(() => client.change.mockReset().mockResolvedValue(undefined))

  it('con membro nullo non mostra nulla', () => {
    render(<ConfermaRuolo membro={null} onChiudi={() => undefined} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('un collaboratore diventa socio: una sola chiamata anche con doppio tocco, non si chiude mentre lavora', async () => {
    let sblocca: () => void = () => undefined
    client.change.mockImplementationOnce(() => new Promise<undefined>((resolve) => { sblocca = () => resolve(undefined) }))
    const onChiudi = vi.fn()
    render(<ConfermaRuolo membro={anna} onChiudi={onChiudi} />)
    expect(screen.getByText('Rendere Anna socio? Avrà il pieno controllo del salone, incassi compresi.')).toBeInTheDocument()
    const user = userEvent.setup()
    const conferma = screen.getByRole('button', { name: 'Conferma' })
    await user.click(conferma)
    await user.click(conferma)
    expect(client.change).toHaveBeenCalledTimes(1)
    expect(client.change).toHaveBeenCalledWith('anna-uid', 'socio')
    await user.keyboard('{Escape}')
    expect(onChiudi).not.toHaveBeenCalled()
    sblocca()
    await vi.waitFor(() => expect(onChiudi).toHaveBeenCalledTimes(1))
  })

  it('un socio diventa collaboratore', async () => {
    render(<ConfermaRuolo membro={sara} onChiudi={() => undefined} />)
    expect(screen.getByText('Rendere Sara collaboratore? Non vedrà più gli incassi e non potrà cambiare servizi, listino e impostazioni.')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Conferma' }))
    expect(client.change).toHaveBeenCalledWith('sara-uid', 'collaboratore')
  })

  it('Annulla chiude senza chiamare', async () => {
    const onChiudi = vi.fn()
    render(<ConfermaRuolo membro={anna} onChiudi={onChiudi} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Annulla' }))
    expect(client.change).not.toHaveBeenCalled()
    expect(onChiudi).toHaveBeenCalledTimes(1)
  })

  it('un errore di precondizione mostra il messaggio e resta aperto', async () => {
    client.change.mockRejectedValueOnce(Object.assign(new Error('Accesso negato'), { code: 'functions/failed-precondition', details: { codice: 'accesso_negato' } }))
    const onChiudi = vi.fn()
    render(<ConfermaRuolo membro={anna} onChiudi={onChiudi} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Conferma' }))
    expect(await screen.findByText('Accesso negato')).toBeInTheDocument()
    expect(onChiudi).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Conferma' })).toBeEnabled()
  })

  it('un errore interno mostra Invio non riuscito. Riprova.', async () => {
    client.change.mockRejectedValueOnce(Object.assign(new Error('INTERNAL'), { code: 'functions/internal' }))
    render(<ConfermaRuolo membro={anna} onChiudi={() => undefined} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Conferma' }))
    expect(await screen.findByText('Invio non riuscito. Riprova.')).toBeInTheDocument()
  })
})
