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

  it('con accesso mostra i dieci segni e il premio a dieci', async () => {
    const onUsa = vi.fn()
    const user = userEvent.setup()
    render(<TesseraFedelta mostra accesso accesa timbri={10} premio onPaywall={() => undefined} onUsa={onUsa} />)
    expect(screen.queryByText(/Timbri:/)).not.toBeInTheDocument()
    expect(screen.getByText('10 su 10')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Usa premio' }))
    expect(onUsa).toHaveBeenCalledOnce()
  })

  it('prima di dieci non offre il premio', () => {
    render(<TesseraFedelta mostra accesso accesa timbri={7} premio={false} onPaywall={() => undefined} onUsa={() => undefined} />)
    expect(screen.getByText('7 su 10')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Usa premio' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Usa il premio' })).not.toBeInTheDocument()
  })

  it('spenta nasconde i segni e non cancella il conteggio passato', () => {
    const { container } = render(<TesseraFedelta mostra accesso accesa={false} timbri={7} premio={false} onPaywall={() => undefined} onUsa={() => undefined} />)
    expect(container).toBeEmptyDOMElement()
  })
})
