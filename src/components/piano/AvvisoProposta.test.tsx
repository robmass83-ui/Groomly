import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AvvisoProposta } from './AvvisoProposta'

const adesso = new Date('2026-10-25T00:00:00.000Z')

describe('avviso proposta', () => {
  it('con i piani spenti non si vede e Non ora chiude', async () => {
    const onNonOra = vi.fn()
    const user = userEvent.setup()
    const spento = render(<AvvisoProposta mostra={false} ultima={null} adesso={adesso} onNonOra={onNonOra} />)
    expect(spento.container).toBeEmptyDOMElement()
    render(<AvvisoProposta mostra ultima={null} adesso={adesso} onNonOra={onNonOra} />)
    await user.click(screen.getByRole('button', { name: 'Non ora' }))
    expect(onNonOra).toHaveBeenCalledOnce()
    const recente = render(<AvvisoProposta mostra ultima={new Date('2026-10-24T00:00:00.000Z')} adesso={adesso} onNonOra={onNonOra} />)
    expect(recente.container).toBeEmptyDOMElement()
  })
})
