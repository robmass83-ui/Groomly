// @vitest-environment happy-dom
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import * as firebaseClient from '../data/firebase/client'
import { createAccount, getAccount } from '../data/local/auth'
import { getSettings } from '../data/local/settings'
import { storageKeys } from '../data/local/storage'

const ruoloForzato = vi.hoisted(() => ({ valore: null as string | null }))
vi.mock('../hooks/useSession', async () => {
  const actual = await vi.importActual<typeof import('../hooks/useSession')>('../hooks/useSession')
  return {
    ...actual,
    useSession: () => {
      const s = actual.useSession()
      if (!ruoloForzato.valore || s.gate.kind !== 'in') return s
      return { ...s, gate: { ...s.gate, account: { ...s.gate.account, role: ruoloForzato.valore } } }
    },
  }
})

const suggerisci = vi.fn()
const dettaglio = vi.fn()
const cambiaPwd = vi.hoisted(() => ({ errore: null as unknown }))
const cambiaEmailSpia = vi.hoisted(() => vi.fn())
const inviaVerificaSpia = vi.hoisted(() => vi.fn())
vi.mock('../data/firebase/client', async (importOriginal) => {
  const originale = await importOriginal<typeof import('../data/firebase/client')>()
  return {
  ...originale,
  cambiaPassword: (...a: Parameters<typeof originale.cambiaPassword>) => {
    if (cambiaPwd.errore) return Promise.reject(cambiaPwd.errore)
    return originale.cambiaPassword(...a)
  },
  cambiaEmailAccesso: (...a: unknown[]) => { cambiaEmailSpia(...a); return Promise.resolve() },
  sendVerification: () => inviaVerificaSpia(),
  callSuggerisciIndirizzi: (...a: unknown[]) => suggerisci(...a),
  callDettaglioIndirizzo: (...a: unknown[]) => dettaglio(...a),
  }
})
const driveLeggi = vi.hoisted(() => vi.fn(async (): Promise<{ collegato: boolean; email: string | null }> => ({ collegato: false, email: null })))
vi.mock('../lib/driveAuth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/driveAuth')>()),
  DriveAuth: { leggi: driveLeggi },
}))
vi.mock('../lib/dogPhoto', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/dogPhoto')>()),
  prepareLogo: async () => 'data:image/png;base64,bG9nbw==',
}))

beforeEach(() => {
  cambiaPwd.errore = null
  ruoloForzato.valore = null
  localStorage.clear()
  vi.useFakeTimers({ shouldAdvanceTime: true })
  suggerisci.mockReset()
  dettaglio.mockReset()
  cambiaEmailSpia.mockReset()
  inviaVerificaSpia.mockReset()
  suggerisci.mockResolvedValue([{ placeId: 'abc', principale: 'Via Renoir 8', secondario: 'Quartu Sant’Elena CA, Italia' }])
  dettaglio.mockResolvedValue({ indirizzo: 'Via Renoir, 8, 09045 Quartu Sant’Elena CA, Italia', placeId: 'abc' })
})
afterEach(() => vi.useRealTimers())

// I due nomi sono obbligatori: salvo i test che li lasciano vuoti, si compilano se mancano.
async function apriToelettatura(user: ReturnType<typeof userEvent.setup>, compila = true) {
  render(<App memory isDev={false} initialPath="/impostazioni/account?scheda=personali" />)
  await user.click(await screen.findByRole('button', { name: 'Modifica dati toelettatura, Ragione sociale' }))
  const dialog = await screen.findByRole('dialog', { name: 'Toelettatura' })
  if (compila) {
    for (const [nome, valore] of [['Ragione sociale', 'Pelo Bello Srl'], ['Nome toelettatura', 'Pelo Bello']] as const) {
      const campo = within(dialog).getByRole('textbox', { name: nome })
      if ((campo as HTMLInputElement).value === '') await user.type(campo, valore)
    }
  }
  return dialog
}

