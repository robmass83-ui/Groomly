// @vitest-environment happy-dom
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider, useToast } from './Toast'

function Probe() {
  const toast = useToast()
  return <button type="button" onClick={() => toast.show('Fissato per gio 29 ott 09:30', 'plain', { label: 'Annulla', onClick: () => { document.body.dataset.undone = '1' } })}>Apri</button>
}

describe('toast', () => {
  it('mostra Annulla solo quando l’azione c’è', async () => {
    const user = userEvent.setup()
    render(<ToastProvider><Probe /></ToastProvider>)
    await user.click(screen.getByRole('button', { name: 'Apri' }))
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    expect(document.body.dataset.undone).toBe('1')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('separa il messaggio dall’azione e dura 5 secondi se richiesto', () => {
    vi.useFakeTimers()
    try {
      function Long() {
        const toast = useToast()
        return <button type="button" onClick={() => toast.show('Appuntamento disdetto', 'plain', { label: 'Annulla', onClick: () => {} }, undefined, 5000)}>Apri</button>
      }
      render(<ToastProvider><Long /></ToastProvider>)
      act(() => { screen.getByRole('button', { name: 'Apri' }).click() })
      const status = screen.getByRole('status')
      expect(status).toHaveTextContent('Appuntamento disdetto')
      expect(status.textContent).not.toContain('·')
      expect(screen.getByRole('button', { name: 'Annulla' })).toBeInTheDocument()
      act(() => { vi.advanceTimersByTime(4900) })
      expect(screen.getByRole('status')).toBeInTheDocument()
      act(() => { vi.advanceTimersByTime(200) })
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('senza durata il toast sparisce dopo 2 secondi', () => {
    vi.useFakeTimers()
    try {
      render(<ToastProvider><Probe /></ToastProvider>)
      act(() => { screen.getByRole('button', { name: 'Apri' }).click() })
      act(() => { vi.advanceTimersByTime(1900) })
      expect(screen.getByRole('status')).toBeInTheDocument()
      act(() => { vi.advanceTimersByTime(200) })
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})
