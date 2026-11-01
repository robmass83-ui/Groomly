// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SoloIncassi } from './SoloIncassi'

let role: string | undefined

vi.mock('../hooks/useSession', () => ({
  useSession: () => ({ gate: { kind: 'in', account: { uid: 'u1', role } } }),
}))

function apri() {
  render(
    <MemoryRouter initialEntries={['/incassi?periodo=giorno']}>
      <Routes>
        <Route path="/" element={<p>HOME</p>} />
        <Route path="/incassi" element={<SoloIncassi><p>SOLDI</p></SoloIncassi>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SoloIncassi', () => {
  beforeEach(() => { role = undefined })

  it('il collaboratore che apre /incassi?periodo=giorno finisce in Home', () => {
    role = 'collaboratore'
    apri()
    expect(screen.getByText('HOME')).toBeInTheDocument()
    expect(screen.queryByText('SOLDI')).not.toBeInTheDocument()
  })

  it('titolare e socio vedono la pagina incassi', () => {
    for (const r of ['titolare', 'socio', undefined]) {
      role = r
      const { unmount } = render(
        <MemoryRouter initialEntries={['/incassi']}>
          <Routes>
            <Route path="/" element={<p>HOME</p>} />
            <Route path="/incassi" element={<SoloIncassi><p>SOLDI</p></SoloIncassi>} />
          </Routes>
        </MemoryRouter>,
      )
      expect(screen.getByText('SOLDI')).toBeInTheDocument()
      unmount()
    }
  })
})
