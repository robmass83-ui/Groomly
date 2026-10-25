import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RiquadroRichieste } from './RiquadroRichieste'

describe('riquadro richieste', () => {
  it('con i piani spenti non si vede', () => {
    const { container } = render(<RiquadroRichieste mostra={false} accesso richieste={[]} onAccetta={() => undefined} onPaywall={() => undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('in base è un badge e con accesso accetta la richiesta', async () => {
    const onPaywall = vi.fn()
    const onAccetta = vi.fn()
    const user = userEvent.setup()
    const { rerender } = render(<RiquadroRichieste mostra accesso={false} richieste={[{ id: 'r1', nome: 'Ada' }]} onAccetta={onAccetta} onPaywall={onPaywall} />)
    await user.click(screen.getByRole('button', { name: 'Prenotazioni online' }))
    expect(onPaywall).toHaveBeenCalledOnce()
    rerender(<RiquadroRichieste mostra accesso richieste={[{ id: 'r1', nome: 'Ada' }]} onAccetta={onAccetta} onPaywall={onPaywall} />)
    await user.click(screen.getByRole('button', { name: 'Accetta Ada' }))
    expect(onAccetta).toHaveBeenCalledWith('r1')
  })
})
