import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SchedeStatistiche } from './SchedeStatistiche'

describe('schede statistiche', () => {
  it('con i piani spenti non mostra schede', () => {
    const { container } = render(<SchedeStatistiche mostra={false} accesso={false} euro={10} atteso={1} ritardo={1} onPaywall={() => undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('in base mostra solo euro l’ora e il resto apre la paywall', async () => {
    const onPaywall = vi.fn()
    const user = userEvent.setup()
    render(<SchedeStatistiche mostra accesso={false} euro={90} atteso={50} ritardo={1} onPaywall={onPaywall} />)
    expect(screen.getByText('Euro l’ora: 90')).toBeInTheDocument()
    expect(screen.queryByText(/Previsione:/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Previsione' }))
    expect(onPaywall).toHaveBeenCalledOnce()
  })

  it('con accesso mostra anche previsione e ritardo', () => {
    render(<SchedeStatistiche mostra accesso euro={90} atteso={50} ritardo={2} onPaywall={() => undefined} />)
    expect(screen.getByText('Previsione: 50')).toBeInTheDocument()
    expect(screen.getByText('In ritardo: 2')).toBeInTheDocument()
  })
})
