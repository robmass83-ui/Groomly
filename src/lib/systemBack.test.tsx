import { useState } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Dialog } from '../components/layout/Dialog'
import { Sheet } from '../components/layout/Sheet'
import { dismissTopOverlay, isDogScreen, systemBackChoice } from './systemBack'

describe('tasto indietro di sistema', () => {
  it('sulla scheda e sul nuovo cane torna agli animali, anche se il webview non ha storia', () => {
    expect(isDogScreen('/animali/nuovo')).toBe(true)
    expect(isDogScreen('/animali/kratos')).toBe(true)
    expect(isDogScreen('/animali')).toBe(false)
    expect(systemBackChoice('/animali/nuovo', false, false)).toBe('dog')
    expect(systemBackChoice('/animali/kratos', false, false)).toBe('dog')
  })

  it('con un foglio aperto lo chiude prima di lasciare la scheda', () => {
    expect(systemBackChoice('/animali/kratos', true, false)).toBe('dismiss')
    expect(systemBackChoice('/calendario', true, true)).toBe('dismiss')
  })

  it('fuori dalla scheda torna indietro nella storia, oppure esce se non c’è', () => {
    expect(systemBackChoice('/calendario', false, true)).toBe('history')
    expect(systemBackChoice('/', false, false)).toBe('exit')
  })

  it('dalle pagine del listino per razza torna al listino, anche senza storia', () => {
    expect(systemBackChoice('/listino/prezzi', false, false)).toBe('listino')
    expect(systemBackChoice('/listino/gestione', false, true)).toBe('listino')
    expect(systemBackChoice('/listino/stampa', false, false)).toBe('listino')
    expect(systemBackChoice('/listino', false, true)).toBe('history')
    expect(systemBackChoice('/listino/prezzi', true, false)).toBe('dismiss')
  })

  it('chiude il foglio in primo piano e poi il dialogo sotto', () => {
    const onSheet = vi.fn()
    const onDialog = vi.fn()
    function Stack() {
      const [sheet, setSheet] = useState(true)
      const [dialog, setDialog] = useState(true)
      return (
        <>
          <Dialog open={dialog} title="Contatto" onClose={() => { onDialog(); setDialog(false) }}><p>Dentro</p></Dialog>
          <Sheet open={sheet} title="Scheda" onClose={() => { onSheet(); setSheet(false) }}><p>Menu</p></Sheet>
        </>
      )
    }
    render(<Stack />)
    act(() => {
      expect(dismissTopOverlay()).toBe(true)
    })
    expect(onSheet).toHaveBeenCalledOnce()
    expect(onDialog).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: 'Scheda' })).toBeNull()
    act(() => {
      expect(dismissTopOverlay()).toBe(true)
    })
    expect(onDialog).toHaveBeenCalledOnce()
  })

  it('il dialogo si chiude anche dal pulsante interno', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Dialog open title="Tag" onClose={onClose}><p>Testo</p></Dialog>)
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
