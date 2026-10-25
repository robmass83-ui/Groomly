import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TesseraFedelta } from './TesseraFedelta'

describe('tessera fedeltà', () => {
  it('con i piani spenti non si vede', () => {
    const { container } = render(<TesseraFedelta mostra={false} accesso accesa timbri={10} premio onPaywall={() => undefined} onUsa={() => undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('in base mostra il badge', async () => {
    const onPaywall = vi.fn()
    const user = userEvent.setup()
    render(<TesseraFedelta mostra accesso={false} accesa timbri={3} premio={false} onPaywall={onPaywall} onUsa={() => undefined} />)
    await user.click(screen.getByRole('button', { name: 'Tessera fedeltà' }))
    expect(onPaywall).toHaveBeenCalledOnce()
  })

  it('con accesso mostra i timbri e il premio', () => {
    render(<TesseraFedelta mostra accesso accesa timbri={10} premio onPaywall={() => undefined} onUsa={() => undefined} />)
    expect(screen.getByText('Timbri: 10')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Usa il premio' })).toBeInTheDocument()
  })
})
