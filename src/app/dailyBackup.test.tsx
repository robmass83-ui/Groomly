// @vitest-environment happy-dom
import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAccount } from '../data/local/auth'
import type { PianoValore } from '../hooks/usePiano'
import { statoPiano } from '../lib/piano'

const { pianoForzato, copia } = vi.hoisted(() => ({
  pianoForzato: { valore: null as PianoValore | null },
  copia: vi.fn(),
}))

vi.mock('../hooks/usePiano', async () => {
  const actual = await vi.importActual<typeof import('../hooks/usePiano')>('../hooks/usePiano')
  return { ...actual, usePiano: () => pianoForzato.valore ?? actual.usePiano() }
})

vi.mock('../lib/backupDoc', async () => {
  const actual = await vi.importActual<typeof import('../lib/backupDoc')>('../lib/backupDoc')
  return { ...actual, maybeDailyBackup: copia }
})

import { Providers } from './providers'

function piano(livello: 'base' | 'pro', pronto = true): PianoValore {
  return {
    mostraPiani: false,
    abbonamentiAttivi: false,
    tour: { acceso: false, dal: null },
    stato: statoPiano(livello === 'pro' ? { piano: 'pro', stato: 'attivo', fonte: 'manuale' } : undefined, new Date()),
    provaUsata: true,
    paywall: null,
    esitoProva: 'spento',
    messaggioProva: '',
    apriPaywall: () => undefined,
    chiudiPaywall: () => undefined,
    prova: async () => undefined,
    avvisa: async () => undefined,
    pronto,
  }
}

describe('backup automatico di ogni giorno', () => {
  beforeEach(() => {
    localStorage.clear()
    copia.mockClear()
  })

  it('con Plus la copia del giorno parte', async () => {
    const account = await createAccount('ada@salone.it', 'segretissimo')
    pianoForzato.valore = piano('pro')
    render(<Providers><span /></Providers>)
    await waitFor(() => expect(copia).toHaveBeenCalledWith(account.uid))
  })

  it('in Go la copia del giorno non parte, anche se il salone la teneva accesa', async () => {
    await createAccount('gina@salone.it', 'segretissimo')
    pianoForzato.valore = piano('base')
    render(<Providers><span /></Providers>)
    await new Promise((fine) => setTimeout(fine, 50))
    expect(copia).not.toHaveBeenCalled()
  })

  it('finché il piano non è arrivato non parte, poi con Plus sì', async () => {
    const account = await createAccount('lia@salone.it', 'segretissimo')
    pianoForzato.valore = piano('pro', false)
    const vista = render(<Providers><span /></Providers>)
    await new Promise((fine) => setTimeout(fine, 50))
    expect(copia).not.toHaveBeenCalled()
    pianoForzato.valore = piano('pro')
    vista.rerender(<Providers><span /></Providers>)
    await waitFor(() => expect(copia).toHaveBeenCalledWith(account.uid))
  })
})
