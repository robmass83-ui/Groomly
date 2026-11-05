// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LinguaProvider } from '../../i18n/LinguaContext'
import { AdminLayout } from './AdminLayout'

vi.mock('../../hooks/useSettings', () => ({ useSettings: () => ({ theme: 'light' }) }))
vi.mock('../../hooks/useEsci', () => ({ useEsci: () => ({ esci: vi.fn(), foglio: null, occupato: false }) }))
vi.mock('./AdminDati', () => ({ useAdminDati: () => ({ nuoviBeta: 2, nuoveRichieste: 5 }) }))

function apri(desktop: boolean) {
  vi.stubGlobal('matchMedia', () => ({ matches: desktop, addEventListener: () => undefined, removeEventListener: () => undefined }))
  render(
    <LinguaProvider>
      <MemoryRouter initialEntries={['/admin/registro']}>
        <Routes><Route path="/admin/*" element={<AdminLayout />} /></Routes>
      </MemoryRouter>
    </LinguaProvider>,
  )
  return screen.getByRole('navigation', { name: 'Menu della Console' })
}

const nomi = (menu: HTMLElement) => within(menu).getAllByRole('link').map((l) => l.textContent?.replace(/\d+$/, ''))

describe('AdminLayout', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('su PC il menu laterale ha nove voci, Metriche compresa', () => {
    const menu = apri(true)
    expect(nomi(menu)).toEqual(['Oggi', 'Saloni', 'Assistenza', 'Beta', 'Comunicazioni', 'Piani', 'Metriche', 'Registro', 'Sistema'])
    expect(within(menu).getByRole('link', { name: /Registro/ })).toHaveAttribute('aria-current', 'page')
  })

  it('sul telefono la barra ha quattro voci, il tasto + e Altro resta acceso sulle pagine sue', () => {
    const menu = apri(false)
    expect(nomi(menu)).toEqual(['Oggi', 'Saloni', 'Assistenza', 'Altro'])
    expect(within(menu).getByRole('button', { name: 'Nuova azione' })).toBeInTheDocument()
    expect(within(menu).getByRole('link', { name: /Altro/ }).style.color).toBe('var(--pri)')
  })

  it('i numerini dicono quante cose nuove ci sono', () => {
    const menu = apri(true)
    expect(within(menu).getByLabelText('5 nuovi')).toBeInTheDocument()
    expect(within(menu).getByLabelText('2 nuovi')).toBeInTheDocument()
  })

  it('c’è la barra col logo, la ricerca ed Esci', () => {
    apri(false)
    expect(screen.getByRole('img', { name: 'Groomly Admin' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cerca' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Esci' })).toBeInTheDocument()
  })
})
