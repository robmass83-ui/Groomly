import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PianoProvider, usePiano } from './usePiano'
import type { FeatureKey } from '../lib/piano'

const { scriviInteresse } = vi.hoisted(() => ({
  scriviInteresse: vi.fn(async (_feature: string) => undefined),
}))

vi.mock('../data/firebase/client', () => ({
  listenDocumentoPiano: vi.fn(async () => () => undefined),
  scriviInteresse,
}))

function Apri({ feature }: { feature: FeatureKey }) {
  const piano = usePiano()
  return <button type="button" onClick={() => piano.apriPaywall(feature)}>Apri</button>
}

describe('paywall avvisami', () => {
  beforeEach(() => {
    scriviInteresse.mockClear()
  })

  it('Avvisami scrive l’interesse della funzione', async () => {
    const user = userEvent.setup()
    render(<PianoProvider><Apri feature="export" /></PianoProvider>)
    await user.click(screen.getByRole('button', { name: 'Apri' }))
    await user.click(screen.getByRole('button', { name: 'Avvisami' }))
    expect(scriviInteresse).toHaveBeenCalledWith('export')
  })
})