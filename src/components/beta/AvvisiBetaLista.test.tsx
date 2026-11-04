// @vitest-environment happy-dom
import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ValoreBeta } from './BetaProvider'
import { AvvisiBetaLista } from './AvvisiBetaLista'
import { ConBeta, invitoDiProva, valoreBeta } from './provaBeta'

const segnaLetto = vi.fn()

function mostra(valore: ValoreBeta) {
  render(<MemoryRouter><ConBeta valore={valore}><AvvisiBetaLista /></ConBeta></MemoryRouter>)
}

describe('AvvisiBetaLista', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    segnaLetto.mockClear()
  })
  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  it("l'invito ha anello, testo, link e pallino, e non si segna letto qui", () => {
    const invito = invitoDiProva({ scadeInvitoIl: '2026-11-18T10:00:00.000Z' })
    mostra(valoreBeta({
      fase: 'invitato', invitoValido: true, piano: 'pro', giorniInvito: 30, invito, segnaLetto,
      avvisi: [{ id: 'invito:1', tipo: 'invito', data: new Date(invito.invitatoIl), link: '/impostazioni/beta' }],
    }))
    const card = screen.getByRole('article', { name: 'Hai un invito alla beta Plus' })
    expect(card).toHaveTextContent('Prova gratis per 30 giorni tutte le funzioni Plus. L’invito vale fino al 18 novembre.')
    expect(card.style.boxShadow).toContain('0 0 0 2px #7B3FE4')
    expect(screen.getByRole('link', { name: 'Apri l’invito' })).toHaveAttribute('href', '/impostazioni/beta')
    expect(screen.getByTestId('pallino-beta')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(1000) })
    expect(segnaLetto).not.toHaveBeenCalled()
  })

  it('il promemoria e la fine si segnano letti dopo un attimo', () => {
    const fine = new Date('2026-11-10T10:00:00.000Z')
    mostra(valoreBeta({
      fase: 'in-corso', piano: 'salone', segnaLetto,
      avvisi: [
        { id: 'fine-vicina:a', tipo: 'fine-vicina', data: fine, link: '/impostazioni/abbonamento' },
        { id: 'promemoria:b', tipo: 'promemoria', data: new Date(), link: '/impostazioni/beta/feedback' },
      ],
    }))
    expect(screen.getByRole('article', { name: 'La tua beta finisce il 10 novembre' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Invia feedback beta' })).toHaveAttribute('href', '/impostazioni/beta/feedback')
    act(() => { vi.advanceTimersByTime(800) })
    expect(segnaLetto).toHaveBeenCalledWith('fine-vicina:a', 'promemoria:b')
  })

  it('già letti: niente pallino', () => {
    mostra(valoreBeta({
      fase: 'finita', piano: 'pro', letti: new Set(['finita:c']),
      avvisi: [{ id: 'finita:c', tipo: 'finita', data: new Date(), link: '/impostazioni/beta/fine' }],
    }))
    expect(screen.getByRole('article', { name: 'La tua beta Plus è finita' })).toBeInTheDocument()
    expect(screen.queryByTestId('pallino-beta')).not.toBeInTheDocument()
  })

  it('senza avvisi non mostra niente', () => {
    mostra(valoreBeta())
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })
})
