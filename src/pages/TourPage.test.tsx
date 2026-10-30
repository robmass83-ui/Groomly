// @vitest-environment happy-dom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { getSettings } from '../data/local/settings'
import { listServices } from '../data/local/services'
import { storageKeys, writeJson } from '../data/local/storage'
import { DURATA_FESTA } from '../components/tour/TourScena'

const { driveLeggi, driveCollega } = vi.hoisted(() => ({
  driveLeggi: vi.fn(async () => ({ collegato: false, email: null })),
  driveCollega: vi.fn(),
}))

vi.mock('../lib/driveAuth', () => ({
  DriveAuth: { leggi: driveLeggi, collega: driveCollega, conferma: vi.fn(), scollega: vi.fn(), programma: vi.fn(async () => undefined) },
}))

// Online le impostazioni arrivano dal cloud: qui si può simulare che non siano ancora pronte.
const caricamento = vi.hoisted(() => ({ nonPronto: false }))
vi.mock('../hooks/useSettings', async () => {
  const actual = await vi.importActual<typeof import('../hooks/useSettings')>('../hooks/useSettings')
  return {
    ...actual,
    useSettings: () => {
      const api = actual.useSettings()
      return caricamento.nonPronto ? { ...api, ready: false } : api
    },
  }
})

vi.mock('../data/firebase/client', async () => {
  const actual = await vi.importActual<typeof import('../data/firebase/client')>('../data/firebase/client')
  return { ...actual, callSuggerisciIndirizzi: vi.fn(async () => []), callDettaglioIndirizzo: vi.fn(async () => null) }
})

async function nuovoSalone(nome = 'Il Cane Felice') {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  const base = getSettings(account.uid)
  writeJson(storageKeys.settings(account.uid), { ...base, business: { ...base.business, salonName: nome, name: nome } })
  return account.uid
}

function apri() {
  render(<App memory isDev={false} initialPath="/benvenuto" />)
}

const tour = (uid: string) => getSettings(uid).tourBenvenuto

