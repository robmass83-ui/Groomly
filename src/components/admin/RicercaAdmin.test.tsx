// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LinguaProvider } from '../../i18n/LinguaContext'
import { AdminLayout } from './AdminLayout'

const setSelezione = vi.fn()
const riga = { row: { salonId: 'zampe', salonName: 'Zampe d’Oro', ownerName: 'Marco Neri' }, livello: 'pro', beta: 'in-beta', info: { citta: 'Bologna' } }

vi.mock('../../hooks/useSettings', () => ({ useSettings: () => ({ theme: 'light' }) }))
vi.mock('../../hooks/useEsci', () => ({ useEsci: () => ({ esci: vi.fn(), foglio: null, occupato: false }) }))
vi.mock('./AdminDati', () => ({ useAdminDati: () => ({ nuoviBeta: 0, nuoveRichieste: 0, righe: [riga], adesso: new Date(), setSelezione }) }))

function Dove() {
  return <p data-testid="dove">{useLocation().pathname}</p>
}

function apri() {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }))
  render(
    <LinguaProvider>
      <MemoryRouter initialEntries={['/admin']}>
        <Routes><Route path="/admin/*" element={<AdminLayout />}><Route path="*" element={<Dove />} /></Route></Routes>
      </MemoryRouter>
    </LinguaProvider>,
  )
}

describe('ricerca e azioni rapide della Console', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    setSelezione.mockClear()
  })

  it('la ricerca trova il salone per città e apre la scheda', async () => {
    const user = userEvent.setup()
    apri()
    await user.click(screen.getByRole('button', { name: 'Cerca' }))
    await user.type(within(screen.getByRole('dialog')).getByRole('textbox'), 'bolo')
    await user.click(screen.getByRole('button', { name: /Zampe d’Oro/ }))
    expect(screen.getByTestId('dove')).toHaveTextContent('/admin/saloni/zampe')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('senza risultati lo dice', async () => {
    const user = userEvent.setup()
    apri()
    await user.click(screen.getByRole('button', { name: 'Cerca' }))
    await user.type(within(screen.getByRole('dialog')).getByRole('textbox'), 'xyz')
    expect(screen.getByText('Nessun risultato')).toBeInTheDocument()
  })

  it('Ctrl+K apre la ricerca', async () => {
    const user = userEvent.setup()
    apri()
    await user.keyboard('{Control>}k{/Control}')
    expect(within(screen.getByRole('dialog')).getByRole('textbox')).toBeInTheDocument()
  })

  it('dal tasto + «Invita alla beta» porta ai saloni con la selezione accesa', async () => {
    const user = userEvent.setup()
    apri()
    await user.click(screen.getByRole('button', { name: 'Nuova azione' }))
    await user.click(screen.getByRole('button', { name: /Invita alla beta/ }))
    expect(setSelezione).toHaveBeenCalledWith(new Set())
    expect(screen.getByTestId('dove')).toHaveTextContent('/admin/saloni')
  })
})
