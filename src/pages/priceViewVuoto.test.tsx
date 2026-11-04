// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSettings } from '../data/local/settings'
import { PriceViewPage } from './PriceViewPage'

let role: string | undefined

vi.mock('../hooks/useSession', () => ({
  useSession: () => ({ gate: { kind: 'in', account: { uid: 'u1', email: 'x@y.it', role } } }),
}))
vi.mock('../hooks/useSettings', () => ({
  useSettings: () => ({ settings: { ...getSettings('u1'), priceList: undefined, priceListHistory: [] }, save: () => true, ready: true }),
}))
vi.mock('./ShellFrame', () => ({ ShellFrame: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))

function apri() {
  render(
    <MemoryRouter initialEntries={['/listino/vedi']}>
      <Routes>
        <Route path="/listino/vedi" element={<PriceViewPage />} />
        <Route path="/listino" element={<p>Pagina listino</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('vista listino vuota', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('groomly.lingua', 'it')
    role = undefined
  })

  it('il titolare vede la spiegazione e va al listino', () => {
    role = 'titolare'
    apri()
    expect(screen.getByText('Nessun file')).toBeInTheDocument()
    expect(screen.getByText('Qui vedi il listino che carichi nella pagina Listino.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Vai al listino' }))
    expect(screen.getByText('Pagina listino')).toBeInTheDocument()
  })

  it('il collaboratore vede che il titolare non ha caricato il listino, senza pulsante', () => {
    role = 'collaboratore'
    apri()
    expect(screen.getByText('Nessun file')).toBeInTheDocument()
    expect(screen.getByText('Il titolare non ha ancora caricato il listino.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Vai al listino' })).not.toBeInTheDocument()
  })
})
