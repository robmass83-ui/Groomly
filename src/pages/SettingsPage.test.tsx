// @vitest-environment happy-dom
import { render, screen, waitFor, within } from '@testing-library/react'
import JSZip from 'jszip'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { completeAppointment, createAppointment } from '../data/local/appointments'
import { createAccount } from '../data/local/auth'
import { archiveDog, createDog } from '../data/local/dogs'
import { getSettings, setTheme, type SettingsMain } from '../data/local/settings'
import { readJson, storageKeys, writeJson } from '../data/local/storage'
import type { DogWrite } from '../types/models'

function dog(name: string, extra: Partial<DogWrite> = {}): DogWrite {
  return {
    name,
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: '', phone: '333' },
    ...extra,
  }
}

function captureDownloads() {
  const downloads: { name: string; blob: Blob }[] = []
  const blobs = new Map<string, Blob>()
  let n = 0
  vi.spyOn(URL, 'createObjectURL').mockImplementation((value) => {
    const url = `blob:test-${n}`
    n += 1
    blobs.set(url, value as Blob)
    return url
  })
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click(this: HTMLAnchorElement) {
    const blob = blobs.get(this.href) ?? blobs.get(this.getAttribute('href') ?? '')
    downloads.push({ name: this.download, blob: blob as Blob })
  })
  return downloads
}

async function enter(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'maria@salone.it')
  await user.type(screen.getByLabelText('Password'), 'segretissimo')
  await user.click(screen.getByRole('button', { name: 'Crea accesso' }))
  await screen.findByRole('heading', { name: 'Groomly' })
  await user.click(screen.getByRole('link', { name: 'Impostazioni' }))
}

