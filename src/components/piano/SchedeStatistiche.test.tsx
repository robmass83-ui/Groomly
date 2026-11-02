import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SchedeStatistiche } from './SchedeStatistiche'

describe('schede statistiche', () => {
  it('con mostra spento non mostra schede', () => {
    const { container } = render(<SchedeStatistiche mostra={false} euro={10} atteso={1} ritardo={1} nascondi={false} mese="Novembre" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('mostra euro all’ora, previsione del mese e ritardo con importi formattati', () => {
    render(<SchedeStatistiche mostra euro={31.4} atteso={50} ritardo={2} nascondi={false} mese="Novembre" />)
    expect(screen.getByText('€ 31,40')).toBeInTheDocument()
    expect(screen.getByText('€ 50')).toBeInTheDocument()
    expect(screen.getByText('Novembre')).toBeInTheDocument()
    expect(screen.getByText('€ all’ora')).toBeInTheDocument()
    expect(screen.getByText('Previsione del mese')).toBeInTheDocument()
    expect(screen.getByText('Clienti in ritardo')).toBeInTheDocument()
    expect(screen.getByText('oltre il loro ritmo abituale')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('con nascondi le due schede in euro mostrano ••• e nessuna cifra', () => {
    const { container } = render(<SchedeStatistiche mostra euro={31.4} atteso={50} ritardo={2} nascondi mese="Novembre" />)
    expect(screen.getAllByText('•••')).toHaveLength(2)
    expect(container.textContent).not.toMatch(/€ ?[0-9]/)
    expect(container.textContent).not.toContain('31')
  })

  it('senza dati sull’ora mostra un trattino', () => {
    render(<SchedeStatistiche mostra euro={null} atteso={0} ritardo={0} nascondi={false} mese="Novembre" />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
