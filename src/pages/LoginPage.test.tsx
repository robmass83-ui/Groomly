// @vitest-environment happy-dom
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import logoAnimato from '../assets/brand/groomly-logo-animato.svg'
import logoAnimatoScuro from '../assets/brand/groomly-logo-animato-scuro.svg'
import { App } from '../app/App'
import * as firebaseClient from '../data/firebase/client'
import { AppError } from '../data/errors'
import { createAccount, getAccount, logout, type LocalAccount } from '../data/local/auth'
import { getSettings } from '../data/local/settings'
import { storageKeys } from '../data/local/storage'

type User = ReturnType<typeof userEvent.setup>

async function fillCreate(user: User, skip: string[] = []) {
  const fields: Array<[string, string]> = [
    ['Nome', 'Maria'],
    ['Cognome', 'Rossi'],
    ['Email', 'maria@salone.it'],
    ['Password', 'segretissimo'],
    ['Nome della toelettatura', 'Il Cane Felice'],
  ]
  for (const [label, value] of fields) {
    if (!skip.includes(label)) await user.type(screen.getByLabelText(label), value)
  }
}

async function createMaria(user: User) {
  await fillCreate(user)
  await user.click(screen.getByRole('button', { name: 'Crea account' }))
  await screen.findByRole('heading', { name: 'Groomly' })
}

