// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import type { PianoValore } from '../hooks/usePiano'
import { statoPiano } from '../lib/piano'

const pianoForzato = vi.hoisted(() => ({ valore: null as PianoValore | null }))
vi.mock('../hooks/usePiano', async () => {
  const actual = await vi.importActual<typeof import('../hooks/usePiano')>('../hooks/usePiano')
  return {
    ...actual,
    usePiano: () => pianoForzato.valore ?? actual.usePiano(),
  }
})

describe('pagina Statistiche', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('con il piano base mostra tutte le schede, senza anteprima né finestra', async () => {
    const apriPaywall = vi.fn()
    pianoForzato.valore = {
      mostraPiani: true,
      abbonamentiAttivi: false,
      tour: { acceso: false, dal: null },
      stato: statoPiano(undefined, new Date(2026, 9, 10, 12, 0, 0, 0)),
      provaUsata: false,
      paywall: null,
      esitoProva: 'spento',
      messaggioProva: '',
      apriPaywall,
      chiudiPaywall: () => undefined,
      prova: async () => undefined,
      avvisa: async () => undefined,
    }
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/incassi/statistiche" />)
    expect(await screen.findByText(/^Previsione:/)).toBeInTheDocument()
    expect(screen.getByText(/^In ritardo:/)).toBeInTheDocument()
    expect(screen.getByText(/^Euro l’ora:/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previsione' })).not.toBeInTheDocument()
    expect(apriPaywall).not.toHaveBeenCalled()
  })
})
