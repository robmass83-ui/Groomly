// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ValoreBeta } from './BetaProvider'
import { CardInvitoBeta } from './CardInvitoBeta'
import { ConBeta, invitoDiProva, valoreBeta } from './provaBeta'

const invitato = (campi: Partial<ValoreBeta> = {}) => valoreBeta({ fase: 'invitato', invitoValido: true, piano: 'pro', giorniInvito: 30, invito: invitoDiProva(), ...campi })

function mostra(valore: ValoreBeta) {
  return render(
    <MemoryRouter>
      <ConBeta valore={valore}>
        <Routes>
          <Route path="/" element={<CardInvitoBeta />} />
          <Route path="/impostazioni/beta" element={<p>pagina invito</p>} />
        </Routes>
      </ConBeta>
    </MemoryRouter>,
  )
}

describe('CardInvitoBeta', () => {
  beforeEach(() => localStorage.clear())
  afterEach(cleanup)

  it("mostra l'invito con i giorni e porta alla pagina invito", async () => {
    mostra(invitato())
    expect(screen.getByRole('heading', { name: 'Prova Plus gratis per 30 giorni' })).toBeInTheDocument()
    expect(screen.getByText('Invito beta · solo per te')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Scopri l’invito' }))
    expect(screen.getByText('pagina invito')).toBeInTheDocument()
  })

  it('Salon ha il suo nome', () => {
    mostra(invitato({ piano: 'salone', giorniInvito: 60 }))
    expect(screen.getByRole('heading', { name: 'Prova Salon gratis per 60 giorni' })).toBeInTheDocument()
  })

  it('«Più tardi» la nasconde per 3 giorni', async () => {
    const { unmount } = mostra(invitato())
    await userEvent.click(screen.getByRole('button', { name: 'Più tardi' }))
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    unmount()
    mostra(invitato())
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    cleanup()
    localStorage.setItem('groomly.beta.u1.piuTardi', String(Date.now() - 3 * 24 * 60 * 60 * 1000 - 1000))
    mostra(invitato())
    expect(screen.getByRole('heading', { name: 'Prova Plus gratis per 30 giorni' })).toBeInTheDocument()
  })

  it('non si vede senza invito o a chi non è titolare', () => {
    mostra(valoreBeta())
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    cleanup()
    mostra(invitato({ titolare: false }))
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })
})
