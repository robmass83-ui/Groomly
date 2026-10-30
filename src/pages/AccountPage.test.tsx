// @vitest-environment happy-dom
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { getSettings } from '../data/local/settings'

const suggerisci = vi.fn()
const dettaglio = vi.fn()
vi.mock('../data/firebase/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../data/firebase/client')>()),
  callSuggerisciIndirizzi: (...a: unknown[]) => suggerisci(...a),
  callDettaglioIndirizzo: (...a: unknown[]) => dettaglio(...a),
}))
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
  localStorage.clear()
  vi.useFakeTimers({ shouldAdvanceTime: true })
  suggerisci.mockReset()
  dettaglio.mockReset()
  suggerisci.mockResolvedValue([{ placeId: 'abc', principale: 'Via Renoir 8', secondario: 'Quartu Sant’Elena CA, Italia' }])
  dettaglio.mockResolvedValue({ indirizzo: 'Via Renoir, 8, 09045 Quartu Sant’Elena CA, Italia', placeId: 'abc' })
})
afterEach(() => vi.useRealTimers())

async function apriToelettatura(user: ReturnType<typeof userEvent.setup>) {
  render(<App memory isDev={false} initialPath="/impostazioni/account?scheda=personali" />)
  await user.click(await screen.findByRole('button', { name: 'Modifica dati toelettatura, Ragione sociale' }))
  return screen.findByRole('dialog', { name: 'Toelettatura' })
}

describe('scheda Toelettatura, indirizzo', () => {
  it('salva indirizzo e placeId di un suggerimento, poi li toglie se riscrivo a mano', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup({ delay: null })
    let dialog = await apriToelettatura(user)
    await user.type(within(dialog).getByRole('combobox'), 'via Renoir 8')
    await act(async () => { await vi.advanceTimersByTimeAsync(300) })
    await user.click(await screen.findByRole('option', { name: /Via Renoir 8/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    expect(getSettings(account.uid).business.address).toBe('Via Renoir, 8, 09045 Quartu Sant’Elena CA, Italia')
    expect(getSettings(account.uid).business.placeId).toBe('abc')

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Toelettatura' })).not.toBeInTheDocument())
    await user.click(await screen.findByRole('button', { name: 'Modifica dati toelettatura, Indirizzo' }))
    dialog = await screen.findByRole('dialog', { name: 'Toelettatura' })
    const campo = within(dialog).getByRole('combobox')
    await user.clear(campo)
    await user.type(campo, 'Via Roma 1')
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    expect(getSettings(account.uid).business.address).toBe('Via Roma 1')
    expect(getSettings(account.uid).business).not.toHaveProperty('placeId')
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
