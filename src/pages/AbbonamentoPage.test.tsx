// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { storageKeys, writeJson } from '../data/local/storage'
import type { PianoValore } from '../hooks/usePiano'
import type { LivelloElenco } from '../lib/funzioniPiano'
import { statoDaLivello } from '../lib/funzioniPiano'

const pianoForzato = vi.hoisted(() => ({ valore: null as PianoValore | null }))
vi.mock('../hooks/usePiano', async () => {
  const actual = await vi.importActual<typeof import('../hooks/usePiano')>('../hooks/usePiano')
  return {
    ...actual,
    usePiano: () => pianoForzato.valore ?? actual.usePiano(),
  }
})

function piano(livello: LivelloElenco): PianoValore {
  return {
    mostraPiani: false,
    abbonamentiAttivi: false,
    tour: { acceso: false, dal: null },
    stato: statoDaLivello(livello, new Date(2026, 9, 31)),
    funzioni: {},
    provaUsata: true,
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

async function apri(path: string, livello: LivelloElenco, ruolo?: 'collaboratore') {
  const account = await createAccount('ada@salone.it', 'segretissimo')
  if (ruolo) writeJson(storageKeys.auth, { ...account, role: ruolo })
  pianoForzato.valore = piano(livello)
  render(<App memory isDev={false} initialPath={path} />)
}

describe('Abbonamento', () => {
  beforeEach(() => {
    localStorage.clear()
    pianoForzato.valore = null
  })

  it('la scelta mostra Go gratis e attivo e i prezzi di Plus e Salone per un utente base', async () => {
    await apri('/impostazioni/abbonamento', 'base')
    expect(await screen.findByRole('heading', { name: 'Abbonamento' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Groomly Go/ })).toHaveAttribute('href', '/impostazioni/abbonamento/go')
    expect(screen.getByRole('link', { name: /Groomly Plus/ })).toHaveTextContent(/9,99 €\s*al mese/)
    expect(screen.getByRole('link', { name: /Groomly Salone/ })).toHaveTextContent(/19,99 €\s*al mese/)
    expect(screen.getAllByText('Attivo')).toHaveLength(1)
  })

  it('vip vede tutti e tre i piani attivi nella scelta', async () => {
    await apri('/impostazioni/abbonamento', 'vip')
    expect(await screen.findByRole('heading', { name: 'Abbonamento' })).toBeInTheDocument()
    expect(screen.getAllByText('Attivo')).toHaveLength(3)
  })

  it('base su Plus vede la vetrina senza interruttori', async () => {
    await apri('/impostazioni/abbonamento/plus', 'base')
    expect(await screen.findByRole('button', { name: 'Abbonati' })).toBeInTheDocument()
    expect(screen.getByText('9,99 €')).toBeInTheDocument()
    expect(screen.getByText('Prenotazioni online')).toBeInTheDocument()
    expect(screen.queryAllByRole('switch')).toHaveLength(0)
  })

  it('Abbonati apre «In arrivo»', async () => {
    const user = userEvent.setup()
    await apri('/impostazioni/abbonamento/salone', 'base')
    await user.click(await screen.findByRole('button', { name: 'Abbonati' }))
    expect(await screen.findByRole('dialog', { name: 'In arrivo' })).toHaveTextContent('Presto potrai abbonarti direttamente dall’app.')
  })

  it('un abbonato Plus vede Attivo e gli interruttori Plus', async () => {
    await apri('/impostazioni/abbonamento/plus', 'pro')
    expect(await screen.findByRole('switch', { name: 'Prenotazioni online' })).toBeInTheDocument()
    expect(screen.getByText('Attivo')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abbonati' })).not.toBeInTheDocument()
  })

  it('un abbonato Plus su Salone vede la vetrina e non Collaboratori', async () => {
    await apri('/impostazioni/abbonamento/salone', 'pro')
    expect(await screen.findByRole('button', { name: 'Abbonati' })).toBeInTheDocument()
    expect(screen.queryByText('Collaboratori')).not.toBeInTheDocument()
    expect(screen.queryAllByRole('switch')).toHaveLength(0)
  })

  it('un abbonato Salone vede Plus e Collaboratori', async () => {
    await apri('/impostazioni/abbonamento/salone', 'salone')
    expect(await screen.findByRole('switch', { name: 'Prenotazioni online' })).toBeInTheDocument()
    expect(screen.getByText('Collaboratori')).toBeInTheDocument()
  })

  it('Go mostra subito gli interruttori base', async () => {
    await apri('/impostazioni/abbonamento/go', 'base')
    expect(await screen.findByRole('switch', { name: 'Messaggi WhatsApp' })).toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'Prenotazioni online' })).not.toBeInTheDocument()
  })

  it('il collaboratore sulla vetrina legge che lo accende il titolare', async () => {
    await apri('/impostazioni/abbonamento/plus', 'base', 'collaboratore')
    expect(await screen.findByText('Lo accende il titolare.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abbonati' })).not.toBeInTheDocument()
  })

  it('un piano sconosciuto rimanda alla scelta', async () => {
    await apri('/impostazioni/abbonamento/xyz', 'base')
    expect(await screen.findByRole('heading', { name: 'Abbonamento' })).toBeInTheDocument()
  })
})

describe('Abbonamento nelle Impostazioni', () => {
  beforeEach(() => {
    localStorage.clear()
    pianoForzato.valore = null
  })

  it('la scorciatoia Abbonamento sostituisce Controlli avanzati e la pillola del piano', async () => {
    await apri('/impostazioni', 'base')
    expect(await screen.findByRole('heading', { name: 'Impostazioni' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abbonamento' })).toHaveAttribute('href', '/impostazioni/abbonamento')
    expect(screen.queryByText('Controlli avanzati')).not.toBeInTheDocument()
    expect(screen.queryByText(/Piano ·/)).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Groomly' })).toHaveAttribute('height', '44')
  })

  it('anche il collaboratore vede la scorciatoia', async () => {
    await apri('/impostazioni', 'pro', 'collaboratore')
    expect(await screen.findByRole('link', { name: 'Abbonamento' })).toBeInTheDocument()
  })

  it('il vecchio indirizzo di Controlli avanzati porta ad Abbonamento', async () => {
    await apri('/impostazioni/strumenti', 'base')
    expect(await screen.findByRole('heading', { name: 'Abbonamento' })).toBeInTheDocument()
  })
})
