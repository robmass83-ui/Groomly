// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ChiediPronto } from './ChiediPronto'

describe('chiedi pronto', () => {
  it('chiede se mandare la mail e i due pulsanti sono alti 48', async () => {
    const onInvia = vi.fn()
    const onChiudi = vi.fn()
    const user = userEvent.setup()
    render(<ChiediPronto nomeCane="Rex" inInvio={false} onInvia={onInvia} onChiudi={onChiudi} />)
    expect(screen.getByRole('dialog', { name: 'Cane pronto' })).toBeInTheDocument()
    expect(screen.getByText('Vuoi mandare la mail che Rex è pronto?')).toBeInTheDocument()
    const no = screen.getByRole('button', { name: 'Non ora' })
    const invia = screen.getByRole('button', { name: 'Invia' })
    expect(no.getAttribute('style')).toContain('min-height: 48px')
    expect(invia.getAttribute('style')).toContain('min-height: 48px')
    await user.click(invia)
    expect(onInvia).toHaveBeenCalledOnce()
    await user.click(no)
    expect(onChiudi).toHaveBeenCalledOnce()
  })

  it('senza cane il dialogo non c’è, e durante l’invio i pulsanti sono spenti', async () => {
    const onChiudi = vi.fn()
    const user = userEvent.setup()
    const vista = render(<ChiediPronto nomeCane={null} inInvio={false} onInvia={() => {}} onChiudi={onChiudi} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    vista.rerender(<ChiediPronto nomeCane="Rex" inInvio onInvia={() => {}} onChiudi={onChiudi} />)
    expect(screen.getByRole('button', { name: 'Invio…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Non ora' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(onChiudi).not.toHaveBeenCalled()
  })
})
