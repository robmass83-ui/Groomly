// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { createAccount } from '../data/local/auth'
import type { PianoValore } from '../hooks/usePiano'
import type { LivelloElenco } from '../lib/funzioniPiano'
import { statoDaLivello } from '../lib/funzioniPiano'

const pianoForzato = vi.hoisted(() => ({ valore: null as PianoValore | null }))
vi.mock('../hooks/usePiano', async () => {
  const actual = await vi.importActual<typeof import('../hooks/usePiano')>('../hooks/usePiano')
  return { ...actual, usePiano: () => pianoForzato.valore ?? actual.usePiano() }
})
vi.mock('../data/firebase/client', () => ({
  watchSalonAccess: async (_salonId: string, onChange: (access: unknown) => void) => {
    onChange({ enabled: true, members: [], openInviteExpiries: [] })
    return () => undefined
  },
  callSetSalonPro: async () => undefined,
}))

function piano(livello: LivelloElenco): PianoValore {
  return {
    mostraPiani: false,
    abbonamentiAttivi: false,
    tour: { acceso: false, dal: null },
    stato: statoDaLivello(livello, new Date(2026, 9, 31)),
    provaUsata: true,
    provaConcessa: false,
    paywall: null,
    esitoProva: 'spento',
    messaggioProva: '',
    apriPaywall: () => undefined,
    chiudiPaywall: () => undefined,
    prova: async () => undefined,
    avvisa: async () => undefined,
    livelloNome: livello,
  }
}

async function apri(email: string, livello: LivelloElenco) {
  await createAccount(email, 'segretissimo')
  pianoForzato.valore = piano(livello)
  render(<App memory isDev={false} initialPath="/impostazioni/pro" />)
}

describe('/impostazioni/pro', () => {
  beforeEach(() => {
    cleanup()
    localStorage.clear()
    pianoForzato.valore = null
  })

  it.each(['base', 'pro'] as const)('un titolare con piano %s va alla pagina Abbonamento', async (livello) => {
    await apri('ada@salone.it', livello)
    expect(await screen.findByRole('heading', { name: 'Abbonamento' })).toBeInTheDocument()
  })

  it('l’operatore senza Salone vede ancora la pagina con l’interruttore', async () => {
    await apri('laura.masala@tiscali.it', 'pro')
    expect(await screen.findByRole('heading', { name: 'Funzioni Plus' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Piano Plus' })).toBeInTheDocument()
  })

  it('con Salone va alla pagina Team, che dice Piano Salone e non Piano Plus', async () => {
    await apri('ada@salone.it', 'salone')
    expect(await screen.findByRole('heading', { name: 'Team' })).toBeInTheDocument()
    expect(screen.getByText('Piano Salone')).toBeInTheDocument()
    expect(screen.queryByText('Piano Plus')).not.toBeInTheDocument()
  })
})
