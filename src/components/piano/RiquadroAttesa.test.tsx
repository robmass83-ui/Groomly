import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RiquadroAttesa } from './RiquadroAttesa'

describe('lista d’attesa', () => {
  it('col flag spento non si vede e in base è un badge', async () => {
    const onPaywall = vi.fn()
    const user = userEvent.setup()
    const spento = render(<RiquadroAttesa mostra={false} accesso posti={1} onPaywall={onPaywall} />)
    expect(spento.container).toBeEmptyDOMElement()
    render(<RiquadroAttesa mostra accesso={false} posti={1} onPaywall={onPaywall} />)
    await user.click(screen.getByRole('button', { name: 'Lista d’attesa' }))
    expect(onPaywall).toHaveBeenCalledOnce()
  })

  it('con accesso mostra i posti', () => {
    render(<RiquadroAttesa mostra accesso posti={2} onPaywall={() => undefined} />)
    expect(screen.getByText('Posti liberati: 2')).toBeInTheDocument()
  })
})
