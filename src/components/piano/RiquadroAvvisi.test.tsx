import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RiquadroAvvisi } from './RiquadroAvvisi'

const voce = { id: 'a', telefono: '393331111111', chiave: 'a:2026-10-26' }

describe('riquadro avvisi', () => {
  it('con i piani spenti non mostra il riquadro', () => {
    const { container } = render(<RiquadroAvvisi mostra={false} voci={[voce]} onInviato={() => undefined} />)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByLabelText('Avvisi di domani')).not.toBeInTheDocument()
  })

  it('in base il riquadro c’è e segnare il primo chiama la chiave', async () => {
    const onInviato = vi.fn()
    const user = userEvent.setup()
    render(<RiquadroAvvisi mostra voci={[voce, { ...voce, id: 'b', chiave: 'b:2026-10-26' }]} onInviato={onInviato} />)
    expect(screen.getByRole('region', { name: 'Avvisi di domani' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Segna inviato' }))
    expect(onInviato).toHaveBeenCalledWith('a:2026-10-26')
  })
})
