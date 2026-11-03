// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { blankSettings } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'
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
      provaConcessa: true,
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
    expect(await screen.findByText('Previsione del mese')).toBeInTheDocument()
    expect(screen.getByText('Clienti in ritardo')).toBeInTheDocument()
    expect(screen.getByText('€ all’ora')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previsione' })).not.toBeInTheDocument()
    expect(apriPaywall).not.toHaveBeenCalled()
  })

  it('con Nascondi importi acceso mostra ••• al posto degli euro', async () => {
    pianoForzato.valore = null
    const account = await createAccount('maria@salone.it', 'segretissimo')
    writeJson(storageKeys.settings(account.uid), { ...blankSettings('auto', '2026-10-10T00:00:00.000Z'), ui: { hideAmounts: true } })
    render(<App memory isDev={false} initialPath="/incassi/statistiche" />)
    expect(await screen.findByText('Previsione del mese')).toBeInTheDocument()
    expect(screen.getAllByText('•••').length).toBeGreaterThanOrEqual(1)
    expect(document.body.textContent).not.toMatch(/€ ?[0-9]/)
  })
})
