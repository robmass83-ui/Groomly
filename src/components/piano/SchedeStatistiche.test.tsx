import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SchedeStatistiche } from './SchedeStatistiche'

describe('schede statistiche', () => {
  it('con mostra spento non mostra schede', () => {
    const { container } = render(<SchedeStatistiche mostra={false} euro={10} atteso={1} ritardo={1} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('mostra euro l’ora, previsione e ritardo senza paywall', () => {
    render(<SchedeStatistiche mostra euro={90} atteso={50} ritardo={2} />)
    expect(screen.getByText('Euro l’ora: 90')).toBeInTheDocument()
    expect(screen.getByText('Previsione: 50')).toBeInTheDocument()
    expect(screen.getByText('In ritardo: 2')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
