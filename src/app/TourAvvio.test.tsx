// @vitest-environment happy-dom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { __resetTourAvvio } from './TourAvvio'
import { createAccount } from '../data/local/auth'
import { getSettings } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'
import { ROBERTO_EMAIL } from '../lib/salonPath'
import type { TourSalone } from '../lib/tourBenvenuto'

const DAL = '2026-10-01T00:00:00.000Z'

const stato = vi.hoisted(() => ({
  acceso: true,
  creazione: '2026-10-20T10:00:00.000Z' as string | null,
  nonPronto: false,
  stantio: false,
  attesaCreazione: null as Promise<void> | null,
}))

vi.mock('../lib/driveAuth', () => ({
  DriveAuth: { leggi: vi.fn(async () => ({ collegato: false, email: null })), collega: vi.fn(), conferma: vi.fn(), scollega: vi.fn(), programma: vi.fn(async () => undefined) },
}))

vi.mock('../hooks/usePiano', async () => {
  const actual = await vi.importActual<typeof import('../hooks/usePiano')>('../hooks/usePiano')
  return {
    ...actual,
    usePiano: () => ({ ...actual.usePiano(), tour: { acceso: stato.acceso, dal: DAL } }),
  }
})

vi.mock('../hooks/useSettings', async () => {
  const actual = await vi.importActual<typeof import('../hooks/useSettings')>('../hooks/useSettings')
  return {
    ...actual,
    useSettings: () => {
      const api = actual.useSettings()
      if (stato.stantio) return { ...api, stantio: true }
      return stato.nonPronto ? { ...api, ready: false } : api
    },
  }
})

vi.mock('../data/firebase/client', async () => {
  const actual = await vi.importActual<typeof import('../data/firebase/client')>('../data/firebase/client')
  return {
    ...actual,
    creazioneAccount: vi.fn(async () => {
      if (stato.attesaCreazione) await stato.attesaCreazione
      return stato.creazione
    }),
    callSuggerisciIndirizzi: vi.fn(async () => []),
    callDettaglioIndirizzo: vi.fn(async () => null),
  }
})

async function nuovoSalone(tour?: TourSalone, email = 'maria@salone.it') {
  const account = await createAccount(email, 'segretissimo')
  const base = getSettings(account.uid)
  writeJson(storageKeys.settings(account.uid), {
    ...base,
    business: { ...base.business, salonName: 'Il Cane Felice', name: 'Il Cane Felice' },
    ...(tour ? { tourBenvenuto: tour } : {}),
  })
  return account
}

const apri = (initialPath = '/') => render(<App memory isDev={false} initialPath={initialPath} />)
const benvenuto = () => screen.queryByRole('heading', { name: 'Ciao Il Cane Felice! Prepariamo il salone insieme ✨' })
const avviso = () => screen.queryByText('Non hai finito di preparare il salone.')

async function home() {
  expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
  // lascia arrivare la risposta di creazioneAccount
  await act(async () => { await new Promise((r) => setTimeout(r, 20)) })
}

