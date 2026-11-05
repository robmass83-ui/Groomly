// @vitest-environment happy-dom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LinguaProvider } from '../../i18n/LinguaContext'
import { RegistroPage } from './RegistroPage'

const elenco = vi.hoisted(() => vi.fn(async (_filtro: unknown): Promise<unknown[]> => []))

vi.mock('../../hooks/useSettings', () => ({ useSettings: () => ({ theme: 'light' }) }))
vi.mock('../../data/firebase/adminClient', () => ({ elencoAdminLog: elenco, LIMITE_REGISTRO: 2 }))
vi.mock('../../components/admin/AdminDati', () => ({ useAdminDati: () => ({ nomeDi: (id: string) => `Salone ${id}` }) }))

const voce = (id: string, azione: string, salonId: string | null = null) => ({ id, quando: '2026-11-05T09:00:00.000Z', azione, salonId, dettagli: { tipo: 'novita' } })

function apri() {
  render(<LinguaProvider><MemoryRouter><RegistroPage /></MemoryRouter></LinguaProvider>)
  return userEvent.setup()
}

beforeEach(() => {
  elenco.mockReset()
  elenco.mockResolvedValue([])
})

describe('Registro', () => {
  it('mostra azione, salone e dettagli', async () => {
    elenco.mockResolvedValue([voce('a', 'eliminaSalone', 's1')])
    apri()
    expect(await screen.findByText('eliminaSalone')).toBeInTheDocument()
    expect(screen.getByText(/Salone s1/)).toBeInTheDocument()
    expect(screen.getByText(/tipo: novita/)).toBeInTheDocument()
  })

  it('senza voci lo dice', async () => {
    apri()
    expect(await screen.findByText('Nessuna azione registrata')).toBeInTheDocument()
  })

  it('una pagina piena offre «Altri» e chiede da dove era arrivata', async () => {
    elenco.mockResolvedValueOnce([voce('a', 'x'), { ...voce('b', 'y'), quando: '2026-11-04T09:00:00.000Z' }])
    elenco.mockResolvedValueOnce([voce('c', 'z')])
    const user = apri()
    await user.click(await screen.findByRole('button', { name: 'Altri' }))
    expect(await screen.findByText('z')).toBeInTheDocument()
    expect(screen.getByText('x')).toBeInTheDocument()
    expect(elenco.mock.calls[1]?.[0]).toMatchObject({ dopo: '2026-11-04T09:00:00.000Z' })
    expect(screen.queryByRole('button', { name: 'Altri' })).not.toBeInTheDocument()
  })

  it('i filtri ricaricano da capo', async () => {
    const user = apri()
    await user.type(await screen.findByRole('textbox', { name: 'Azione' }), 'elimina{Enter}')
    await waitFor(() => expect(elenco.mock.lastCall?.[0]).toMatchObject({ azione: 'elimina' }))
    await user.type(screen.getByRole('textbox', { name: 'Salone' }), 's1{Enter}')
    await waitFor(() => expect(elenco.mock.lastCall?.[0]).toMatchObject({ azione: 'elimina', salonId: 's1' }))
    expect((elenco.mock.lastCall?.[0] as { dopo?: string }).dopo).toBeUndefined()
  })

  it('se la lettura fallisce lo dice', async () => {
    elenco.mockRejectedValue(new Error('no'))
    apri()
    expect(await screen.findByText('Registro non disponibile')).toBeInTheDocument()
  })
})
