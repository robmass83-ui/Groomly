// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { storageKeys, writeJson } from '../data/local/storage'
import type { PianoValore } from '../hooks/usePiano'
import type { LivelloElenco } from '../lib/funzioniPiano'
import { statoDaLivello } from '../lib/funzioniPiano'
import { statoPiano } from '../lib/piano'

const pianoForzato = vi.hoisted(() => ({ valore: null as PianoValore | null }))
vi.mock('../hooks/usePiano', async () => {
  const actual = await vi.importActual<typeof import('../hooks/usePiano')>('../hooks/usePiano')
  return {
    ...actual,
    usePiano: () => pianoForzato.valore ?? actual.usePiano(),
  }
})

function piano(livello: LivelloElenco, extra: Partial<PianoValore> = {}): PianoValore {
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
    ...extra,
  }
}

async function apri(path: string, livello: LivelloElenco, ruolo?: 'collaboratore', extra: Partial<PianoValore> = {}) {
  const account = await createAccount('ada@salone.it', 'segretissimo')
  if (ruolo) writeJson(storageKeys.auth, { ...account, role: ruolo })
  pianoForzato.valore = piano(livello, extra)
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
    expect(screen.getByRole('link', { name: /^Abbonamento/ })).toHaveAttribute('href', '/impostazioni/abbonamento')
    expect(screen.queryByText('Controlli avanzati')).not.toBeInTheDocument()
    expect(screen.queryByText(/Piano ·/)).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Groomly' })).toHaveAttribute('height', '44')
  })

  it('anche il collaboratore vede la scorciatoia', async () => {
    await apri('/impostazioni', 'pro', 'collaboratore')
    expect(await screen.findByRole('link', { name: /^Abbonamento/ })).toBeInTheDocument()
  })

  it('il vecchio indirizzo di Controlli avanzati porta ad Abbonamento', async () => {
    await apri('/impostazioni/strumenti', 'base')
    expect(await screen.findByRole('heading', { name: 'Abbonamento' })).toBeInTheDocument()
  })
})

function inProva(giorni: number): Partial<PianoValore> {
  const adesso = new Date()
  return { stato: statoPiano({ piano: 'pro', stato: 'prova', fonte: 'prova', provaUsata: true, scadeIl: new Date(adesso.getTime() + giorni * 86400000 - 60000).toISOString() }, adesso) }
}

describe('scheda Abbonamento in Impostazioni', () => {
  beforeEach(() => {
    localStorage.clear()
    pianoForzato.valore = null
  })

  const scheda = () => screen.findByRole('link', { name: /^Abbonamento/ })

  it('Go con la prova mai usata: Gratis, Passa a Plus e il bollino dei 30 giorni', async () => {
    await apri('/impostazioni', 'base', undefined, { provaUsata: false })
    const link = await scheda()
    expect(link).toHaveAttribute('href', '/impostazioni/abbonamento')
    expect(link).toHaveTextContent('Go · Gratis')
    expect(link).toHaveTextContent('Passa a Plus')
    expect(link).toHaveTextContent('30 GIORNI GRATIS')
    expect(link).toHaveAttribute('data-riflesso', 'si')
  })

  it('Go con la prova già usata: niente bollino, resta l’invito', async () => {
    await apri('/impostazioni', 'base')
    const link = await scheda()
    expect(link).toHaveTextContent('Passa a Plus')
    expect(link).not.toHaveTextContent('30 GIORNI GRATIS')
    expect(link).toHaveAttribute('data-riflesso', 'si')
  })

  it('il collaboratore non vede i 30 giorni: la prova la avvia il titolare', async () => {
    await apri('/impostazioni', 'base', 'collaboratore', { provaUsata: false })
    expect(await scheda()).not.toHaveTextContent('30 GIORNI GRATIS')
  })

  it('in prova mostra i giorni rimasti, senza riflesso', async () => {
    await apri('/impostazioni', 'pro', undefined, inProva(12))
    const link = await scheda()
    expect(link).toHaveTextContent('Prova Plus')
    expect(link).toHaveTextContent('ancora 12 giorni')
    expect(link).toHaveAttribute('data-riflesso', 'no')
  })

  it('all’ultimo giorno di prova scrive «ancora 1 giorno»', async () => {
    await apri('/impostazioni', 'pro', undefined, inProva(1))
    expect(await scheda()).toHaveTextContent('ancora 1 giorno')
  })

  it('Plus, Salone e VIP mostrano il loro piano', async () => {
    await apri('/impostazioni', 'pro')
    expect(await scheda()).toHaveTextContent('Groomly Plus')
    cleanup()
    localStorage.clear()
    await apri('/impostazioni', 'salone')
    expect(await scheda()).toHaveTextContent('Groomly Salone')
    cleanup()
    localStorage.clear()
    await apri('/impostazioni', 'vip')
    const vip = await scheda()
    expect(vip).toHaveTextContent('Il tuo piano')
    expect(vip).toHaveTextContent('Groomly VIP')
    expect(vip).toHaveAttribute('data-riflesso', 'no')
  })

  it('finché il piano non è arrivato non mostra un piano sbagliato', async () => {
    await apri('/impostazioni', 'base', undefined, { pronto: false, provaUsata: false })
    const link = await scheda()
    expect(link).not.toHaveTextContent('Gratis')
    expect(link).not.toHaveTextContent('30 GIORNI GRATIS')
  })
})

describe('prova gratuita dalla pagina Plus', () => {
  beforeEach(() => {
    localStorage.clear()
    pianoForzato.valore = null
  })

  it('il titolare con la prova mai usata la avvia da qui', async () => {
    const prova = vi.fn(async () => undefined)
    const user = userEvent.setup()
    await apri('/impostazioni/abbonamento/plus', 'base', undefined, { provaUsata: false, prova })
    await user.click(await screen.findByRole('button', { name: 'Prova Plus gratis per 30 giorni' }))
    expect(prova).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Abbonati' })).toBeInTheDocument()
  })

  it('con la prova già usata resta solo Abbonati', async () => {
    await apri('/impostazioni/abbonamento/plus', 'base')
    expect(await screen.findByRole('button', { name: 'Abbonati' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Prova Plus gratis per 30 giorni' })).not.toBeInTheDocument()
  })

  it('la pagina Salone non offre la prova, che è di Plus', async () => {
    await apri('/impostazioni/abbonamento/salone', 'base', undefined, { provaUsata: false })
    expect(await screen.findByRole('button', { name: 'Abbonati' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Prova Plus gratis per 30 giorni' })).not.toBeInTheDocument()
  })
})