describe('avvio del tour', () => {
  beforeEach(() => {
    localStorage.clear()
    __resetTourAvvio()
    stato.acceso = true
    stato.creazione = '2026-10-20T10:00:00.000Z'
    stato.nonPronto = false
    stato.stantio = false
    stato.attesaCreazione = null
  })

  it('un account nuovo senza tour aperto su / finisce sul benvenuto', async () => {
    await nuovoSalone()
    apri()
    expect(await screen.findByRole('heading', { name: 'Ciao Il Cane Felice! Prepariamo il salone insieme ✨' })).toBeInTheDocument()
  })

  it('finché le impostazioni non sono pronte non reindirizza, poi sì', async () => {
    await nuovoSalone()
    stato.nonPronto = true
    const vista = apri()
    await home()
    expect(benvenuto()).not.toBeInTheDocument()
    expect(avviso()).not.toBeInTheDocument()
    stato.nonPronto = false
    vista.rerender(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('heading', { name: 'Ciao Il Cane Felice! Prepariamo il salone insieme ✨' })).toBeInTheDocument()
  })

  it('con la sola copia salvata sul telefono non decide niente: né reindirizzamento né avviso', async () => {
    await nuovoSalone()
    stato.stantio = true
    apri()
    await home()
    expect(benvenuto()).not.toBeInTheDocument()
    cleanup()
    localStorage.clear()
    __resetTourAvvio()
    await nuovoSalone({ stato: 'in-corso', saltati: [] }, 'luca@salone.it')
    apri()
    await home()
    expect(avviso()).not.toBeInTheDocument()
  })

  it('finché creazioneAccount non risponde non decide niente', async () => {
    await nuovoSalone()
    let rispondi = () => {}
    stato.attesaCreazione = new Promise<void>((r) => { rispondi = r })
    apri()
    await home()
    expect(benvenuto()).not.toBeInTheDocument()
    await act(async () => { rispondi() })
    expect(await screen.findByRole('heading', { name: 'Ciao Il Cane Felice! Prepariamo il salone insieme ✨' })).toBeInTheDocument()
  })

  it('tour lasciato a metà: resta su /, avviso; Continua riparte senza il logo saltato', async () => {
    await nuovoSalone({ stato: 'in-corso', saltati: ['logo'] })
    const user = userEvent.setup()
    apri()
    await home()
    expect(benvenuto()).not.toBeInTheDocument()
    expect(await screen.findByText('Non hai finito di preparare il salone.')).toBeInTheDocument()
    expect(screen.getByText('Vuoi continuare?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continua' }))
    // ripresa: niente benvenuto, si parte dal primo passo non saltato
    expect(await screen.findByRole('heading', { name: 'Dove sei e quando ti trovano aperto?' })).toBeInTheDocument()
    expect(screen.getByText('Prepariamo il salone · 1 di 4')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Il tuo logo' })).not.toBeInTheDocument()
    expect(benvenuto()).not.toBeInTheDocument()
    expect(avviso()).not.toBeInTheDocument()
  })

  it('la X nasconde l\'avviso per tutta l\'apertura, anche rimontando', async () => {
    await nuovoSalone({ stato: 'in-corso', saltati: [] })
    const user = userEvent.setup()
    apri()
    await home()
    await user.click(await screen.findByRole('button', { name: 'Chiudi l’avviso' }))
    expect(avviso()).not.toBeInTheDocument()
    cleanup()
    apri()
    await home()
    expect(avviso()).not.toBeInTheDocument()
  })

  it('il reindirizzamento avviene una volta sola per apertura', async () => {
    await nuovoSalone()
    apri()
    await screen.findByRole('heading', { name: 'Ciao Il Cane Felice! Prepariamo il salone insieme ✨' })
    cleanup()
    // tour ancora mai scritto (es. uscita prima che salvasse): non si torna al benvenuto
    const uid = localStorage.getItem('groomly.session') as string
    const s = getSettings(uid)
    writeJson(storageKeys.settings(uid), { ...s, tourBenvenuto: undefined })
    apri()
    await home()
    expect(benvenuto()).not.toBeInTheDocument()
  })

  it('reindirizzamento e X valgono per account:un altro account nella stessa apertura li ha', async () => {
    await nuovoSalone()
    apri()
    await screen.findByRole('heading', { name: 'Ciao Il Cane Felice! Prepariamo il salone insieme ✨' })
    cleanup()
    localStorage.clear()
    await nuovoSalone(undefined, 'luca@salone.it')
    apri()
    expect(await screen.findByRole('heading', { name: 'Ciao Il Cane Felice! Prepariamo il salone insieme ✨' })).toBeInTheDocument()
    cleanup()
    localStorage.clear()
    const user = userEvent.setup()
    await nuovoSalone({ stato: 'in-corso', saltati: [] }, 'anna@salone.it')
    apri()
    await home()
    await user.click(await screen.findByRole('button', { name: 'Chiudi l’avviso' }))
    cleanup()
    localStorage.clear()
    await nuovoSalone({ stato: 'in-corso', saltati: [] }, 'piero@salone.it')
    apri()
    await home()
    expect(await screen.findByText('Non hai finito di preparare il salone.')).toBeInTheDocument()
  })

  it('collaboratore: né reindirizzamento né avviso', async () => {
    const account = await nuovoSalone()
    writeJson(storageKeys.auth, { ...account, role: 'collaboratore', salonId: account.uid })
    apri()
    await home()
    expect(benvenuto()).not.toBeInTheDocument()
    expect(avviso()).not.toBeInTheDocument()
  })

  it('socio entrato in un salone già avviato: né reindirizzamento né avviso', async () => {
    const account = await nuovoSalone()
    writeJson(storageKeys.auth, { ...account, role: 'socio', salonId: account.uid })
    apri()
    await home()
    expect(benvenuto()).not.toBeInTheDocument()
    expect(avviso()).not.toBeInTheDocument()
  })

  it('operatore (salone condiviso): né reindirizzamento né avviso', async () => {
    await nuovoSalone({ stato: 'in-corso', saltati: [] }, ROBERTO_EMAIL)
    apri()
    await home()
    expect(benvenuto()).not.toBeInTheDocument()
    expect(avviso()).not.toBeInTheDocument()
  })

  it('interruttore spento: né reindirizzamento né avviso', async () => {
    stato.acceso = false
    await nuovoSalone({ stato: 'in-corso', saltati: [] })
    apri()
    await home()
    expect(avviso()).not.toBeInTheDocument()
    cleanup()
    localStorage.clear()
    await nuovoSalone()
    apri()
    await home()
    expect(benvenuto()).not.toBeInTheDocument()
  })

  it('account creato prima di dal: né reindirizzamento né avviso', async () => {
    stato.creazione = '2026-09-01T00:00:00.000Z'
    await nuovoSalone()
    apri()
    await home()
    expect(benvenuto()).not.toBeInTheDocument()
    expect(avviso()).not.toBeInTheDocument()
  })

  it('l\'avviso compare solo sulla Home, non sulle altre pagine', async () => {
    await nuovoSalone({ stato: 'in-corso', saltati: [] })
    apri('/animali')
    await screen.findByRole('heading', { name: 'Animali' })
    await act(async () => { await new Promise((r) => setTimeout(r, 30)) })
    expect(avviso()).not.toBeInTheDocument()
  })

  it('sul benvenuto l\'avviso non compare', async () => {
    await nuovoSalone({ stato: 'in-corso', saltati: [] })
    apri('/benvenuto')
    await screen.findByRole('heading', { name: 'Il tuo logo' })
    await act(async () => { await new Promise((r) => setTimeout(r, 20)) })
    expect(avviso()).not.toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Continua' })).not.toBeInTheDocument())
  })
})
