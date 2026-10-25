// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CloseVisitDialog } from './CloseVisitDialog'

const base = {
  open: true,
  quotedPrice: 50,
  quotedMinutes: 60,
  initialPrice: 50,
  initialMinutes: 60,
  initialNote: '',
  initialPayment: null,
  onClose: vi.fn(),
  onNone: vi.fn(),
  onSave: vi.fn(),
}

describe('CloseVisitDialog', () => {
  it('Nessuna modifica completa senza variazione', async () => {
    const onNone = vi.fn()
    const user = userEvent.setup()
    render(<CloseVisitDialog {...base} mode="complete" onNone={onNone} />)
    expect(screen.getByRole('dialog', { name: 'Completare' })).toHaveTextContent('Previsto € 50 · 1 h 00')
    expect(screen.getByText('Pagamento')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salva e completa' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'POS' }))
    await user.click(screen.getByRole('button', { name: 'Nessuna modifica' }))
    expect(onNone).toHaveBeenCalledWith({ total: null, actualDurationMin: 60, adjustmentNote: null, paymentMethod: 'pos' })
  })

  it('con variazione Salva e completa chiede la nota', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    render(<CloseVisitDialog {...base} mode="complete" onSave={onSave} />)
    await user.clear(screen.getByRole('textbox', { name: 'Prezzo' }))
    await user.type(screen.getByRole('textbox', { name: 'Prezzo' }), '70')
    await user.clear(screen.getByRole('textbox', { name: 'Ore' }))
    await user.type(screen.getByRole('textbox', { name: 'Ore' }), '2')
    expect(screen.getByRole('button', { name: 'Nessuna modifica' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Salva e completa' })).toBeDisabled()
    expect(screen.getByText('Scrivi perché il prezzo è diverso')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Contanti' }))
    await user.type(screen.getByRole('textbox', { name: 'Nota' }), 'Pieno di nodi')
    await user.click(screen.getByRole('button', { name: 'Salva e completa' }))
    expect(onSave).toHaveBeenCalledWith({ total: 70, actualDurationMin: 120, adjustmentNote: 'Pieno di nodi', paymentMethod: 'contanti' })
  })

  it('in correzione Salva toglie il totale se si torna al previsto e tiene la nota', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    render(<CloseVisitDialog {...base} mode="correct" initialPayment="pos" initialPrice={70} initialMinutes={120} initialNote="Nodi" onSave={onSave} />)
    expect(screen.getByRole('dialog', { name: 'Correggi' })).toBeInTheDocument()
    await user.clear(screen.getByRole('textbox', { name: 'Prezzo' }))
    await user.type(screen.getByRole('textbox', { name: 'Prezzo' }), '50')
    await user.clear(screen.getByRole('textbox', { name: 'Ore' }))
    await user.type(screen.getByRole('textbox', { name: 'Ore' }), '1')
    await user.clear(screen.getByRole('textbox', { name: 'Minuti' }))
    await user.type(screen.getByRole('textbox', { name: 'Minuti' }), '0')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(onSave).toHaveBeenCalledWith({ total: null, actualDurationMin: 60, adjustmentNote: 'Nodi', paymentMethod: 'pos' })
  })

  it('mostra gli errori e la X non salva', async () => {
    const onClose = vi.fn()
    const onSave = vi.fn()
    const user = userEvent.setup()
    render(<CloseVisitDialog {...base} mode="complete" onClose={onClose} onSave={onSave} />)
    await user.clear(screen.getByRole('textbox', { name: 'Prezzo' }))
    await user.type(screen.getByRole('textbox', { name: 'Prezzo' }), 'no')
    expect(screen.getByText('Importo non valido')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('solo le ore accendono Salva e completa senza nota', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    render(<CloseVisitDialog {...base} mode="complete" onSave={onSave} />)
    await user.clear(screen.getByRole('textbox', { name: 'Ore' }))
    await user.type(screen.getByRole('textbox', { name: 'Ore' }), '2')
    expect(screen.getByRole('button', { name: 'Salva e completa' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'POS' }))
    await user.click(screen.getByRole('button', { name: 'Salva e completa' }))
    expect(onSave).toHaveBeenCalledWith({ total: null, actualDurationMin: 120, adjustmentNote: null, paymentMethod: 'pos' })
  })

  it('N/A con prezzo diverso da zero spiega l\'errore e non salva', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    render(<CloseVisitDialog {...base} mode="complete" onSave={onSave} />)
    await user.click(screen.getByRole('button', { name: 'N/A' }))
    expect(screen.getByText('Con N/A il prezzo deve essere 0')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salva e completa' })).toBeDisabled()
    await user.clear(screen.getByRole('textbox', { name: 'Prezzo' }))
    await user.type(screen.getByRole('textbox', { name: 'Prezzo' }), '0')
    expect(screen.queryByText('Con N/A il prezzo deve essere 0')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Salva e completa' }))
    expect(onSave).toHaveBeenCalledWith({ total: 0, actualDurationMin: 60, adjustmentNote: null, paymentMethod: 'na' })
  })

  it('in correzione parte dal metodo salvato', () => {
    render(<CloseVisitDialog {...base} mode="correct" initialPayment="contanti" initialPrice={50} initialMinutes={60} />)
    expect(screen.getByRole('button', { name: 'Contanti' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'POS' })).toHaveAttribute('aria-pressed', 'false')
  })
})
