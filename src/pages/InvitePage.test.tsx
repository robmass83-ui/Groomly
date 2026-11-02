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
import * as cambioSalone from '../data/local/cambioSalone'

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
    callLeggiInvito: vi.fn(async () => ({ stato: 'aperto', salone: 'Bauci', ruolo: 'collaboratore' })),
    callRifiutaInvito: vi.fn(async () => undefined),
    salonePersonale: vi.fn(async () => ({ haDati: false, nome: '' })),
    reloadSignedInAccount: vi.fn(async () => null),
    callSuggerisciIndirizzi: vi.fn(async () => []),
    callDettaglioIndirizzo: vi.fn(async () => null),
  }
})

const sessione: { override: { emailVerified: boolean; legacy: boolean; reloadVerification?: () => Promise<boolean> } | null } = { override: null }
vi.mock('../hooks/useSession', async () => {
  const actual = await vi.importActual<typeof import('../hooks/useSession')>('../hooks/useSession')
  return { ...actual, useSession: () => { const s = actual.useSession(); return sessione.override ? { ...s, ...sessione.override } : s } }
})

vi.mock('../data/local/cambioSalone', () => ({ dopoCambioSalone: vi.fn() }))

const accept = vi.mocked(firebaseClient.callAcceptInvite)
const leggi = vi.mocked(firebaseClient.callLeggiInvito)
const rifiuta = vi.mocked(firebaseClient.callRifiutaInvito)
const cambio = vi.mocked(cambioSalone.dopoCambioSalone)
const personale = vi.mocked(firebaseClient.salonePersonale)
const reload = vi.mocked(firebaseClient.reloadSignedInAccount)

const apri = (initialPath = `/invito/${TOKEN}`) => render(<App memory isDev={false} initialPath={initialPath} />)

