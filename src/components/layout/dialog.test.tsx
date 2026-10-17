// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Dialog } from './Dialog'
import { Sheet } from './Sheet'

function Harness({ initial = true }: { initial?: boolean }) {
  const [open, setOpen] = useState(initial)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Apri</button>
      <Dialog open={open} title="Contatto" onClose={() => setOpen(false)}>
        <input aria-label="Nome contatto" />
        <p>Dentro</p>
      </Dialog>
    </>
  )
}

describe('popup', () => {
  it('da chiuso non c’è', () => {
    render(<Dialog open={false} title="Contatto" onClose={() => undefined}><p>Dentro</p></Dialog>)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('è centrato, senza maniglia, con un solo Chiudi', () => {
    render(<Harness />)
    const dialog = screen.getByRole('dialog', { name: 'Contatto' })
    expect(screen.queryByTestId('sheet-grabber')).toBeNull()
    expect(dialog.parentElement?.getAttribute('style')).toContain('align-items: center')
    expect(dialog.parentElement?.getAttribute('style')).toContain('justify-content: center')
    expect(dialog.parentElement?.getAttribute('style')).toContain('z-index: 30')
    expect(dialog.parentElement?.getAttribute('style')).toContain('padding: 16px')
    const style = dialog.getAttribute('style') ?? ''
    expect(style).toMatch(/border-radius:\s*18px(;|$)/)
    expect(style).toContain('max-height: min(90dvh, calc(100dvh - 32px))')
    expect(style).not.toMatch(/(^|[^-])height: \d/)
    expect(dialog).toHaveAttribute('tabindex', '-1')
    expect(dialog).toHaveFocus()
    expect(screen.getByLabelText('Nome contatto')).not.toHaveFocus()
    expect(screen.getAllByRole('button', { name: 'Chiudi' })).toHaveLength(1)
    const body = screen.getByText('Dentro').parentElement
    expect(body?.getAttribute('style')).toContain('overflow: auto')
    expect(body?.getAttribute('style')).toContain('gap: 9px')
    expect(body?.getAttribute('style')).toContain('min-height: 0')
    expect(body?.getAttribute('style')).toContain('padding: 3px')
    const backdrop = screen.getByTestId('dialog-backdrop')
    expect(backdrop.tagName).toBe('DIV')
    expect(backdrop).toHaveAttribute('aria-hidden', 'true')
  })

  it('✕, velo ed Esc chiudono; un click nel riquadro no', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('heading', { name: 'Contatto' }))
    expect(screen.getByRole('dialog', { name: 'Contatto' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Apri' }))
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(screen.queryByRole('dialog')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Apri' }))
    fireEvent.click(screen.getByTestId('dialog-backdrop'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('Esc da chiuso non chiama onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Dialog open={false} title="Contatto" onClose={onClose}><p>Dentro</p></Dialog>)
    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('con il pannello aperto la pagina sotto non scorre', () => {
    render(<Sheet open title="Esporta per il commercialista" onClose={() => undefined}><div style={{ height: 2000 }}>lungo</div></Sheet>)
    expect(document.body.style.overflow).toBe('hidden')
    const body = screen.getByText('lungo').parentElement
    expect(body?.getAttribute('style')).toContain('overflow: auto')
    expect(body?.getAttribute('style')).toContain('overscroll-behavior: contain')
  })

  it('non ruba il focus al campo mentre resta aperto', () => {
    const { rerender } = render(
      <Dialog open title="Contatto" onClose={() => undefined}><input aria-label="Nome contatto" /></Dialog>,
    )
    const field = screen.getByLabelText('Nome contatto')
    field.focus()
    rerender(<Dialog open title="Contatto" onClose={() => undefined}><input aria-label="Nome contatto" /></Dialog>)
    expect(field).toHaveFocus()
  })
})