describe('impostazioni', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('applica il tema salvato al refresh senza aprire Impostazioni', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    setTheme(account.uid, 'dark')
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('heading', { name: 'Groomly' })).toBeInTheDocument()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it("mostra attività, backup e promemoria, ed esce lasciando l'account", async () => {
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await enter(user)
    expect(screen.getByRole('heading', { name: 'Impostazioni' })).toBeInTheDocument()
    expect(screen.getByText('Aspetto')).toBeInTheDocument()
    expect(screen.getByText('Attività')).toBeInTheDocument()
    expect(screen.getByText('Aggiungi')).toBeInTheDocument()
    expect(screen.getByText('Dati e backup')).toBeInTheDocument()
    expect(screen.getByText('Mai eseguito')).toBeInTheDocument()
    expect(screen.getByText('Mai eseguito').getAttribute('style')).toContain('var(--warn)')
    expect(screen.getByText('Attività').closest('h2')?.nextElementSibling?.firstElementChild?.getAttribute('style')).toContain('min-height: 52px')
    expect(screen.getByRole('switch', { name: 'Backup automatico giornaliero' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText('8 servizi · tempi stimati')).toBeInTheDocument()
    expect(screen.getByText('Campi scheda')).toBeInTheDocument()
    expect(screen.getByText('Tag caratteristiche')).toBeInTheDocument()
    expect(screen.getByText('0 tag · 4 caratteri')).toBeInTheDocument()
    expect(screen.getByText('Archivio animali')).toBeInTheDocument()
    expect(screen.getByText('Promemoria mensili')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Promemoria mensili' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByLabelText('Orario')).toHaveAttribute('type', 'time')
    expect(screen.getByLabelText('Orario')).toHaveValue('18:30')
    expect(screen.getByLabelText('Giorni di anticipo')).toHaveValue(7)
    expect(screen.getByText('Groomly v1.0')).toBeInTheDocument()
    const exit = screen.getByRole('button', { name: 'Esci' })
    expect(exit.getAttribute('style')).toContain('color: var(--bad)')
    expect(exit.getAttribute('style')).toContain('margin-top: 24px')
    expect(exit.previousElementSibling).toBe(screen.getByText('Groomly v1.0'))
    await user.click(exit)
    expect(await screen.findByRole('button', { name: 'Entra' })).toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.session)).toBeNull()
    expect(localStorage.getItem(storageKeys.auth)).toContain('maria@salone.it')
  })

  it('applica il tema scuro e lo ripristina se il salvataggio fallisce', async () => {
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await enter(user)
    await user.click(screen.getByRole('radio', { name: 'Scuro' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    await user.click(screen.getByRole('radio', { name: 'Chiaro' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByRole('status')).toHaveTextContent('Salvataggio non riuscito')
    vi.restoreAllMocks()
  })

  it('la matita salva l’attività e Copia mostra Copiato', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    expect(await screen.findByText('Aggiungi')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Modifica attività' }))
    await user.type(screen.getByLabelText('Ragione sociale'), 'Salone Maria')
    await user.type(screen.getByLabelText('Partita IVA'), '12345678901')
    await user.type(screen.getByLabelText('Telefono'), '333')
    await user.type(screen.getByLabelText('Indirizzo'), 'Via Roma 1')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Aggiungi')).not.toBeInTheDocument()
    expect(screen.getByText('Salone Maria')).toBeInTheDocument()
    expect(screen.getByText('333 · Via Roma 1')).toBeInTheDocument()
    expect(getSettings(account.uid).business).toEqual({
      name: 'Salone Maria',
      vatNumber: '12345678901',
      phone: '333',
      address: 'Via Roma 1',
    })
    await user.click(screen.getByRole('button', { name: 'Copia' }))
    expect(writeText).toHaveBeenCalledWith('12345678901')
    expect(await screen.findByRole('status')).toHaveTextContent('Copiato')
  })

  it('Esegui scarica il json del giorno e segna lastAt', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Bobi'))
    const downloads = captureDownloads()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByText('Mai eseguito')
    await user.click(screen.getByRole('button', { name: 'Esegui' }))
    const now = new Date()
    const filename = `groomly-backup-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.json`
    expect(downloads.map((item) => item.name)).toEqual([filename])
    const bundle = JSON.parse(await downloads[0].blob.text()) as { dogs: Record<string, { name: string }> }
    expect(Object.values(bundle.dogs).map((item) => item.name)).toEqual(['Bobi'])
    expect(screen.getByText(/Oggi \d{2}:\d{2} · completato/)).toBeInTheDocument()
    expect(getSettings(account.uid).backup.lastAt).toEqual(expect.any(String))
    expect(localStorage.getItem(`groomly.users.${account.uid}.backup`)).toBeNull()
    vi.restoreAllMocks()
  })

  it('Esporta scarica lo zip con il json e le foto', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const created = createDog(account.uid, dog('Bobi', { photo: 'data:image/jpeg;base64,YQ==' }))
    const downloads = captureDownloads()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    await user.click(screen.getByRole('button', { name: 'Esporta' }))
    await waitFor(() => {
      expect(downloads.map((item) => item.name)).toEqual(['groomly-export.zip'])
    })
    const zip = await JSZip.loadAsync(await downloads[0].blob.arrayBuffer())
    expect(zip.file('backup.json')).toBeTruthy()
    expect(zip.file(`foto/${created.id}.jpg`)).toBeTruthy()
    vi.restoreAllMocks()
  })

  it('mostra la data breve se l’ultimo backup non è di oggi', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const settings = getSettings(account.uid)
    writeJson(storageKeys.settings(account.uid), {
      ...settings,
      backup: { autoDaily: false, lastAt: new Date(2026, 8, 3, 7, 0, 0, 0).toISOString() },
    })
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    const date = await screen.findByText('3 set 2026')
    expect(date.getAttribute('style') ?? '').not.toContain('var(--warn)')
    expect(screen.queryByText('Mai eseguito')).not.toBeInTheDocument()
  })

  it('all’apertura con il giornaliero acceso e un lastAt vecchio aggiorna lo snapshot senza download', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const settings = getSettings(account.uid)
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    writeJson(storageKeys.settings(account.uid), {
      ...settings,
      backup: { autoDaily: true, lastAt: old },
    })
    createDog(account.uid, dog('Bobi'))
    const download = vi.spyOn(URL, 'createObjectURL')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    await user.click(await screen.findByRole('link', { name: 'Impostazioni' }))
    expect(await screen.findByText(/Oggi \d{2}:\d{2} · completato/)).toBeInTheDocument()
    expect(download).not.toHaveBeenCalled()
    expect(localStorage.getItem(`groomly.users.${account.uid}.backup`)).toBeNull()
    const stored = readJson<SettingsMain>(storageKeys.settings(account.uid))
    expect(stored?.backup.lastAt).not.toBe(old)
    const snapshot = stored?.backup.snapshot as { dogs?: Record<string, { name?: string }>; settings?: { backup?: { snapshot?: unknown } } }
    expect(Object.values(snapshot?.dogs ?? {}).map((item) => item.name)).toEqual(['Bobi'])
    expect(snapshot?.settings?.backup?.snapshot).toBeUndefined()
    vi.restoreAllMocks()
  })

  it('Ripristina mostra i conteggi, Annulla non scrive e la sessione resta', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Bobi'))
    const session = localStorage.getItem(storageKeys.session)
    const auth = localStorage.getItem(storageKeys.auth)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    const file = new File([JSON.stringify({
      dogs: { a: {}, b: {} },
      appointments: {},
      services: { s: {} },
      settings: getSettings(account.uid),
    })], 'groomly-backup.json', { type: 'application/json' })
    await user.upload(screen.getByLabelText('Scegli backup'), file)
    expect(await screen.findByRole('dialog', { name: 'Ripristina' })).toHaveTextContent('2 cani, 0 appuntamenti, 1 servizi')
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(Object.keys(readJson<Record<string, unknown>>(storageKeys.dogs(account.uid)) ?? {})).not.toEqual(['a', 'b'])
    await user.upload(screen.getByLabelText('Scegli backup'), file)
    const dialog = await screen.findByRole('dialog', { name: 'Ripristina' })
    await user.click(within(dialog).getByRole('button', { name: 'Ripristina' }))
    await waitFor(() => {
      expect(Object.keys(readJson<Record<string, unknown>>(storageKeys.dogs(account.uid)) ?? {})).toEqual(['a', 'b'])
    })
    expect(localStorage.getItem(storageKeys.session)).toBe(session)
    expect(localStorage.getItem(storageKeys.auth)).toBe(auth)
    expect(confirm).not.toHaveBeenCalled()
    confirm.mockRestore()
  })

  it('un file senza settings non cancella groomly.session e non sostituisce i cani', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Bobi'))
    const session = localStorage.getItem('groomly.session')
    const dogs = localStorage.getItem(storageKeys.dogs(account.uid))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    const file = new File([JSON.stringify({
      dogs: { a: { name: 'Altro' } },
      appointments: {},
      services: {},
    })], 'groomly-backup.json', { type: 'application/json' })
    await user.upload(screen.getByLabelText('Scegli backup'), file)
    expect(await screen.findByRole('status')).toHaveTextContent('Salvataggio non riuscito')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(localStorage.getItem('groomly.session')).toBe(session)
    expect(localStorage.getItem(storageKeys.dogs(account.uid))).toBe(dogs)
  })

  it('rinomina i campi, aggiunge i tag e apre l’archivio col conteggio', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const ada = createDog(account.uid, dog('Ada'))
    archiveDog(account.uid, ada.id, 'deceduto')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    expect(await screen.findByText('1 in archivio')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Archivio animali/ })).toHaveAttribute('href', '/animali?tab=archivio')
    await user.click(screen.getByRole('button', { name: 'Modifica attività' }))
    const business = screen.getByRole('dialog', { name: 'Attività' })
    expect(within(business).queryByTestId('sheet-grabber')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Chiudi' })).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(screen.queryByRole('dialog', { name: 'Attività' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Campi scheda/ }))
    expect(within(screen.getByRole('dialog', { name: 'Campi scheda' })).queryByTestId('sheet-grabber')).not.toBeInTheDocument()
    const species = screen.getByLabelText('Specie')
    await user.clear(species)
    await user.type(species, 'Tipo')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(getSettings(account.uid).fieldLabels.species).toBe('Tipo')
    await user.click(screen.getByRole('button', { name: /Tag caratteristiche/ }))
    const tags = screen.getByRole('dialog', { name: 'Tag caratteristiche' })
    expect(within(tags).getByTestId('sheet-grabber')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Togli Tagliando' })).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Tag'), 'ipoallergenico')
    await user.click(screen.getByRole('button', { name: 'Aggiungi tag' }))
    await user.type(screen.getByLabelText('Strumenti'), 'tosatrice')
    await user.click(screen.getByRole('button', { name: 'Aggiungi strumento' }))
    await user.type(screen.getByLabelText('Prodotti'), 'shampoo')
    await user.click(screen.getByRole('button', { name: 'Aggiungi prodotto' }))
    expect(getSettings(account.uid).tagSuggestions).toEqual(['ipoallergenico'])
    expect(getSettings(account.uid).toolSuggestions).toEqual(['tosatrice'])
    expect(getSettings(account.uid).productSuggestions).toEqual(['shampoo'])
    expect(screen.getByText('1 tag · 4 caratteri')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Togli ipoallergenico' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Togli Tagliando' })).not.toBeInTheDocument()
    await user.click(within(tags).getByRole('button', { name: 'Chiudi' }))
    await user.click(screen.getByRole('link', { name: /Archivio animali/ }))
    expect(await screen.findByRole('tab', { name: 'Archivio 1' })).toHaveAttribute('aria-selected', 'true')
  })

  it('il promemoria si salva e il toggle spento lascia il banner in home', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const rex = createDog(account.uid, dog('Rex', { clientType: 'mensile' }))
    const done = createAppointment(account.uid, {
      dogId: rex.id,
      start: new Date(2026, 7, 1, 9, 0, 0, 0),
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    })
    completeAppointment(account.uid, done.id)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('region', { name: 'Mensili da programmare' })).toBeInTheDocument()
    expect(screen.getByText('scadono entro 7 gg')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Impostazioni' }))
    await user.click(await screen.findByRole('switch', { name: 'Promemoria mensili' }))
    expect(getSettings(account.uid).monthlyReminder.enabled).toBe(false)
    await user.clear(screen.getByLabelText('Giorni di anticipo'))
    await user.type(screen.getByLabelText('Giorni di anticipo'), '3')
    expect(getSettings(account.uid).monthlyReminder.daysBefore).toBe(3)
    await user.click(screen.getByRole('link', { name: 'Indietro' }))
    expect(await screen.findByRole('region', { name: 'Mensili da programmare' })).toBeInTheDocument()
    expect(screen.getByText('scadono entro 3 gg')).toBeInTheDocument()
  })
})
