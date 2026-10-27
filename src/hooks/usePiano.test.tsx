import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PianoProvider, usePiano } from './usePiano'
import type { FeatureKey } from '../lib/piano'

const { scriviInteresse, callAvviaProva } = vi.hoisted(() => ({
  scriviInteresse: vi.fn(async (_feature: string) => undefined),
  callAvviaProva: vi.fn(async () => undefined),
}))

vi.mock('../data/firebase/client', () => ({
  listenDocumentoPiano: vi.fn(async () => () => undefined),
  scriviInteresse,
  callAvviaProva,
}))

function Apri({ feature }: { feature: FeatureKey }) {
  const piano = usePiano()
  return <button type="button" onClick={() => piano.apriPaywall(feature)}>Apri</button>
}

function Prova() {
  const piano = usePiano()
  return <button type="button" onClick={() => { void piano.prova() }}>Prova</button>
}

describe('paywall avvisami', () => {
  beforeEach(() => {
    scriviInteresse.mockClear()
    callAvviaProva.mockReset()
    callAvviaProva.mockResolvedValue(undefined)
  })

  it('Avvisami scrive l’interesse della funzione', async () => {
    const user = userEvent.setup()
    render(<PianoProvider><Apri feature="export" /></PianoProvider>)
    await user.click(screen.getByRole('button', { name: 'Apri' }))
    await user.click(screen.getByRole('button', { name: 'Avvisami' }))
    expect(scriviInteresse).toHaveBeenCalledWith('export')
  })

  it('la prova apre il foglio sullo schermo e lo lascia aperto con l’esito', async () => {
    const user = userEvent.setup()
    render(<PianoProvider><Prova /></PianoProvider>)
    await user.click(screen.getByRole('button', { name: 'Prova' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Abbonamenti in arrivo' })
    expect(dialogo.parentElement?.parentElement).toBe(document.body)
    expect(dialogo.parentElement?.getAttribute('style') ?? '').toContain('position: fixed')
    expect(callAvviaProva).toHaveBeenCalledOnce()
    expect(await screen.findByText('La prova Pro è attiva per 30 giorni. Puoi usare le funzioni Pro.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Abbonamenti in arrivo' })).toBeInTheDocument()
  })

  it('se la prova non parte il foglio resta aperto con il motivo', async () => {
    callAvviaProva.mockRejectedValueOnce(new Error('Prova già usata'))
    const user = userEvent.setup()
    render(<PianoProvider><Prova /></PianoProvider>)
    await user.click(screen.getByRole('button', { name: 'Prova' }))
    expect(await screen.findByText('Prova già usata')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Abbonamenti in arrivo' })).toBeInTheDocument()
  })
})