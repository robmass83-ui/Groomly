// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AperturaFineBeta } from './AperturaFineBeta'
import type { ValoreBeta } from './BetaProvider'
import { ConBeta, valoreBeta } from './provaBeta'

const fine = new Date('2026-11-05T10:00:00.000Z')
const ultimoGiorno = (campi: Partial<ValoreBeta> = {}) => valoreBeta({ fase: 'in-corso', piano: 'pro', domandaFine: true, giorniRimasti: 1, fine, ...campi })

function mostra(valore: ValoreBeta, da = '/') {
  return render(
    <MemoryRouter initialEntries={[da]}>
      <ConBeta valore={valore}>
        <AperturaFineBeta />
        <Routes>
          <Route path="/" element={<p>home</p>} />
          <Route path="/calendario" element={<p>calendario</p>} />
          <Route path="/impostazioni/beta/fine" element={<p>domanda di fine</p>} />
        </Routes>
      </ConBeta>
    </MemoryRouter>,
  )
}

describe('AperturaFineBeta', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it('dalla Home apre la domanda una volta sola per quella data di fine', () => {
    const { unmount } = mostra(ultimoGiorno())
    expect(screen.getByText('domanda di fine')).toBeInTheDocument()
    expect(localStorage.getItem(`groomly.beta.u1.fineVista.${fine.toISOString()}`)).not.toBeNull()
    unmount()
    mostra(ultimoGiorno())
    expect(screen.getByText('home')).toBeInTheDocument()
  })

  it("un'estensione cambia la data e la riapre", () => {
    localStorage.setItem(`groomly.beta.u1.fineVista.${fine.toISOString()}`, '1')
    mostra(ultimoGiorno({ fine: new Date('2026-12-05T10:00:00.000Z') }))
    expect(screen.getByText('domanda di fine')).toBeInTheDocument()
  })

  it('non si apre fuori dalla Home, per il socio o senza la domanda', () => {
    mostra(ultimoGiorno(), '/calendario')
    expect(screen.getByText('calendario')).toBeInTheDocument()
    cleanup()
    mostra(ultimoGiorno({ titolare: false }))
    expect(screen.getByText('home')).toBeInTheDocument()
    cleanup()
    mostra(ultimoGiorno({ domandaFine: false }))
    expect(screen.getByText('home')).toBeInTheDocument()
  })
})
