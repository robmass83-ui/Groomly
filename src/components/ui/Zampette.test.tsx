// @vitest-environment happy-dom
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AttesaZampe } from './Zampette'

describe('attesa con le zampette', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('non compare per le attese brevissime, poi resta finché il lavoro non finisce', () => {
    const vista = render(<AttesaZampe testo="Invio il backup su Drive…" dettaglio="Non chiudere l’app" />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(300) })
    expect(screen.getByRole('status')).toHaveTextContent('Invio il backup su Drive…')
    expect(screen.getByText('Non chiudere l’app')).toBeInTheDocument()
    vista.rerender(<AttesaZampe testo={null} />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('un lavoro che finisce subito non fa lampeggiare niente', () => {
    const vista = render(<AttesaZampe testo="Salvataggio…" />)
    act(() => { vi.advanceTimersByTime(200) })
    vista.rerender(<AttesaZampe testo={null} />)
    act(() => { vi.advanceTimersByTime(500) })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