describe('scheda Toelettatura, indirizzo', () => {
  it('salva indirizzo e placeId di un suggerimento, poi li toglie se riscrivo a mano', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup({ delay: null })
    let dialog = await apriToelettatura(user)
    await user.type(within(dialog).getByRole('combobox', { name: 'Indirizzo' }), 'via Renoir 8')
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    await user.click(await screen.findByRole('option', { name: /Via Renoir 8/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    expect(getSettings(account.uid).business.address).toBe('Via Renoir, 8, 09045 Quartu Sant’Elena CA, Italia')
    expect(getSettings(account.uid).business.placeId).toBe('abc')

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Toelettatura' })).not.toBeInTheDocument())
    await user.click(await screen.findByRole('button', { name: 'Modifica dati toelettatura, Indirizzo' }))
    dialog = await screen.findByRole('dialog', { name: 'Toelettatura' })
    const campo = within(dialog).getByRole('combobox', { name: 'Indirizzo' })
    await user.clear(campo)
    await user.type(campo, 'Via Roma 1')
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    expect(getSettings(account.uid).business.address).toBe('Via Roma 1')
    expect(getSettings(account.uid).business).not.toHaveProperty('placeId')
  })
})

describe('scheda Toelettatura, paese e partita IVA', () => {
  async function conSalone(business: Record<string, unknown>) {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const base = getSettings(account.uid)
    localStorage.setItem(storageKeys.settings(account.uid), JSON.stringify({ ...base, business: { ...base.business, name: 'Il Cane Felice', ...business } }))
    return account.uid
  }

  it('scegliendo Francia cambia l’etichetta, sparisce il codice fiscale e la P.IVA salvata mostra l’errore senza sparire', async () => {
    const uid = await conSalone({ vatNumber: 'IT12345678901' })
    const user = userEvent.setup({ delay: null })
    const dialog = await apriToelettatura(user)
    expect(within(dialog).getByRole('textbox', { name: 'Partita IVA' })).toHaveValue('IT12345678901')
    expect(within(dialog).getByRole('textbox', { name: 'Codice fiscale' })).toBeInTheDocument()
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Paese' }), 'FR')
    const campo = within(dialog).getByRole('textbox', { name: /^Numero IVA \(Numéro de TVA\)/ })
    expect(campo).toHaveValue('IT12345678901')
    expect(within(dialog).getByText('Formato non valido. Esempio: FR12345678901')).toBeInTheDocument()
    expect(within(dialog).queryByRole('textbox', { name: 'Codice fiscale' })).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    expect(screen.getByRole('dialog', { name: 'Toelettatura' })).toBeInTheDocument()
    expect(getSettings(uid).business.paese).toBe('IT')
    await user.clear(campo)
    await user.type(campo, 'FR12345678901')
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    expect(getSettings(uid).business).toMatchObject({ paese: 'FR', paeseScelto: true, vatNumber: 'FR12345678901' })
  })

  async function scegliIndirizzoFrancese(user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) {
    dettaglio.mockResolvedValue({ indirizzo: '1 Rue de Rivoli, 75001 Paris, France', placeId: 'fr1', paese: 'FR' })
    await user.type(within(dialog).getByRole('combobox', { name: 'Indirizzo' }), 'rue de rivoli 1')
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    await user.click(await screen.findByRole('option', { name: /Via Renoir 8/ }))
  }

  it('un indirizzo francese propone Francia se il paese non è stato scelto a mano', async () => {
    const uid = await conSalone({ paese: 'IT' })
    const user = userEvent.setup({ delay: null })
    const dialog = await apriToelettatura(user)
    await scegliIndirizzoFrancese(user, dialog)
    expect(within(dialog).getByRole('combobox', { name: 'Paese' })).toHaveValue('FR')
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    expect(getSettings(uid).business.paese).toBe('FR')
    expect(getSettings(uid).business).not.toHaveProperty('paeseScelto')
  })

  it('un paese scelto a mano non cambia con un indirizzo di un altro paese', async () => {
    const uid = await conSalone({ paese: 'IT', paeseScelto: true })
    const user = userEvent.setup({ delay: null })
    const dialog = await apriToelettatura(user)
    await scegliIndirizzoFrancese(user, dialog)
    expect(within(dialog).getByRole('combobox', { name: 'Paese' })).toHaveValue('IT')
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    expect(getSettings(uid).business).toMatchObject({ paese: 'IT', paeseScelto: true })
  })

  it('una P.IVA salvata che il paese non accetta si mostra ma non blocca se non la tocchi', async () => {
    const uid = await conSalone({ paese: 'FR', vatNumber: 'IT12345678901' })
    const user = userEvent.setup({ delay: null })
    const dialog = await apriToelettatura(user)
    expect(within(dialog).getByText('Formato non valido. Esempio: FR12345678901')).toBeInTheDocument()
    await user.type(within(dialog).getByRole('textbox', { name: 'Ragione sociale' }), ' srl')
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Toelettatura' })).not.toBeInTheDocument())
    expect(getSettings(uid).business).toMatchObject({ vatNumber: 'IT12345678901', paese: 'FR', name: 'Il Cane Felice srl' })
    expect(getSettings(uid).business).not.toHaveProperty('paeseScelto')
  })
})

describe('Info personali, logo', () => {
  it('la matita del logo cambia il logo restando in Info personali', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup({ delay: null })
    render(<App memory isDev={false} initialPath="/impostazioni/account?scheda=personali" />)
    expect(await screen.findByRole('button', { name: 'Cambia logo' })).toBeInTheDocument()
    await user.upload(screen.getByTestId('account-logo'), new File(['x'], 'logo.png', { type: 'image/png' }))
    await waitFor(() => expect(getSettings(account.uid).priceSheet?.intestazione.logo).toBe('data:image/png;base64,bG9nbw=='))
    expect(screen.getByRole('heading', { name: 'Info personali' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Gestione listino' })).not.toBeInTheDocument()
  })
})

describe('home dell’account', () => {
  it('niente schede in alto: le sezioni si aprono come pagine e la freccia riporta alla home', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup({ delay: null })
    render(<App memory isDev={false} initialPath="/impostazioni/account" />)
    expect(await screen.findByRole('heading', { name: 'Gestisci account Groomly' })).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByText('Suggerimenti')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Legale' })).toHaveAttribute('href', '/impostazioni/legale')
    expect(screen.getByRole('link', { name: 'Info su Groomly' })).toHaveAttribute('href', '/impostazioni/info')
    for (const sezione of ['Info personali', 'Sicurezza', 'Privacy e dati']) {
      await user.click(screen.getByRole('button', { name: sezione }))
      expect(await screen.findByRole('heading', { name: sezione })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'Gestisci account Groomly' })).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Indietro' }))
      expect(await screen.findByRole('heading', { name: 'Gestisci account Groomly' })).toBeInTheDocument()
    }
  })
})

describe('scheda Sicurezza, account collegati', () => {
  it('mostra l’account Google Drive dei backup senza pulsanti', async () => {
    driveLeggi.mockResolvedValueOnce({ collegato: true, email: 'salone@gmail.com' })
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/impostazioni/account?scheda=sicurezza" />)
    expect(await screen.findByText('salone@gmail.com')).toBeInTheDocument()
    expect(screen.getByText('Google Drive per i backup')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Collega' })).not.toBeInTheDocument()
  })

  it('senza Drive dice Non collegato', async () => {

    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/impostazioni/account?scheda=sicurezza" />)
    expect(await screen.findByText('Non collegato')).toBeInTheDocument()
  })
})

describe('collaboratore in Account', () => {
  it('la riga Titolare è in sola lettura', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    ruoloForzato.valore = 'collaboratore'
    render(<App memory isDev={false} initialPath="/impostazioni/account?scheda=personali" />)
    expect(await screen.findByText('Nome del titolare')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Nome del titolare/ })).not.toBeInTheDocument()
  })

  it('il titolare apre ancora la riga Titolare', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/impostazioni/account?scheda=personali" />)
    expect(await screen.findByRole('button', { name: /Nome del titolare/ })).toBeInTheDocument()
  })

  it('Privacy non mostra «Scarica i miei dati»', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    ruoloForzato.valore = 'collaboratore'
    render(<App memory isDev={false} initialPath="/impostazioni/account?scheda=privacy" />)
    expect(await screen.findByText('Elimina account')).toBeInTheDocument()
    expect(screen.queryByText(/Scarica i miei dati/)).not.toBeInTheDocument()
  })

  it('il titolare vede «Scarica i miei dati»', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/impostazioni/account?scheda=privacy" />)
    expect(await screen.findByText(/Scarica i miei dati/)).toBeInTheDocument()
  })
})

