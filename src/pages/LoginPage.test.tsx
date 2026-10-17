// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import logoAnimato from '../assets/brand/groomly-logo-animato.svg'
import logoAnimatoScuro from '../assets/brand/groomly-logo-animato-scuro.svg'
import { App } from '../app/App'
import * as firebaseClient from '../data/firebase/client'
import { AppError } from '../data/errors'
import { createAccount, getAccount, logout } from '../data/local/auth'
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
