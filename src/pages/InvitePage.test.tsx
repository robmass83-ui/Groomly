// @vitest-environment happy-dom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { __resetRimandoInvito } from '../app/RimandoInvito'
import { __resetTourAvvio } from '../app/TourAvvio'
import * as firebaseClient from '../data/firebase/client'
import { createAccount } from '../data/local/auth'
import { storageKeys } from '../data/local/storage'
import { invitoInSospeso, ricordaInvito } from '../data/local/invitoInSospeso'

const TOKEN = 'ab'.repeat(32)

vi.mock('../lib/driveAuth', () => ({
  DriveAuth: { leggi: vi.fn(async () => ({ collegato: false, email: null })), collega: vi.fn(), conferma: vi.fn(), scollega: vi.fn(), programma: vi.fn(async () => undefined) },
}))

vi.mock('../data/firebase/client', async () => {
  const actual = await vi.importActual<typeof import('../data/firebase/client')>('../data/firebase/client')
  return {
    ...actual,
    creazioneAccount: vi.fn(async () => null),
    callAcceptInvite: vi.fn(async () => undefined),
    salonePersonale: vi.fn(async () => ({ haDati: false, nome: '' })),
    reloadSignedInAccount: vi.fn(async () => null),
    callSuggerisciIndirizzi: vi.fn(async () => []),
    callDettaglioIndirizzo: vi.fn(async () => null),
  }
})

const accept = vi.mocked(firebaseClient.callAcceptInvite)
const personale = vi.mocked(firebaseClient.salonePersonale)
const reload = vi.mocked(firebaseClient.reloadSignedInAccount)

const apri = (initialPath = `/invito/${TOKEN}`) => render(<App memory isDev={false} initialPath={initialPath} />)