describe('errori e campi obbligatori', () => {
  it('cambio password con la password attuale sbagliata dice «Password sbagliata», non il testo di Firebase', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    cambiaPwd.errore = Object.assign(new Error('Firebase: Error (auth/wrong-password).'), { code: 'auth/wrong-password' })
    const user = userEvent.setup({ delay: null })
    render(<App memory isDev={false} initialPath="/impostazioni/account?scheda=sicurezza" />)
    await user.click(await screen.findByRole('button', { name: /Password/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Password' })
    await user.type(within(dialog).getByLabelText('Password attuale'), 'sbagliata1')
    await user.type(within(dialog).getByLabelText('Password nuova'), 'nuovissima1')
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Password sbagliata')).toBeInTheDocument()
    expect(screen.queryByText(/Firebase/)).not.toBeInTheDocument()
  })

  it('senza nome della toelettatura il salvataggio è bloccato e il campo dice «Campo obbligatorio»', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup({ delay: null })
    const dialog = await apriToelettatura(user)
    await user.clear(within(dialog).getByRole('textbox', { name: 'Nome toelettatura' }))
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    expect(await within(dialog).findByText('Campo obbligatorio')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Toelettatura' })).toBeInTheDocument()
    expect(getSettings(account.uid).business.salonName).toBe('')
  })

  it('senza ragione sociale lo stesso', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup({ delay: null })
    const dialog = await apriToelettatura(user)
    await user.clear(within(dialog).getByRole('textbox', { name: 'Ragione sociale' }))
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    expect(await within(dialog).findByText('Campo obbligatorio')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Toelettatura' })).toBeInTheDocument()
  })
})

describe('titolare, email e telefono controllati', () => {
  it('un titolare di 81 caratteri non si salva e dice «Massimo 80 caratteri»', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const titolareIniziale = getSettings(account.uid).business.titolare
    const user = userEvent.setup({ delay: null })
    render(<App memory isDev={false} initialPath="/impostazioni/account?scheda=personali" />)
    await user.click(await screen.findByRole('button', { name: /Nome del titolare/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Nome del titolare' })
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Nome del titolare' }), { target: { value: 'a'.repeat(81) } })
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    expect(await within(dialog).findByText('Massimo 80 caratteri')).toBeInTheDocument()
    expect(getSettings(account.uid).business.titolare).toBe(titolareIniziale)
  })

  it('un titolare di 80 caratteri si salva', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup({ delay: null })
    render(<App memory isDev={false} initialPath="/impostazioni/account?scheda=personali" />)
    await user.click(await screen.findByRole('button', { name: /Nome del titolare/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Nome del titolare' })
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Nome del titolare' }), { target: { value: 'a'.repeat(80) } })
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    await waitFor(() => expect(getSettings(account.uid).business.titolare).toBe('a'.repeat(80)))
  })

  it('una email senza dominio completo dà «Inserisci un’email valida» e non chiama il server', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup({ delay: null })
    render(<App memory isDev={false} initialPath="/impostazioni/account?scheda=sicurezza" />)
    await user.click(await screen.findByRole('button', { name: /Cambia email/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Cambia email' })
    await user.type(within(dialog).getByLabelText('Nuova email'), 'a@b')
    await user.type(within(dialog).getByLabelText('Password attuale'), 'segretissimo')
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    expect(await screen.findByText('Inserisci un’email valida')).toBeInTheDocument()
    expect(cambiaEmailSpia).not.toHaveBeenCalled()
  })

  it('un telefono della toelettatura «abc» non si salva e il campo dice «Telefono non valido»', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup({ delay: null })
    const dialog = await apriToelettatura(user)
    await user.type(within(dialog).getByRole('textbox', { name: 'Telefono' }), 'abc')
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    expect(await within(dialog).findByText('Telefono non valido')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Toelettatura' })).toBeInTheDocument()
    expect(getSettings(account.uid).business.salonName).toBe('')
  })

  it('un telefono della toelettatura vuoto si salva', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup({ delay: null })
    const dialog = await apriToelettatura(user)
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    await waitFor(() => expect(getSettings(account.uid).business.salonName).toBe('Pelo Bello'))
  })
})

describe('scheda Sicurezza, verifica email', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it.each([
    [true, 'La tua email è già verificata'],
    [false, 'Email inviata'],
  ])('con alreadyVerified %s il toast dice «%s»', async (giaVerificata, testo) => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-key')
    const account = { uid: 'u1', email: 'maria@salone.it', passwordHash: '', salt: '', iterations: 0, createdAt: '2026-10-17T00:00:00.000Z', firstName: 'Maria', lastName: 'Rossi', salonId: 'u1', legacy: false }
    vi.spyOn(firebaseClient, 'watchAuth').mockImplementation(async (onAccount) => { onAccount(account); return () => undefined })
    vi.spyOn(firebaseClient, 'lastEmailVerified').mockReturnValue(true)
    vi.spyOn(firebaseClient, 'listenDogs').mockResolvedValue(() => undefined)
    vi.spyOn(firebaseClient, 'listenAppointments').mockResolvedValue(() => undefined)
    vi.spyOn(firebaseClient, 'listenServices').mockResolvedValue(() => undefined)
    vi.spyOn(firebaseClient, 'listenSettings').mockResolvedValue(() => undefined)
    vi.spyOn(firebaseClient, 'runCloudDailyBackup').mockResolvedValue(undefined)
    inviaVerificaSpia.mockResolvedValue({ alreadyVerified: giaVerificata })
    const user = userEvent.setup({ delay: null })
    render(<App memory isDev={false} initialPath="/impostazioni/account?scheda=sicurezza" />)
    await user.click(await screen.findByRole('button', { name: /Verifica email/ }))
    expect(await screen.findByText(testo)).toBeInTheDocument()
  })
})

describe('il tuo nome', () => {
  it('mostra nome e cognome dell’account e li cambia', async () => {
    await createAccount('maria@salone.it', 'segretissimo', { firstName: 'Maria', lastName: 'Rossi' })
    const user = userEvent.setup({ delay: null })
    render(<App memory isDev={false} initialPath="/impostazioni/account?scheda=personali" />)
    await user.click(await screen.findByRole('button', { name: /Il tuo nome.*Maria Rossi/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Il tuo nome' })
    await user.clear(within(dialog).getByLabelText('Nome'))
    await user.type(within(dialog).getByLabelText('Nome'), 'Ada')
    await user.clear(within(dialog).getByLabelText('Cognome'))
    await user.type(within(dialog).getByLabelText('Cognome'), 'Neri')
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    expect(await screen.findByRole('button', { name: /Il tuo nome.*Ada Neri/ })).toBeInTheDocument()
    expect(getAccount()?.firstName).toBe('Ada')
    expect(getAccount()?.lastName).toBe('Neri')
  })

  it('un nome di soli spazi dà «Campo obbligatorio» e non salva', async () => {
    await createAccount('maria@salone.it', 'segretissimo', { firstName: 'Maria', lastName: 'Rossi' })
    const user = userEvent.setup({ delay: null })
    render(<App memory isDev={false} initialPath="/impostazioni/account?scheda=personali" />)
    await user.click(await screen.findByRole('button', { name: /Il tuo nome/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Il tuo nome' })
    fireEvent.change(within(dialog).getByLabelText('Nome'), { target: { value: '   ' } })
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    expect(await within(dialog).findByText('Campo obbligatorio')).toBeInTheDocument()
    expect(getAccount()?.firstName).toBe('Maria')
  })
})
