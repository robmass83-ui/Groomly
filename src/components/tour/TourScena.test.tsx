import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TourAnello, TourFesta, TourPulsante, TourTestata } from './TourScena'

describe('mattoni del tour', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('la testata dice a che passo siamo', () => {
    render(<TourTestata n={2} m={5} />)
    expect(screen.getByText('Prepariamo il salone · 2 di 5')).toBeInTheDocument()
  })

  it('la festa ha 26 coriandoli e finisce dopo 1100 ms', () => {
    const onFine = vi.fn()
    const { container } = render(<TourFesta titolo="Logo: fatto!" onFine={onFine} />)
    expect(container.querySelectorAll('.tour-coriandolo')).toHaveLength(26)
    expect(screen.getByText('Logo: fatto!')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(1099) })
    expect(onFine).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1) })
    expect(onFine).toHaveBeenCalledTimes(1)
  })

  it("l'anello alla fine mostra quanti passi sono fatti", () => {
    render(<TourAnello fatti={4} tutti={6} />)
    act(() => { vi.advanceTimersByTime(2000) })
    expect(screen.getByTestId('tour-anello-numero')).toHaveTextContent('4')
    expect(screen.getByText('/6')).toBeInTheDocument()
  })

  it('il pulsante pulsa solo quando diventa pronto', () => {
    const { rerender } = render(<TourPulsante pronto={false}>Fatto, avanti</TourPulsante>)
    const btn = screen.getByRole('button', { name: /Fatto, avanti/ })
    expect(btn).not.toHaveClass('tour-pronto')
    rerender(<TourPulsante pronto={false}>Fatto, avanti</TourPulsante>)
    expect(btn).not.toHaveClass('tour-pronto')
    rerender(<TourPulsante pronto>Fatto, avanti</TourPulsante>)
    expect(btn).toHaveClass('tour-pronto')
  })

  it('il pulsante già pronto all’inizio non pulsa', () => {
    render(<TourPulsante pronto>Fatto, avanti</TourPulsante>)
    expect(screen.getByRole('button', { name: /Fatto, avanti/ })).not.toHaveClass('tour-pronto')
  })

  it('le animazioni si fermano se i movimenti sono ridotti', () => {
    const css = readFileSync(createRequire(import.meta.url).resolve('./tour.css'), 'utf8')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('animation-iteration-count: 1 !important')
  })
})