describe('pagina d’invito', () => {
  beforeEach(() => {
    localStorage.clear()
    __resetTourAvvio()
    __resetRimandoInvito()
    sessione.override = null
    accept.mockReset().mockResolvedValue(undefined)
    leggi.mockReset().mockResolvedValue({ stato: 'aperto', salone: 'Bauci', ruolo: 'collaboratore' })
    rifiuta.mockReset().mockResolvedValue(undefined)
    personale.mockReset().mockResolvedValue({ haDati: false, nome: '' })
    reload.mockReset().mockResolvedValue(null)
    cambio.mockReset()
  })

  it('fuori sessione mostra Invito e il link Entra, senza chiamare e senza il token', () => {
    render(<App memory isDev={false} initialPath="/invito/tokensegreto" />)
    expect(screen.getByRole('heading', { name: 'Invito' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Entra' })).toHaveAttribute('href', '/login')
    expect(accept).not.toHaveBeenCalled()
    expect(document.body.textContent).not.toContain('tokensegreto')
  })

  const tocca = async () => userEvent.setup().click(await screen.findByRole('button', { name: 'Accetta' }))
  const apriDentro = async (email = 'maria@salone.it', path = '/invito/tokensegreto') => {
    const account = await createAccount(email, 'segretissimo')
    render(<App memory isDev={false} initialPath={path} />)
    return account
  }

  it('dentro sessione non accetta da sola; al tocco accetta una volta, rilegge l’account e riapre l’app pulita', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const before = localStorage.getItem(storageKeys.auth)
    reload.mockResolvedValue({ ...account, salonId: 'salone-invitato', role: 'collaboratore' })
    render(<App memory isDev={false} initialPath="/invito/tokensegreto" />)
    expect(await screen.findByText('Entra nel salone Bauci come Collaboratore')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rifiuta' })).toBeInTheDocument()
    expect(leggi).toHaveBeenCalledTimes(1)
    expect(accept).not.toHaveBeenCalled()
    await userEvent.setup().dblClick(screen.getByRole('button', { name: 'Accetta' }))
    await waitFor(() => expect(cambio).toHaveBeenCalledWith(account.uid))
    expect(cambio).toHaveBeenCalledTimes(1)
    expect(accept).toHaveBeenCalledTimes(1)
    expect(accept).toHaveBeenCalledWith('tokensegreto', undefined)
    expect(reload.mock.invocationCallOrder[0]).toBeLessThan(cambio.mock.invocationCallOrder[0])
    expect(localStorage.getItem(storageKeys.auth)).toBe(before)
    expect(document.body.textContent).not.toContain('tokensegreto')
  })

  it('email non confermata: chiede di confermarla e non offre Accetta', async () => {
    sessione.override = { emailVerified: false, legacy: false }
    await apriDentro()
    expect(await screen.findByText('Conferma la tua email per accettare l’invito')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Accetta' })).not.toBeInTheDocument()
    expect(accept).not.toHaveBeenCalled()
  })

  it('email non confermata: Ho confermato rilegge lo stato e poi compare Accetta; Vai alla Home e invito ricordato', async () => {
    const reloadVerification = vi.fn(async () => {
      sessione.override = { emailVerified: true, legacy: false, reloadVerification }
      return true
    })
    sessione.override = { emailVerified: false, legacy: false, reloadVerification }
    await apriDentro('maria@salone.it', `/invito/${TOKEN}`)
    expect(await screen.findByRole('button', { name: 'Vai alla Home' })).toBeInTheDocument()
    expect(invitoInSospeso()).toBe(TOKEN)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ho confermato' }))
    expect(reloadVerification).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('button', { name: 'Accetta' })).toBeInTheDocument()
  })

  it('legacy non confermato: Accetta è presente', async () => {
    sessione.override = { emailVerified: false, legacy: true }
    await apriDentro()
    expect(await screen.findByRole('button', { name: 'Accetta' })).toBeInTheDocument()
  })

  it('Rifiuta chiama il rifiuto con il token, dimentica l’invito e va alla Home', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    ricordaInvito('tokensegreto')
    render(<App memory isDev={false} initialPath="/invito/tokensegreto" />)
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Rifiuta' }))
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(rifiuta).toHaveBeenCalledWith('tokensegreto')
    expect(invitoInSospeso()).toBeNull()
    expect(accept).not.toHaveBeenCalled()
  })

  it('invito già tuo: lo dice e offre Vai alla Home', async () => {
    leggi.mockResolvedValue({ stato: 'gia-tuo', salone: 'Bauci', ruolo: 'collaboratore' })
    await createAccount('maria@salone.it', 'segretissimo')
    ricordaInvito(TOKEN)
    apri()
    expect(await screen.findByText('Fai già parte di Bauci')).toBeInTheDocument()
    expect(invitoInSospeso()).toBeNull()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Vai alla Home' }))
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
  })

  it.each([['scaduto', 'Invito scaduto'], ['altra-email', 'Questo invito è per un’altra email'], ['non-valido', 'Invito non valido']] as const)('stato «%s»: mostra «%s» e Vai alla Home, senza Accetta', async (stato, testo) => {
    leggi.mockResolvedValue({ stato, salone: '', ruolo: null })
    await createAccount('maria@salone.it', 'segretissimo')
    ricordaInvito(TOKEN)
    apri()
    expect(await screen.findByText(testo)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Vai alla Home' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Accetta' })).not.toBeInTheDocument()
    expect(invitoInSospeso()).toBeNull()
  })

  it('lettura in errore: Invio non riuscito e Vai alla Home', async () => {
    leggi.mockRejectedValue(new Error('rete'))
    await createAccount('maria@salone.it', 'segretissimo')
    apri()
    expect(await screen.findByText('Invio non riuscito')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Vai alla Home' })).toBeInTheDocument()
  })

  it('errore con codice e [400]: toglie prefisso e codice', async () => {
    accept.mockRejectedValue(new Error('failed-precondition: Invito scaduto [400]'))
    await apriDentro()
    await tocca()
    expect(await screen.findByText('Invito scaduto')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('[400]')
    expect(document.body.textContent).not.toContain('failed-precondition')
    expect(document.body.textContent).not.toContain('tokensegreto')
    expect(cambio).not.toHaveBeenCalled()
    expect(reload).not.toHaveBeenCalled()
  })

  it('email da confermare restituita dal server: mostra il testo per confermarla', async () => {
    accept.mockRejectedValue(new Error('failed-precondition: Conferma la tua email per accettare l’invito'))
    await apriDentro()
    await tocca()
    expect(await screen.findByText('Conferma la tua email per accettare l’invito')).toBeInTheDocument()
  })

  it('rinnovo del token offline: Invio non riuscito, mai il messaggio grezzo', async () => {
    accept.mockRejectedValue(Object.assign(new Error('Firebase: Error (auth/network-request-failed).'), { code: 'auth/network-request-failed' }))
    await apriDentro()
    await tocca()
    expect(await screen.findByText('Invio non riuscito')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('auth/')
  })

  it('invito non valido dall’accettazione mostra solo quel messaggio', async () => {
    accept.mockRejectedValue(new Error('functions/failed-precondition: Invito non valido'))
    await apriDentro()
    await tocca()
    expect(await screen.findByText('Invito non valido')).toBeInTheDocument()
    expect(screen.queryByText('Aspetta un momento e riprova')).not.toBeInTheDocument()
    expect(document.body.textContent).not.toContain('functions/')
  })

  it('se la rilettura fallisce riapre comunque l’app pulita', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const before = localStorage.getItem(storageKeys.auth)
    reload.mockRejectedValue(new Error('rete'))
    render(<App memory isDev={false} initialPath="/invito/tokensegreto" />)
    await tocca()
    await waitFor(() => expect(cambio).toHaveBeenCalledWith(account.uid))
    expect(accept).toHaveBeenCalledTimes(1)
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

  it('da dentro, con salone vuoto, al tocco accetta senza avviso e riapre l’app', async () => {
    const account = await createAccount('ada@salone.it', 'segretissimo')
    ricordaInvito(TOKEN)
    apri()
    await tocca()
    await waitFor(() => expect(cambio).toHaveBeenCalledWith(account.uid))
    expect(accept).toHaveBeenCalledTimes(1)
    expect(accept).toHaveBeenCalledWith(TOKEN, undefined)
    expect(invitoInSospeso()).toBeNull()
    expect(screen.queryByText('Hai già un salone su Groomly')).not.toBeInTheDocument()
  })

  it('da dentro, con salone pieno, Accetta avvisa; Metti in pausa accetta con la pausa', async () => {
    personale.mockResolvedValue({ haDati: true, nome: 'Luna' })
    const user = userEvent.setup()
    await createAccount('ada@salone.it', 'segretissimo')
    apri()
    await tocca()
    expect(await screen.findByText('Hai già un salone su Groomly')).toBeInTheDocument()
    expect(screen.getByText('Hai già un account Groomly con il salone Luna. I tuoi dati restano salvati. Cosa vuoi fare con il tuo salone mentre lavori nell’altro?')).toBeInTheDocument()
    expect(screen.getByText('Prenotazioni online e lista d’attesa si fermano e riprendono quando torni.')).toBeInTheDocument()
    expect(screen.getByText('Se hai un abbonamento attivo, si gestisce dal Play Store: Groomly non lo cambia.')).toBeInTheDocument()
    expect(accept).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Metti in pausa il mio salone' }))
    await waitFor(() => expect(cambio).toHaveBeenCalledTimes(1))
    expect(accept).toHaveBeenCalledWith(TOKEN, 'pausa')
  })

  it('salone pieno senza nome: l’avviso non lascia «il salone .»', async () => {
    personale.mockResolvedValue({ haDati: true, nome: '' })
    await createAccount('ada@salone.it', 'segretissimo')
    apri()
    await tocca()
    expect(await screen.findByText('Hai già un account Groomly con un tuo salone. I tuoi dati restano salvati. Cosa vuoi fare con il tuo salone mentre lavori nell’altro?')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('il salone .')
  })

  it('chi lavora già in un altro salone non legge il salone personale: al tocco chiede al server senza scelta', async () => {
    const account = await createAccount('ada@salone.it', 'segretissimo')
    localStorage.setItem(storageKeys.auth, JSON.stringify({ ...account, salonId: 'salone-altro', role: 'collaboratore' }))
    accept.mockRejectedValue(new Error('functions/failed-precondition: Questo account ha già un salone'))
    ricordaInvito(TOKEN)
    apri()
    await tocca()
    expect(await screen.findByText('Questo account ha già un salone')).toBeInTheDocument()
    expect(personale).not.toHaveBeenCalled()
    expect(accept).toHaveBeenCalledWith(TOKEN, undefined)
    expect(invitoInSospeso()).toBeNull()
    expect(cambio).not.toHaveBeenCalled()
  })

  it('Lascia aperto accetta con il salone aperto', async () => {
    personale.mockResolvedValue({ haDati: true, nome: 'Luna' })
    const user = userEvent.setup()
    await createAccount('ada@salone.it', 'segretissimo')
    apri()
    await tocca()
    await user.click(await screen.findByRole('button', { name: 'Lascia aperto il mio salone' }))
    await waitFor(() => expect(cambio).toHaveBeenCalledTimes(1))
    expect(accept).toHaveBeenCalledWith(TOKEN, 'aperto')
  })

  it('Annulla torna alla Home senza accettare e dimentica l’invito', async () => {
    personale.mockResolvedValue({ haDati: true, nome: 'Luna' })
    const user = userEvent.setup()
    await createAccount('ada@salone.it', 'segretissimo')
    ricordaInvito(TOKEN)
    apri()
    await tocca()
    await user.click(await screen.findByRole('button', { name: 'Annulla' }))
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(accept).not.toHaveBeenCalled()
    expect(invitoInSospeso()).toBeNull()
    expect(cambio).not.toHaveBeenCalled()
  })

  it.each(['Invito non valido', 'Invito scaduto', 'Posti esauriti', 'Questo account ha già un salone'])('errore definitivo «%s»: lo mostra, dimentica l’invito, una sola chiamata', async (messaggio) => {
    accept.mockRejectedValue(new Error(`functions/failed-precondition: ${messaggio}`))
    await createAccount('ada@salone.it', 'segretissimo')
    ricordaInvito(TOKEN)
    apri()
    await tocca()
    expect(await screen.findByText(messaggio)).toBeInTheDocument()
    expect(invitoInSospeso()).toBeNull()
    await new Promise((r) => setTimeout(r, 30))
    expect(accept).toHaveBeenCalledTimes(1)
    expect(cambio).not.toHaveBeenCalled()
  })

  it.each([
    ['functions/internal', 'INTERNAL'],
    ['functions/unavailable', 'UNAVAILABLE'],
    ['functions/deadline-exceeded', 'DEADLINE_EXCEEDED'],
  ])('errore di rete/server «%s»: Invio non riuscito, mai il testo grezzo, invito tenuto, senza riprovare', async (code, message) => {
    accept.mockRejectedValue(Object.assign(new Error(message), { code }))
    await createAccount('ada@salone.it', 'segretissimo')
    ricordaInvito(TOKEN)
    apri()
    await tocca()
    expect(await screen.findByText('Invio non riuscito')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain(message)
    expect(document.body.textContent).not.toContain('functions/')
    expect(invitoInSospeso()).toBe(TOKEN)
    await new Promise((r) => setTimeout(r, 30))
    expect(accept).toHaveBeenCalledTimes(1)
  })

  it('failed-precondition con messaggio del server: lo mostra', async () => {
    accept.mockRejectedValue(Object.assign(new Error('Invito scaduto'), { code: 'functions/failed-precondition' }))
    await createAccount('ada@salone.it', 'segretissimo')
    apri()
    await tocca()
    expect(await screen.findByText('Invito scaduto')).toBeInTheDocument()
  })

  it('se non si sa com’è il salone personale non accetta', async () => {
    personale.mockRejectedValue(new Error('rete'))
    await createAccount('ada@salone.it', 'segretissimo')
    apri()
    await tocca()
    expect(await screen.findByText('Invio non riuscito')).toBeInTheDocument()
    expect(accept).not.toHaveBeenCalled()
    expect(cambio).not.toHaveBeenCalled()
  })
})

describe('rimando all’invito', () => {
  beforeEach(() => {
    localStorage.clear()
    __resetTourAvvio()
    __resetRimandoInvito()
    sessione.override = null
    accept.mockReset().mockReturnValue(new Promise(() => undefined))
    leggi.mockReset().mockResolvedValue({ stato: 'aperto', salone: 'Bauci', ruolo: 'collaboratore' })
    personale.mockReset().mockResolvedValue({ haDati: false, nome: '' })
  })

  it('con un invito in sospeso, entrando nella Home, va alla pagina dell’invito senza accettarlo', async () => {
    await createAccount('ada@salone.it', 'segretissimo')
    ricordaInvito(TOKEN)
    apri('/')
    expect(await screen.findByRole('button', { name: 'Accetta' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Invito' })).toBeInTheDocument()
    expect(accept).not.toHaveBeenCalled()
  })

  it('senza invito in sospeso resta nella Home', async () => {
    await createAccount('ada@salone.it', 'segretissimo')
    apri('/')
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    await new Promise((r) => setTimeout(r, 30))
    expect(accept).not.toHaveBeenCalled()
  })
})
