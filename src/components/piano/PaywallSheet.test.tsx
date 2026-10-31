import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PaywallSheet } from './PaywallSheet'

describe('paywall in arrivo', () => {
  it('non mostra prezzi e avvisa', async () => {
    const user = userEvent.setup()
    const onAvvisami = vi.fn()
    render(<PaywallSheet open puoProvare={false} onClose={() => undefined} onAvvisami={onAvvisami} onProva={() => undefined} />)
    const dialogo = screen.getByRole('dialog', { name: 'Abbonamenti in arrivo' })
    expect(dialogo).toBeInTheDocument()
    expect(dialogo.parentElement?.getAttribute('style') ?? '').toContain('position: fixed')
    expect(screen.queryByText(/€/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Avvisami' }))
    expect(onAvvisami).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Prova Plus gratis per 30 giorni' })).not.toBeInTheDocument()
  })

  it('offre la prova se non è mai stata usata', () => {
    render(<PaywallSheet open puoProvare onClose={() => undefined} onAvvisami={() => undefined} onProva={() => undefined} />)
    expect(screen.getByRole('button', { name: 'Prova Plus gratis per 30 giorni' })).toBeInTheDocument()
  })
})