describe('tour Prepariamo il salone', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    caricamento.nonPronto = false
    driveLeggi.mockResolvedValue({ collegato: false, email: null })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('il benvenuto saluta il salone e "Lo facciamo dopo" lo segna visto', async () => {
    const uid = await nuovoSalone()
    const user = userEvent.setup()
    apri()
    expect(await screen.findByRole('heading', { name: 'Ciao Il Cane Felice! Prepariamo il salone insieme ✨' })).toBeInTheDocument()
    await waitFor(() => expect(tour(uid)).toEqual({ stato: 'in-corso', saltati: [] }))
    await user.click(screen.getByRole('button', { name: 'Lo facciamo dopo' }))
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(tour(uid)).toEqual({ stato: 'visto', saltati: [] })
  })

  it('finché le impostazioni non sono pronte "Lo facciamo dopo" non salva niente', async () => {
    const uid = await nuovoSalone()
    caricamento.nonPronto = true
    const prima = localStorage.getItem(storageKeys.settings(uid))
    const user = userEvent.setup()
    apri()
    await screen.findByRole('heading', { name: 'Ciao Il Cane Felice! Prepariamo il salone insieme ✨' })
    const dopo = screen.getByRole('button', { name: 'Lo facciamo dopo' })
    expect(dopo).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Iniziamo' })).toBeDisabled()
    await user.click(dopo)
    fireEvent.click(dopo)
    expect(localStorage.getItem(storageKeys.settings(uid))).toBe(prima)
    expect(tour(uid)).toBeUndefined()
    expect(screen.getByRole('heading', { name: 'Ciao Il Cane Felice! Prepariamo il salone insieme ✨' })).toBeInTheDocument()
  })

  it('Salta premuto durante la festa non salta un passo in più', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    await nuovoSalone()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    apri()
    await user.click(await screen.findByRole('button', { name: 'Iniziamo' }))
    await user.click(await screen.findByRole('button', { name: 'Salta' }))
    await screen.findByRole('heading', { name: 'Dove sei e quando ti trovano aperto?' })
    await user.type(screen.getByRole('combobox', { name: 'Indirizzo' }), 'Via Roma 12')
    await user.click(screen.getByRole('button', { name: 'Lun Chiuso' }))
    await user.click(screen.getByRole('button', { name: 'Fatto, avanti' }))
    expect(screen.getByText('Indirizzo e orari: fatto!')).toBeInTheDocument()
    // da tastiera il pulsante sotto il velo si può ancora premere
    const salta = screen.getAllByText('Salta', { selector: 'button' }).find((b) => !b.closest('.tour-fantasma'))
    if (!salta) throw new Error('Salta non trovato')
    fireEvent.click(salta)
    act(() => { vi.advanceTimersByTime(DURATA_FESTA) })
    expect(await screen.findByRole('heading', { name: 'Ora i tuoi prezzi' })).toBeInTheDocument()
    expect(screen.getByText('Prepariamo il salone · 3 di 5')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Mettiamo al sicuro i tuoi dati' })).not.toBeInTheDocument()
  })

  it('Iniziamo mostra 5 passi, con Prezzi anche se i servizi sono attivi; Salta non fa festa', async () => {
    const uid = await nuovoSalone()
    const user = userEvent.setup()
    apri()
    await user.click(await screen.findByRole('button', { name: 'Iniziamo' }))
    expect(await screen.findByText('Prepariamo il salone · 1 di 5')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Il tuo logo' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salta' }))
    expect(tour(uid)?.saltati).toContain('logo')
    expect(screen.queryByText(/: fatto!/)).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Dove sei e quando ti trovano aperto?' })).toBeInTheDocument()
    // il contatore resta su 5 anche dopo aver saltato
    expect(screen.getByText('Prepariamo il salone · 2 di 5')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Salta' }))
    expect(await screen.findByRole('heading', { name: 'Ora i tuoi prezzi' })).toBeInTheDocument()
    expect(screen.getByText('Prepariamo il salone · 3 di 5')).toBeInTheDocument()
    expect(screen.queryByText(/email/i)).not.toBeInTheDocument()
  })

  it('prezzi e poi tempi: si salvano sugli stessi servizi e la festa arriva dopo i tempi', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const uid = await nuovoSalone()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    apri()
    await user.click(await screen.findByRole('button', { name: 'Iniziamo' }))
    await user.click(await screen.findByRole('button', { name: 'Salta' }))
    await screen.findByRole('heading', { name: 'Dove sei e quando ti trovano aperto?' })
    await user.click(screen.getByRole('button', { name: 'Salta' }))
    await screen.findByRole('heading', { name: 'Ora i tuoi prezzi' })

    const prezzo = screen.getByRole('textbox', { name: 'Bagno piccola' })
    await user.clear(prezzo)
    await user.type(prezzo, '27')
    await user.click(screen.getByRole('button', { name: 'Avanti: i tempi' }))
    expect(listServices(uid).find((s) => s.id === 'bagno')?.price.piccola).toBe(27)
    expect(screen.queryByText(/: fatto!/)).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'E quanto ci metti?' })).toBeInTheDocument()

    const minuti = screen.getByRole('textbox', { name: 'Bagno grande' })
    await user.clear(minuti)
    await user.type(minuti, '70')
    await user.click(screen.getByRole('button', { name: 'Fatto, avanti' }))
    expect(listServices(uid).find((s) => s.id === 'bagno')?.durationMin.grande).toBe(70)
    expect(screen.getByText('Prezzi e tempi: fatto!')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(DURATA_FESTA) })
    expect(await screen.findByRole('heading', { name: 'Mettiamo al sicuro i tuoi dati' })).toBeInTheDocument()
    expect(screen.queryByText('Prezzi e tempi: fatto!')).not.toBeInTheDocument()
  })

  it('Salta sui tempi salta il listino ma i prezzi cambiati restano', async () => {
    const uid = await nuovoSalone()
    const user = userEvent.setup()
    apri()
    await user.click(await screen.findByRole('button', { name: 'Iniziamo' }))
    await user.click(await screen.findByRole('button', { name: 'Salta' }))
    await screen.findByRole('heading', { name: 'Dove sei e quando ti trovano aperto?' })
    await user.click(screen.getByRole('button', { name: 'Salta' }))
    const prezzo = await screen.findByRole('textbox', { name: 'Taglio / tosatura media' })
    await user.clear(prezzo)
    await user.type(prezzo, '41')
    await user.click(screen.getByRole('button', { name: 'Avanti: i tempi' }))
    await screen.findByRole('heading', { name: 'E quanto ci metti?' })
    await user.click(screen.getByRole('button', { name: 'Salta' }))
    expect(await screen.findByRole('heading', { name: 'Mettiamo al sicuro i tuoi dati' })).toBeInTheDocument()
    expect(tour(uid)?.saltati).toContain('listino')
    expect(listServices(uid).find((s) => s.id === 'taglio')?.price.media).toBe(41)
  })

  it('orari diversi per giorno si salvano come fasce distinte', async () => {
    const uid = await nuovoSalone()
    const user = userEvent.setup()
    apri()
    await user.click(await screen.findByRole('button', { name: 'Iniziamo' }))
    await user.click(await screen.findByRole('button', { name: 'Salta' }))
    await screen.findByRole('heading', { name: 'Dove sei e quando ti trovano aperto?' })
    const fatto = screen.getByRole('button', { name: 'Fatto, avanti' })
    expect(fatto).toBeDisabled()
    await user.type(screen.getByRole('combobox', { name: 'Indirizzo' }), 'Via Roma 12, Cagliari')
    await user.click(screen.getByRole('button', { name: 'Lun Chiuso' }))
    fireEvent.change(screen.getByLabelText('Lun Alle'), { target: { value: '19:00' } })
    await user.click(screen.getByRole('button', { name: 'Sab Chiuso' }))
    fireEvent.change(screen.getByLabelText('Sab Alle'), { target: { value: '13:00' } })
    expect(fatto).toBeEnabled()
    await user.click(fatto)
    const salvati = getSettings(uid)
    expect(salvati.business.address).toBe('Via Roma 12, Cagliari')
    expect(salvati.orari).toEqual({ 1: [{ da: '09:00', a: '19:00' }], 6: [{ da: '09:00', a: '13:00' }] })
    expect(screen.getByText('Indirizzo e orari: fatto!')).toBeInTheDocument()
  })

  it('se il salvataggio non riesce niente festa e si resta sul passo', async () => {
    const uid = await nuovoSalone()
    const user = userEvent.setup()
    apri()
    await user.click(await screen.findByRole('button', { name: 'Iniziamo' }))
    for (const titolo of ['Il tuo logo', 'Dove sei e quando ti trovano aperto?', 'Ora i tuoi prezzi']) {
      await screen.findByRole('heading', { name: titolo })
      await user.click(screen.getByRole('button', { name: 'Salta' }))
    }
    await screen.findByRole('heading', { name: 'Mettiamo al sicuro i tuoi dati' })
    expect(screen.getByText('Il backup si collega dall’app sul telefono.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Avanti' }))
    await screen.findByRole('heading', { name: 'Dati fiscali' })
    expect(tour(uid)?.saltati).toContain('backup')
    await user.type(screen.getByRole('textbox', { name: 'Partita IVA' }), '12345678901')
    const scrivi = localStorage.setItem.bind(localStorage)
    vi.spyOn(localStorage, 'setItem').mockImplementation((chiave: string, valore: string) => {
      if (chiave === storageKeys.settings(uid)) throw new Error('quota')
      scrivi(chiave, valore)
    })
    await user.click(screen.getByRole('button', { name: 'Fatto, avanti' }))
    expect(await screen.findByText('Salvataggio non riuscito')).toBeInTheDocument()
    expect(screen.queryByText(/: fatto!/)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Dati fiscali' })).toBeInTheDocument()
  })

  it('alla fine "Entra in Groomly" lascia il tour visto e porta alla home', async () => {
    const uid = await nuovoSalone()
    const user = userEvent.setup()
    apri()
    await user.click(await screen.findByRole('button', { name: 'Iniziamo' }))
    for (const titolo of ['Il tuo logo', 'Dove sei e quando ti trovano aperto?', 'Ora i tuoi prezzi']) {
      await screen.findByRole('heading', { name: titolo })
      await user.click(screen.getByRole('button', { name: 'Salta' }))
    }
    await screen.findByRole('heading', { name: 'Mettiamo al sicuro i tuoi dati' })
    await user.click(screen.getByRole('button', { name: 'Avanti' }))
    await screen.findByRole('heading', { name: 'Dati fiscali' })
    await user.click(screen.getByRole('button', { name: 'Salta' }))
    expect(await screen.findByRole('heading', { name: 'Il salone è quasi pronto!' })).toBeInTheDocument()
    await waitFor(() => expect(tour(uid)?.stato).toBe('visto'))
    await user.click(screen.getByRole('button', { name: 'Entra in Groomly' }))
    expect(await screen.findByRole('heading', { name: 'Oggi' })).toBeInTheDocument()
    expect(tour(uid)).toEqual({ stato: 'visto', saltati: ['logo', 'sede', 'listino', 'backup', 'fiscale'] })
  })
})