describe('pagina d’invito', () => {
  beforeEach(() => {
    localStorage.clear()
    __resetTourAvvio()
    __resetRimandoInvito()
    accept.mockReset().mockResolvedValue(undefined)
    personale.mockReset().mockResolvedValue({ haDati: false, nome: '' })
    reload.mockReset().mockResolvedValue(null)
  })

  it('fuori sessione mostra Invito e il link Entra, senza chiamare e senza il token', () => {
    render(<App memory isDev={false} initialPath="/invito/tokensegreto" />)
    expect(screen.getByRole('heading', { name: 'Invito' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Entra' })).toHaveAttribute('href', '/login')
    expect(accept).not.toHaveBeenCalled()
    expect(document.body.textContent).not.toContain('tokensegreto')
  })

  it('dentro sessione accetta una volta e apre la home del salone', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const before = localStorage.getItem(storageKeys.auth)
    reload.mockResolvedValue({ ...account, salonId: 'salone-invitato', role: 'collaboratore' })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/invito/tokensegreto" />)
    expect(await screen.findByRole('heading', { name: 'Groomly' })).toBeInTheDocument()
    expect(accept).toHaveBeenCalledTimes(1)
    expect(accept).toHaveBeenCalledWith('tokensegreto', undefined)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(storageKeys.auth)).toBe(before)
    expect(document.body.textContent).not.toContain('tokensegreto')
    await user.click(screen.getByRole('link', { name: /^Impostazioni/ }))
    expect(await screen.findByRole('heading', { name: 'Impostazioni' })).toBeInTheDocument()
    expect(screen.queryByText('Funzioni Pro')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Modifica attività' })).not.toBeInTheDocument()
  })

  it('invito scaduto resta in pagina e non scrive l’account', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const before = localStorage.getItem(storageKeys.auth)
    accept.mockRejectedValue(new Error('Invito scaduto'))
    render(<App memory isDev={false} initialPath="/invito/tokensegreto" />)
    expect(await screen.findByText('Invito scaduto')).toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.auth)).toBe(before)
    expect(reload).not.toHaveBeenCalled()
    expect(screen.queryByRole('heading', { name: 'Groomly' })).not.toBeInTheDocument()
    expect(document.body.textContent).not.toContain('tokensegreto')
  })

  it('invito non valido mostra solo quel messaggio', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    accept.mockRejectedValue(new Error('Invito non valido'))
    render(<App memory isDev={false} initialPath="/invito/tokensegreto" />)
    expect(await screen.findByText('Invito non valido')).toBeInTheDocument()
    expect(screen.getByRole('paragraph').textContent).toBe('Invito non valido')
    expect(screen.queryByText('Aspetta un momento e riprova')).not.toBeInTheDocument()
    expect(screen.queryByText('Invio non riuscito')).not.toBeInTheDocument()
    expect(document.body.textContent).not.toContain('functions/')
    expect(document.body.textContent).not.toContain('tokensegreto')
  })

  it('toglie il prefisso della funzione e lascia Invito scaduto', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    accept.mockRejectedValue(new Error('functions/failed-precondition: Invito scaduto'))
    render(<App memory isDev={false} initialPath="/invito/tokensegreto" />)
    expect(await screen.findByText('Invito scaduto')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('functions/')
    expect(document.body.textContent).not.toContain('failed-precondition')
    expect(document.body.textContent).not.toContain('tokensegreto')
  })

  it('se la rilettura fallisce apre comunque la home', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const before = localStorage.getItem(storageKeys.auth)
    reload.mockRejectedValue(new Error('rete'))
    render(<App memory isDev={false} initialPath="/invito/tokensegreto" />)
    expect(await screen.findByRole('heading', { name: 'Groomly' })).toBeInTheDocument()
    expect(accept).toHaveBeenCalledTimes(1)
    expect(accept).toHaveBeenCalledWith('tokensegreto', undefined)
    expect(screen.queryByText('rete')).not.toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.auth)).toBe(before)
  })

  it('da sloggati ricorda l’invito e offre Entra e Crea account', async () => {
    const user = userEvent.setup()
    apri()
    expect(await screen.findByRole('link', { name: 'Entra' })).toBeInTheDocument()
    expect(invitoInSospeso()).toBe(TOKEN)
    await user.click(screen.getByRole('button', { name: 'Crea account' }))
    expect(await screen.findByRole('heading', { name: 'Crea account' })).toBeInTheDocument()
    expect(accept).not.toHaveBeenCalled()
  })

  it('da dentro, con salone vuoto, accetta senza avviso e torna alla Home', async () => {
    await createAccount('ada@salone.it', 'segretissimo')
    ricordaInvito(TOKEN)
    apri()
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(accept).toHaveBeenCalledTimes(1)
    expect(accept).toHaveBeenCalledWith(TOKEN, undefined)
    expect(invitoInSospeso()).toBeNull()
    expect(screen.queryByText('Hai già un salone su Groomly')).not.toBeInTheDocument()
  })

  it('da dentro, con salone pieno, avvisa; Metti in pausa accetta con la pausa', async () => {
    personale.mockResolvedValue({ haDati: true, nome: 'Luna' })
    const user = userEvent.setup()
    await createAccount('ada@salone.it', 'segretissimo')
    apri()
    expect(await screen.findByText('Hai già un salone su Groomly')).toBeInTheDocument()
    expect(screen.getByText('Hai già un account Groomly con il salone Luna. I tuoi dati restano salvati. Cosa vuoi fare con il tuo salone mentre lavori nell’altro?')).toBeInTheDocument()
    expect(screen.getByText('Prenotazioni online e lista d’attesa si fermano e riprendono quando torni.')).toBeInTheDocument()
    expect(screen.getByText('Se hai un abbonamento attivo, si gestisce dal Play Store: Groomly non lo cambia.')).toBeInTheDocument()
    expect(accept).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Metti in pausa il mio salone' }))
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(accept).toHaveBeenCalledWith(TOKEN, 'pausa')
  })

  it('Lascia aperto accetta con il salone aperto', async () => {
    personale.mockResolvedValue({ haDati: true, nome: 'Luna' })
    const user = userEvent.setup()
    await createAccount('ada@salone.it', 'segretissimo')
    apri()
    await user.click(await screen.findByRole('button', { name: 'Lascia aperto il mio salone' }))
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(accept).toHaveBeenCalledWith(TOKEN, 'aperto')
  })

  it('Annulla torna alla Home senza accettare e dimentica l’invito', async () => {
    personale.mockResolvedValue({ haDati: true, nome: 'Luna' })
    const user = userEvent.setup()
    await createAccount('ada@salone.it', 'segretissimo')
    ricordaInvito(TOKEN)
    apri()
    await user.click(await screen.findByRole('button', { name: 'Annulla' }))
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(accept).not.toHaveBeenCalled()
    expect(invitoInSospeso()).toBeNull()
  })

  it.each(['Invito non valido', 'Invito scaduto', 'Posti esauriti', 'Questo account ha già un salone'])('errore definitivo «%s»: lo mostra, dimentica l’invito, una sola chiamata', async (messaggio) => {
    accept.mockRejectedValue(new Error(`functions/failed-precondition: ${messaggio}`))
    await createAccount('ada@salone.it', 'segretissimo')
    ricordaInvito(TOKEN)
    apri()
    expect(await screen.findByText(messaggio)).toBeInTheDocument()
    expect(invitoInSospeso()).toBeNull()
    await new Promise((r) => setTimeout(r, 30))
    expect(accept).toHaveBeenCalledTimes(1)
  })

  it('errore di rete: lo mostra e tiene l’invito, senza riprovare', async () => {
    accept.mockRejectedValue(new Error('functions/unavailable: Connessione assente'))
    await createAccount('ada@salone.it', 'segretissimo')
    ricordaInvito(TOKEN)
    apri()
    expect(await screen.findByText('Connessione assente')).toBeInTheDocument()
    expect(invitoInSospeso()).toBe(TOKEN)
    await new Promise((r) => setTimeout(r, 30))
    expect(accept).toHaveBeenCalledTimes(1)
  })

  it('se non si sa com’è il salone personale non accetta', async () => {
    personale.mockRejectedValue(new Error('rete'))
    await createAccount('ada@salone.it', 'segretissimo')
    apri()
    expect(await screen.findByText('Invio non riuscito')).toBeInTheDocument()
    expect(accept).not.toHaveBeenCalled()
  })
})

describe('rimando all’invito', () => {
  beforeEach(() => {
    localStorage.clear()
    __resetTourAvvio()
    __resetRimandoInvito()
    accept.mockReset().mockReturnValue(new Promise(() => undefined))
    personale.mockReset().mockResolvedValue({ haDati: false, nome: '' })
  })

  it('con un invito in sospeso, entrando nella Home, va alla pagina dell’invito', async () => {
    await createAccount('ada@salone.it', 'segretissimo')
    ricordaInvito(TOKEN)
    apri('/')
    await waitFor(() => expect(accept).toHaveBeenCalledWith(TOKEN, undefined))
    expect(screen.getByRole('heading', { name: 'Invito' })).toBeInTheDocument()
  })

  it('senza invito in sospeso resta nella Home', async () => {
    await createAccount('ada@salone.it', 'segretissimo')
    apri('/')
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 30))
    expect(accept).not.toHaveBeenCalled()
  })
})
