import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PaywallSheet } from './PaywallSheet'

describe('paywall in arrivo', () => {
  it('non mostra prezzi e avvisa', async () => {
    const user = userEvent.setup()
    const onAvvisami = vi.fn()
    render(<PaywallSheet open puoProvare={false} onClose={() => undefined} onAvvisami={onAvvisami} onProva={() => undefined} />)
    expect(screen.getByRole('dialog', { name: 'Abbonamenti in arrivo' })).toBeInTheDocument()
    expect(screen.queryByText(/€/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Avvisami' }))
    expect(onAvvisami).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: 'Prova gratis 30 giorni' })).not.toBeInTheDocument()
  })

  it('offre la prova se non è mai stata usata', () => {
    render(<PaywallSheet open puoProvare onClose={() => undefined} onAvvisami={() => undefined} onProva={() => undefined} />)
    expect(screen.getByRole('button', { name: 'Prova gratis 30 giorni' })).toBeInTheDocument()
  })
})