describe('login', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('senza account la vista è Crea account con i campi e il logo animato fisso', () => {
    render(<App memory isDev={false} />)
    const heading = screen.getByRole('heading', { name: 'Crea account' })
    expect(heading).toBeInTheDocument()
    expect(heading.getAttribute('style')).toContain('font-size: 17px')
    for (const label of ['Nome', 'Cognome', 'Email', 'Password', 'Nome della toelettatura', 'Partita IVA', 'Indirizzo']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    expect(screen.getByText('Puoi completarli dopo')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Crea accesso' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hai già un account? Entra' })).toBeInTheDocument()
    expect(screen.queryByText('Password dimenticata')).not.toBeInTheDocument()
    const logo = screen.getByRole('img', { name: 'Groomly' })
    expect(logo).toHaveAttribute('src', logoAnimato)
    const style = logo.parentElement?.getAttribute('style') ?? ''
    expect(style).toContain('position: sticky')
    expect(style).toContain('top: 0')
    expect(style).toContain('background: var(--bg)')
    expect(style).not.toContain('width: 74px')
    expect(style).not.toContain('border-radius')
    expect(logo.compareDocumentPosition(heading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('crea l’account e al rimontaggio resta in Home', async () => {
    const user = userEvent.setup()
    const view = render(<App memory isDev={false} />)
    await createMaria(user)
    view.unmount()
    render(<App memory isDev={false} />)
    expect(screen.getByRole('heading', { name: 'Groomly' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Crea account' })).not.toBeInTheDocument()
  })

  it('salva nome, cognome e dati dell’attività, con codice fiscale vuoto', async () => {
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await fillCreate(user)
    await user.type(screen.getByLabelText('Partita IVA'), '12345678901')
    await user.type(screen.getByLabelText('Indirizzo'), 'Via Roma 1')
    await user.click(screen.getByRole('button', { name: 'Crea account' }))
    await screen.findByRole('heading', { name: 'Groomly' })
    const account = getAccount()!
    expect(account).toMatchObject({ firstName: 'Maria', lastName: 'Rossi', email: 'maria@salone.it', salonId: account.uid })
    expect(getSettings(account.uid).business).toMatchObject({
      name: 'Il Cane Felice',
      vatNumber: '12345678901',
      address: 'Via Roma 1',
      taxCode: '',
    })
  })

  it('manca il nome: mostra l’errore e non entra', async () => {
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await fillCreate(user, ['Nome'])
    await user.click(screen.getByRole('button', { name: 'Crea account' }))
    expect(await screen.findByText('Il nome è obbligatorio')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Crea account' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Groomly' })).not.toBeInTheDocument()
    expect(getAccount()).toBeNull()
    expect(localStorage.getItem(storageKeys.session)).toBeNull()
  })

  it('i due link in fondo passano da Crea account a Entra e ritorno', async () => {
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await user.click(screen.getByRole('button', { name: 'Hai già un account? Entra' }))
    expect(screen.getByRole('heading', { name: 'Entra' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Password dimenticata' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Nome')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Nome della toelettatura')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Groomly' })).toHaveAttribute('src', logoAnimato)
    await user.click(screen.getByRole('button', { name: 'Non hai un account? Crea account' }))
    expect(screen.getByRole('heading', { name: 'Crea account' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
  })

  it('con un account locale la vista è Entra con l’email compilata', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    logout()
    render(<App memory isDev={false} />)
    expect(screen.getByRole('heading', { name: 'Entra' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('maria@salone.it')
  })

  it('con solo un hint di accesso la vista è Entra con l’email dell’hint', () => {
    localStorage.setItem('groomly.lastSignIn', JSON.stringify({ uid: 'fb-1', email: 'laura@salone.it' }))
    render(<App memory isDev={false} />)
    expect(screen.getByRole('heading', { name: 'Entra' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('laura@salone.it')
  })

  it('rifiuta la password sbagliata e non apre le rotte senza sessione', async () => {
    const user = userEvent.setup()
    const view = render(<App memory isDev={false} />)
    await createMaria(user)
    view.unmount()
    localStorage.removeItem(storageKeys.session)
    render(<App memory isDev={false} initialPath="/animali" />)
    expect(screen.getByRole('button', { name: 'Entra' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Crea account' })).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Password'), 'sbagliata')
    await user.click(screen.getByRole('button', { name: 'Entra' }))
    expect(await screen.findByText('Email o password non corretti')).toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.session)).toBeNull()
  })

  it('mostra i dati illeggibili senza cancellarli', () => {
    localStorage.setItem(storageKeys.auth, '{')
    render(<App memory isDev={false} />)
    expect(screen.getByText('Dati locali illeggibili')).toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.auth)).toBe('{')
  })

  it('non registra /dev/kit quando non è sviluppo', async () => {
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/dev/kit" />)
    await createMaria(user)
    expect(screen.queryByRole('heading', { name: 'Kit' })).not.toBeInTheDocument()
  })

  it('i campi sono alti 44, il submit ha l’ombra e la password si mostra', async () => {
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    expect(screen.getByLabelText('Email').getAttribute('style')).toContain('height: 44px')
    const password = screen.getByLabelText('Password')
    expect(password.getAttribute('style')).toContain('height: 44px')
    expect(password).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Crea account' }).getAttribute('style')).toContain('box-shadow: var(--sh-btn)')
    await user.click(screen.getByRole('button', { name: 'Mostra password' }))
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Nascondi password' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Nascondi password' }))
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })

  it('mostra il logo animato scuro su Entra quando il tema salvato è scuro', async () => {
    const user = userEvent.setup()
    const view = render(<App memory isDev={false} />)
    await createMaria(user)
    view.unmount()
    logout()
    localStorage.setItem('groomly.theme', 'dark')
    render(<App memory isDev={false} />)
    const heading = screen.getByRole('heading', { name: 'Entra' })
    const logo = screen.getByRole('img', { name: 'Groomly' })
    expect(logo).toHaveAttribute('src', logoAnimatoScuro)
    expect(logo.parentElement?.getAttribute('style')).toContain('position: sticky')
    expect(logo.compareDocumentPosition(heading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('con Firebase, email già registrata: mostra l’avviso, offre Entra e non entra come quella persona', async () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-key')
    vi.spyOn(firebaseClient, 'watchAuth').mockImplementation(async (onAccount) => {
      onAccount(null)
      return () => undefined
    })
    const registerOwner = vi.spyOn(firebaseClient, 'registerOwner').mockRejectedValue(new AppError('Questa email ha già un account', 'auth_email_taken'))
    const signInEmail = vi.spyOn(firebaseClient, 'signInEmail').mockRejectedValue(new Error('non deve partire'))
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await fillCreate(user)
    await user.click(await screen.findByRole('button', { name: 'Crea account' }))
    expect(await screen.findByText('Questa email ha già un account')).toBeInTheDocument()
    expect(registerOwner).toHaveBeenCalledWith({
      firstName: 'Maria',
      lastName: 'Rossi',
      email: 'maria@salone.it',
      password: 'segretissimo',
      salonName: 'Il Cane Felice',
      vatNumber: '',
      address: '',
    })
    expect(signInEmail).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Crea account' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Entra con questa email' }))
    expect(screen.getByRole('heading', { name: 'Entra' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('maria@salone.it')
    expect(screen.queryByText('Questa email ha già un account')).not.toBeInTheDocument()
  })
})

const CONFIRM_TITLE = 'Conferma l’email'
const RESET_TEXT = 'Se questo indirizzo è un account Groomly, ti arriva un’email per scegliere una nuova password. Poi torna su Entra.'
const CONFIRM_TEXT = 'Ti abbiamo scritto a maria@salone.it. Apri il messaggio e tocca il link, poi torna qui.'

function cloudAccount(patch: Partial<LocalAccount> = {}): LocalAccount {
  return {
    uid: 'u1',
    email: 'maria@salone.it',
    passwordHash: '',
    salt: '',
    iterations: 0,
    createdAt: '2026-10-17T00:00:00.000Z',
    firstName: 'Maria',
    lastName: 'Rossi',
    salonId: 'u1',
    legacy: false,
    ...patch,
  }
}

function cloudOn(initial: LocalAccount | null = null) {
  vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-key')
  const handle = { onAccount: null as ((account: LocalAccount | null) => void) | null }
  vi.spyOn(firebaseClient, 'watchAuth').mockImplementation(async (onAccount) => {
    handle.onAccount = onAccount
    onAccount(initial)
    return () => undefined
  })
  vi.spyOn(firebaseClient, 'lastEmailVerified').mockReturnValue(false)
  vi.spyOn(firebaseClient, 'listenDogs').mockResolvedValue(() => undefined)
  vi.spyOn(firebaseClient, 'listenAppointments').mockResolvedValue(() => undefined)
  vi.spyOn(firebaseClient, 'listenServices').mockResolvedValue(() => undefined)
  vi.spyOn(firebaseClient, 'listenSettings').mockResolvedValue(() => undefined)
  vi.spyOn(firebaseClient, 'runCloudDailyBackup').mockResolvedValue(undefined)
  return handle
}

async function registerMaria(user: User) {
  await fillCreate(user)
  await user.click(await screen.findByRole('button', { name: 'Crea account' }))
}

// La vista di accesso si rimonta una volta mentre Firebase risponde: si scrive nei campi solo dopo.
async function repairFormReady() {
  await screen.findByLabelText('Nome della toelettatura')
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)) })
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('conferma email, recupero password e riprova', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('dopo la registrazione senza email confermata non c’è la home: c’è la conferma con i tre bottoni', async () => {
    cloudOn()
    vi.spyOn(firebaseClient, 'registerOwner').mockResolvedValue(cloudAccount())
    const reload = vi.spyOn(firebaseClient, 'reloadEmailVerified').mockResolvedValue(false)
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await registerMaria(user)
    expect(await screen.findByRole('heading', { name: CONFIRM_TITLE })).toBeInTheDocument()
    expect(screen.getByText(CONFIRM_TEXT)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Groomly' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Crea account' })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Groomly' })).toHaveAttribute('src', logoAnimato)
    for (const name of ['Ho confermato', 'Invia di nuovo', 'Esci']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
    await user.click(screen.getByRole('button', { name: 'Ho confermato' }))
    expect(await screen.findByText('Il link non risulta ancora aperto')).toBeInTheDocument()
    expect(reload).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('heading', { name: CONFIRM_TITLE })).toBeInTheDocument()
  })

  it('a pagina protetta con l’email da confermare si resta sulla conferma', async () => {
    cloudOn(cloudAccount())
    render(<App memory isDev={false} initialPath="/animali" />)
    expect(await screen.findByRole('heading', { name: CONFIRM_TITLE })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Animali' })).not.toBeInTheDocument()
  })

  it('con l’email già confermata la registrazione porta alla home', async () => {
    cloudOn()
    vi.spyOn(firebaseClient, 'registerOwner').mockResolvedValue(cloudAccount())
    vi.spyOn(firebaseClient, 'lastEmailVerified').mockReturnValue(true)
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await registerMaria(user)
    expect(await screen.findByRole('heading', { name: 'Groomly' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: CONFIRM_TITLE })).not.toBeInTheDocument()
  })

  it('Ho confermato con il link aperto porta alla home', async () => {
    cloudOn(cloudAccount())
    vi.spyOn(firebaseClient, 'reloadEmailVerified').mockResolvedValue(true)
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await user.click(await screen.findByRole('button', { name: 'Ho confermato' }))
    expect(await screen.findByRole('heading', { name: 'Groomly' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: CONFIRM_TITLE })).not.toBeInTheDocument()
  })

  it('tornando sull’app con il link aperto la conferma si chiude da sola', async () => {
    cloudOn(cloudAccount())
    const reload = vi.spyOn(firebaseClient, 'reloadEmailVerified').mockResolvedValueOnce(false).mockResolvedValue(true)
    render(<App memory isDev={false} />)
    await screen.findByRole('heading', { name: CONFIRM_TITLE })
    await act(async () => { setVisibility('hidden') })
    expect(reload).not.toHaveBeenCalled()
    await act(async () => { setVisibility('visible') })
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('heading', { name: CONFIRM_TITLE })).toBeInTheDocument()
    await act(async () => { setVisibility('visible') })
    expect(await screen.findByRole('heading', { name: 'Groomly' })).toBeInTheDocument()
  })

  it('Invia di nuovo rimanda l’email e mostra connessione assente o attesa', async () => {
    cloudOn(cloudAccount())
    const send = vi.spyOn(firebaseClient, 'sendVerification')
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new AppError('Connessione assente', 'auth_offline'))
      .mockRejectedValueOnce(new AppError('Aspetta un momento e riprova', 'auth_slow'))
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    const resend = await screen.findByRole('button', { name: 'Invia di nuovo' })
    await user.click(resend)
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Ti abbiamo scritto di nuovo.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await user.click(resend)
    expect(await screen.findByText('Connessione assente')).toBeInTheDocument()
    await user.click(resend)
    expect(await screen.findByText('Aspetta un momento e riprova')).toBeInTheDocument()
    expect(screen.queryByText('Connessione assente')).not.toBeInTheDocument()
  })

  it('Esci chiude la sessione e lascia la vista di accesso', async () => {
    cloudOn(cloudAccount())
    const out = vi.spyOn(firebaseClient, 'signOutEmail').mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await user.click(await screen.findByRole('button', { name: 'Esci' }))
    expect(out).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('heading', { name: /Crea account|Entra/ })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: CONFIRM_TITLE })).not.toBeInTheDocument()
  })

  it('Password dimenticata con email vuota o non valida non invia nulla', async () => {
    cloudOn()
    const reset = vi.spyOn(firebaseClient, 'sendPasswordReset').mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await user.click(await screen.findByRole('button', { name: 'Hai già un account? Entra' }))
    await user.click(screen.getByRole('button', { name: 'Password dimenticata' }))
    expect(await screen.findByText('Inserisci un’email valida')).toBeInTheDocument()
    await user.type(screen.getByLabelText(/^Email/), 'maria@')
    await user.click(screen.getByRole('button', { name: 'Password dimenticata' }))
    expect(await screen.findByText('Inserisci un’email valida')).toBeInTheDocument()
    expect(reset).not.toHaveBeenCalled()
  })

  it('Password dimenticata con email valida mostra il testo intero e Torna a Entra', async () => {
    cloudOn()
    const reset = vi.spyOn(firebaseClient, 'sendPasswordReset').mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await user.click(await screen.findByRole('button', { name: 'Hai già un account? Entra' }))
    await user.type(screen.getByLabelText('Email'), 'Maria@Salone.it')
    await user.click(screen.getByRole('button', { name: 'Password dimenticata' }))
    expect(await screen.findByText(RESET_TEXT)).toBeInTheDocument()
    expect(reset).toHaveBeenCalledWith('maria@salone.it')
    await user.click(screen.getByRole('button', { name: 'Torna a Entra' }))
    expect(screen.queryByText(RESET_TEXT)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Entra' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('Maria@Salone.it')
  })

  it('Password dimenticata mostra connessione assente o attesa quando l’invio fallisce', async () => {
    cloudOn()
    vi.spyOn(firebaseClient, 'sendPasswordReset')
      .mockRejectedValueOnce(new AppError('Connessione assente', 'auth_offline'))
      .mockRejectedValueOnce(new AppError('Aspetta un momento e riprova', 'auth_slow'))
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await user.click(await screen.findByRole('button', { name: 'Hai già un account? Entra' }))
    await user.type(screen.getByLabelText('Email'), 'maria@salone.it')
    await user.click(screen.getByRole('button', { name: 'Password dimenticata' }))
    expect(await screen.findByText('Connessione assente')).toBeInTheDocument()
    expect(screen.queryByText(RESET_TEXT)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Password dimenticata' }))
    expect(await screen.findByText('Aspetta un momento e riprova')).toBeInTheDocument()
  })

  it('con Firebase spento Password dimenticata dice Connessione assente e non invia', async () => {
    const reset = vi.spyOn(firebaseClient, 'sendPasswordReset').mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await user.click(screen.getByRole('button', { name: 'Hai già un account? Entra' }))
    await user.click(screen.getByRole('button', { name: 'Password dimenticata' }))
    expect(await screen.findByText('Connessione assente')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Email'), 'maria@salone.it')
    await user.click(screen.getByRole('button', { name: 'Password dimenticata' }))
    expect(await screen.findByText('Connessione assente')).toBeInTheDocument()
    expect(reset).not.toHaveBeenCalled()
  })

  it('se il salone non si salva c’è la vista Riprova senza titolo, e Riprova usa i dati appena scritti', async () => {
    const cloud = cloudOn()
    vi.spyOn(firebaseClient, 'registerOwner').mockRejectedValue(new AppError('Salvataggio non riuscito', 'storage_write'))
    const repair = vi.spyOn(firebaseClient, 'repairOwnerSalon')
      .mockRejectedValueOnce(new AppError('Connessione assente', 'auth_offline'))
      .mockResolvedValueOnce(undefined)
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await registerMaria(user)
    await act(async () => { cloud.onAccount?.(cloudAccount({ salonId: '' })) })
    expect(await screen.findByText('Salvataggio non riuscito')).toBeInTheDocument()
    expect(screen.getByText('Il salone non è stato salvato. Riprova lo riscrive.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Riprova' })).toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Groomly' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Riprova' }))
    expect(await screen.findByText('Connessione assente')).toBeInTheDocument()
    expect(screen.getByText('Il salone non è stato salvato. Riprova lo riscrive.')).toBeInTheDocument()
    const input = { firstName: 'Maria', lastName: 'Rossi', salonName: 'Il Cane Felice', vatNumber: '', address: '' }
    expect(repair).toHaveBeenCalledWith(input)
    await user.click(screen.getByRole('button', { name: 'Riprova' }))
    expect(await screen.findByRole('heading', { name: CONFIRM_TITLE })).toBeInTheDocument()
    expect(repair).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('Salvataggio non riuscito')).not.toBeInTheDocument()
  })

  it('senza i dati della registrazione la vista Riprova chiede Nome, Cognome e Nome della toelettatura e non scrive finché mancano', async () => {
    cloudOn(cloudAccount({ salonId: '' }))
    const repair = vi.spyOn(firebaseClient, 'repairOwnerSalon').mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await repairFormReady()
    for (const label of ['Nome', 'Cognome', 'Nome della toelettatura']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
    for (const label of ['Email', 'Password', 'Partita IVA', 'Indirizzo']) {
      expect(screen.queryByLabelText(label)).not.toBeInTheDocument()
    }
    expect(screen.getByText('Salvataggio non riuscito')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Esci' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Riprova' }))
    expect(repair).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Riprova' })).toBeInTheDocument()
  })

  it('senza profilo, inviare il modulo chiama repairOwnerSalon con IVA e indirizzo vuoti', async () => {
    cloudOn(cloudAccount({ salonId: '' }))
    const repair = vi.spyOn(firebaseClient, 'repairOwnerSalon').mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await repairFormReady()
    await user.type(screen.getByLabelText('Nome'), 'Maria')
    await user.type(screen.getByLabelText('Cognome'), 'Rossi')
    await user.type(screen.getByLabelText('Nome della toelettatura'), 'Il Cane Felice')
    await user.click(screen.getByRole('button', { name: 'Riprova' }))
    expect(await screen.findByRole('heading', { name: CONFIRM_TITLE })).toBeInTheDocument()
    expect(repair).toHaveBeenCalledOnce()
    expect(repair).toHaveBeenCalledWith({ firstName: 'Maria', lastName: 'Rossi', salonName: 'Il Cane Felice', vatNumber: '', address: '' })
  })

  it('con il profilo rimasto sul telefono Riprova non chiede il modulo', async () => {
    cloudOn(cloudAccount({ salonId: '' }))
    localStorage.setItem('groomly.pendingSalon.maria@salone.it', JSON.stringify({
      firstName: 'Maria', lastName: 'Rossi', salonName: 'Il Cane Felice', vatNumber: '', address: '',
    }))
    const repair = vi.spyOn(firebaseClient, 'repairOwnerSalon').mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await user.click(await screen.findByRole('button', { name: 'Riprova' }))
    expect(screen.queryByLabelText('Nome della toelettatura')).not.toBeInTheDocument()
    expect(repair).toHaveBeenCalledWith({ firstName: 'Maria', lastName: 'Rossi', salonName: 'Il Cane Felice', vatNumber: '', address: '' })
  })

  it('se Riprova senza profilo non riesce, il modulo resta e si può uscire', async () => {
    cloudOn(cloudAccount({ salonId: '' }))
    vi.spyOn(firebaseClient, 'repairOwnerSalon').mockRejectedValue(new AppError('Connessione assente', 'auth_offline'))
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await repairFormReady()
    await user.type(screen.getByLabelText('Nome'), 'Maria')
    await user.type(screen.getByLabelText('Cognome'), 'Rossi')
    await user.type(screen.getByLabelText('Nome della toelettatura'), 'Il Cane Felice')
    await user.click(screen.getByRole('button', { name: 'Riprova' }))
    expect(await screen.findByText('Connessione assente')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome della toelettatura')).toHaveValue('Il Cane Felice')
    expect(screen.getByRole('button', { name: 'Esci' })).toBeInTheDocument()
  })

  it('dopo storage_write e poi email già usata, Riprova scrive il salone con i dati salvati e non tocca salon/shared', async () => {
    const cloud = cloudOn()
    vi.spyOn(firebaseClient, 'registerOwner')
      .mockRejectedValueOnce(new AppError('Salvataggio non riuscito', 'storage_write'))
      .mockRejectedValueOnce(new AppError('Questa email ha già un account', 'auth_email_taken'))
    const repair = vi.spyOn(firebaseClient, 'repairOwnerSalon').mockResolvedValue(undefined)
    const saveSettings = vi.spyOn(firebaseClient, 'saveSettings').mockResolvedValue(undefined)
    const replace = vi.spyOn(firebaseClient, 'replaceCloudData').mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await registerMaria(user)
    expect(await screen.findByText('Salvataggio non riuscito')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Crea account' }))
    expect(await screen.findByText('Questa email ha già un account')).toBeInTheDocument()
    const stored = Object.keys(localStorage).filter((key) => key.startsWith('groomly.pendingSalon.'))
    expect(stored).toHaveLength(1)
    expect(localStorage.getItem(stored[0]!)).toContain('Il Cane Felice')
    for (const key of Object.keys(localStorage)) expect(localStorage.getItem(key)).not.toContain('segretissimo')
    await act(async () => { cloud.onAccount?.(cloudAccount({ salonId: '' })) })
    await user.click(await screen.findByRole('button', { name: 'Riprova' }))
    expect(await screen.findByRole('heading', { name: CONFIRM_TITLE })).toBeInTheDocument()
    expect(repair).toHaveBeenCalledWith({ firstName: 'Maria', lastName: 'Rossi', salonName: 'Il Cane Felice', vatNumber: '', address: '' })
    expect(Object.keys(localStorage).some((key) => key.startsWith('groomly.pendingSalon.'))).toBe(false)
    expect(saveSettings).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })

  it('dopo un riavvio Riprova usa il profilo rimasto sul telefono', async () => {
    const cloud = cloudOn()
    vi.spyOn(firebaseClient, 'registerOwner').mockRejectedValue(new AppError('Salvataggio non riuscito', 'storage_write'))
    const repair = vi.spyOn(firebaseClient, 'repairOwnerSalon').mockResolvedValue(undefined)
    const user = userEvent.setup()
    const first = render(<App memory isDev={false} />)
    await registerMaria(user)
    await screen.findByText('Salvataggio non riuscito')
    first.unmount()
    render(<App memory isDev={false} />)
    await waitFor(() => expect(cloud.onAccount).not.toBeNull())
    await act(async () => { cloud.onAccount?.(cloudAccount({ salonId: '' })) })
    await user.click(await screen.findByRole('button', { name: 'Riprova' }))
    expect(await screen.findByRole('heading', { name: CONFIRM_TITLE })).toBeInTheDocument()
    expect(repair).toHaveBeenCalledWith(expect.objectContaining({ salonName: 'Il Cane Felice' }))
  })

  it('Crea account resta spento mentre la registrazione è in corso e si riaccende dopo l’errore', async () => {
    cloudOn()
    let fail: (error: Error) => void = () => undefined
    vi.spyOn(firebaseClient, 'registerOwner').mockImplementation(() => new Promise<LocalAccount>((_resolve, reject) => { fail = reject }))
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await registerMaria(user)
    const creating = await screen.findByRole('button', { name: 'Creazione…' })
    expect(creating).toBeDisabled()
    expect(creating).toHaveAttribute('aria-busy', 'true')
    await act(async () => { fail(new AppError('Questa email ha già un account', 'auth_email_taken')) })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Crea account' })).toBeEnabled())
  })

  it('sulla vista Riprova il salone non è agganciato: nessun ascolto delle impostazioni e nessun secondo avviso', async () => {
    cloudOn(cloudAccount({ salonId: '' }))
    const listen = vi.spyOn(firebaseClient, 'listenSettings').mockRejectedValue(new Error('salone non agganciato'))
    render(<App memory isDev={false} />)
    await screen.findByRole('button', { name: 'Riprova' })
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)) })
    expect(listen).not.toHaveBeenCalled()
    expect(screen.getAllByText('Salvataggio non riuscito')).toHaveLength(1)
  })

  it('Laura senza documento account e un account aperto non finiscono nelle viste di riparo', async () => {
    cloudOn(cloudAccount({ email: 'laura.masala@tiscali.it', salonId: '', legacy: false }))
    render(<App memory isDev={false} />)
    expect(await screen.findByRole('heading', { name: 'Groomly' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Riprova' })).not.toBeInTheDocument()
  })
})
