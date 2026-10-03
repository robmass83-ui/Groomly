// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
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
})
