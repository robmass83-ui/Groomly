// @vitest-environment happy-dom
import { render, screen, waitFor, within } from '@testing-library/react'
import JSZip from 'jszip'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { APP_VERSION } from '../lib/appVersion'
import { completeAppointment, createAppointment } from '../data/local/appointments'
import { createAccount } from '../data/local/auth'
import { archiveDog, createDog } from '../data/local/dogs'
import { getSettings, setTheme, type SettingsMain } from '../data/local/settings'
import { savePushPrefs } from '../data/pushPrefs'
import { readJson, storageKeys, writeJson } from '../data/local/storage'
import type { DogWrite } from '../types/models'
import { AppError } from '../data/errors'
import { buildManifest, canonicalJson, sha256Hex, type GroomlyDati } from '../lib/backupBundle'
import { romeDay } from '../lib/romeTime'

const { raccogliBackup, scriviCodiciCane, scriviFileRipristino, eliminaFileDalSalone } = vi.hoisted(() => ({
  raccogliBackup: vi.fn(),
  scriviCodiciCane: vi.fn(),
  scriviFileRipristino: vi.fn(),
  eliminaFileDalSalone: vi.fn(),
}))

const { salvaCopiaCloud, leggiCopiaCloud, cancellaCopiaCloud, esisteCopiaCloud } = vi.hoisted(() => ({
  salvaCopiaCloud: vi.fn(),
  leggiCopiaCloud: vi.fn(),
  cancellaCopiaCloud: vi.fn(),
  esisteCopiaCloud: vi.fn(async () => false),
}))

const { driveCollega, driveLeggi, driveScollega, inviaBackupSuDrive, provaInvioAutomatico } = vi.hoisted(() => ({
  driveCollega: vi.fn(),
  driveLeggi: vi.fn(async (): Promise<{ collegato: boolean; email: string | null }> => ({ collegato: false, email: null })),
  driveScollega: vi.fn(),
  inviaBackupSuDrive: vi.fn(async () => undefined),
  provaInvioAutomatico: vi.fn(async () => 'saltato' as const),
}))

vi.mock('../data/firebase/backupCollect', () => ({ raccogliBackup, scriviCodiciCane }))
vi.mock('../data/firebase/ripristinoFile', () => ({ scriviFileRipristino, eliminaFileDalSalone }))
vi.mock('../data/firebase/ripristinoSicurezza', () => ({ salvaCopiaCloud, leggiCopiaCloud, cancellaCopiaCloud, esisteCopiaCloud }))
vi.mock('../lib/driveAuth', () => ({
  DriveAuth: { collega: driveCollega, leggi: driveLeggi, scollega: driveScollega },
}))
vi.mock('../lib/driveInvio', async () => {
  const actual = await vi.importActual<typeof import('../lib/driveInvio')>('../lib/driveInvio')
  return { ...actual, inviaBackupSuDrive, provaInvioAutomatico }
})

function metaFoto(): GroomlyDati['files'][string] {
  return {
    id: 'f1', kind: 'foto', owner: 'dog:a', name: '', mime: 'image/webp', byteSize: 3, chunkCount: 0,
    createdAt: '2026-10-22T12:00:00.000Z', createdBy: 'u1', estensione: '.webp',
    percorsoBackup: 'cani/C0001 - Fido/profilo.webp', esito: 'ok',
  }
}

function datiRegistro(): GroomlyDati {
  return {
    versioneFormato: 1,
    dogs: {},
    appointments: {},
    services: {},
    settings: { business: { salonName: 'Pelosetti' } },
    closures: {},
    files: {},
    deletedDogs: { ids: [], appointmentIds: [] },
    codiciCane: { next: 1, cartella: 'cani', byId: {} },
    fotoMancanti: [],
  }
}

async function raccoltoZip(salonName = 'Pelosetti') {
  const base = datiRegistro()
  base.settings = { business: { salonName } }
  const json = canonicalJson(base)
  const checksum = await sha256Hex(json)
  const manifest = buildManifest(base, { now: new Date(), salonId: 'salon', checksum, includiByte: false })
  return { dati: base, json, checksum, manifest }
}

async function raccoltoCompleto() {
  const base = datiRegistro()
  const json = canonicalJson(base)
  const checksum = await sha256Hex(json)
  const manifest = buildManifest(base, { now: new Date(), salonId: 'salon', checksum, includiByte: true })
  return { dati: base, json, checksum, manifest }
}

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
  await user.click(screen.getByRole('button', { name: 'Non hai un account? Crea account' }))
  await user.type(screen.getByLabelText('Nome'), 'Maria')
  await user.type(screen.getByLabelText('Cognome'), 'Rossi')
  await user.type(screen.getByLabelText('Nome della toelettatura'), 'Il Cane Felice')
  await user.type(screen.getByLabelText('Email'), 'maria@salone.it')
  await user.type(screen.getByLabelText('Password'), 'segretissimo')
  await user.click(screen.getByRole('button', { name: 'Crea account' }))
  await screen.findByRole('heading', { name: 'Groomly' })
  await user.click(screen.getByRole('link', { name: /Impostazioni/ }))
}

describe('impostazioni', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    scriviCodiciCane.mockReset()
    scriviFileRipristino.mockReset()
    eliminaFileDalSalone.mockReset()
    salvaCopiaCloud.mockReset()
    leggiCopiaCloud.mockReset()
    cancellaCopiaCloud.mockReset()
    esisteCopiaCloud.mockReset()
    driveCollega.mockReset()
    driveLeggi.mockReset()
    driveScollega.mockReset()
    inviaBackupSuDrive.mockReset()
    provaInvioAutomatico.mockReset()
    driveLeggi.mockResolvedValue({ collegato: false, email: null })
    inviaBackupSuDrive.mockResolvedValue(undefined)
    provaInvioAutomatico.mockResolvedValue('saltato')
    delete document.documentElement.dataset.theme
  })

  it('Registro Excel consegna Registro Groomly.xlsx e intanto è disabilitato', async () => {
    let release: (value: { dati: GroomlyDati }) => void = () => undefined
    const gate = new Promise<{ dati: GroomlyDati }>((resolve) => { release = resolve })
    raccogliBackup.mockImplementation(() => gate)
    const downloads = captureDownloads()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    await enter(user)
    const button = screen.getByRole('button', { name: 'Registro Excel' })
    await user.click(button)
    expect(button).toBeDisabled()
    release({ dati: datiRegistro() })
    await waitFor(() => expect(downloads.some((item) => item.name === 'Registro Groomly.xlsx')).toBe(true), { timeout: 10_000 })
    expect(screen.getByRole('button', { name: 'Esegui ora' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Esporta' })).toBeEnabled()
  })

  it('Registro Excel senza rete dice che serve la connessione', async () => {
    raccogliBackup.mockRejectedValue(new AppError('Serve la connessione per creare il backup', 'backup_offline'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    await enter(user)
    await user.click(screen.getByRole('button', { name: 'Registro Excel' }))
    expect(await screen.findByText('Serve la connessione per creare il backup')).toBeInTheDocument()
  })

  it('Backup ZIP consegna il file del giorno di Roma e intanto è disabilitato', async () => {
    const pronto = await raccoltoZip()
    let release: (value: typeof pronto) => void = () => undefined
    const gate = new Promise<typeof pronto>((resolve) => { release = resolve })
    raccogliBackup.mockImplementation(() => gate)
    const downloads = captureDownloads()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    await enter(user)
    const button = screen.getByRole('button', { name: 'Backup ZIP' })
    await user.click(button)
    expect(button).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Registro Excel' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Esegui ora' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Esporta' })).toBeEnabled()
    release(pronto)
    const name = `Groomly Backup – Pelosetti – ${romeDay(new Date())}.zip`
    await waitFor(() => expect(downloads.some((item) => item.name === name)).toBe(true), { timeout: 10_000 })
  })

  it('Backup ZIP senza rete dice che serve la connessione', async () => {
    raccogliBackup.mockRejectedValue(new AppError('Serve la connessione per creare il backup', 'backup_offline'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    await enter(user)
    await user.click(screen.getByRole('button', { name: 'Backup ZIP' }))
    expect(await screen.findByText('Serve la connessione per creare il backup')).toBeInTheDocument()
  })

  it('Backup completo consegna il file del giorno di Roma e intanto è disabilitato', async () => {
    const pronto = await raccoltoCompleto()
    let release: (value: typeof pronto) => void = () => undefined
    const gate = new Promise<typeof pronto>((resolve) => { release = resolve })
    raccogliBackup.mockImplementation(() => gate)
    const downloads = captureDownloads()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    await enter(user)
    const button = screen.getByRole('button', { name: 'Backup completo' })
    await user.click(button)
    expect(button).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Backup ZIP' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Registro Excel' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Esegui ora' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Esporta' })).toBeEnabled()
    await waitFor(() => expect(raccogliBackup).toHaveBeenCalledWith(expect.any(Date), expect.objectContaining({ includiByte: true, onFile: expect.any(Function) })))
    release(pronto)
    const name = `Groomly Backup completo – Pelosetti – ${romeDay(new Date())}.zip`
    await waitFor(() => expect(downloads.some((item) => item.name === name)).toBe(true), { timeout: 10_000 })
  })

  it('Backup completo senza rete dice che serve la connessione', async () => {
    raccogliBackup.mockRejectedValue(new AppError('Serve la connessione per creare il backup', 'backup_offline'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    await enter(user)
    await user.click(screen.getByRole('button', { name: 'Backup completo' }))
    expect(await screen.findByText('Serve la connessione per creare il backup')).toBeInTheDocument()
  })

  it('applica il tema salvato al refresh senza aprire Impostazioni', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    localStorage.setItem('groomly.theme', 'dark')
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('heading', { name: 'Groomly' })).toBeInTheDocument()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('il tema del salone non sostituisce quello del telefono', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    setTheme(account.uid, 'light')
    localStorage.setItem('groomly.theme', 'dark')
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByRole('heading', { name: 'Groomly' })).toBeInTheDocument()
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('groomly.theme')).toBe('dark')
    expect(getSettings(account.uid).theme).toBe('light')
  })

  it("mostra attività, backup e promemoria, ed esce lasciando l'account", async () => {
    const user = userEvent.setup()
    render(<App memory isDev={false} />)
    await enter(user)
    expect(screen.getByRole('heading', { name: 'Impostazioni' })).toBeInTheDocument()
    expect(screen.getByText('Aspetto')).toBeInTheDocument()
    expect(screen.getByText('Attività')).toBeInTheDocument()
    expect(screen.getByText('Il Cane Felice')).toBeInTheDocument()
    expect(screen.queryByText('Aggiungi')).not.toBeInTheDocument()
    expect(screen.getByText('Dati e backup')).toBeInTheDocument()
    expect(screen.getByText('Mai eseguito')).toBeInTheDocument()
    expect(screen.getByText('Mai eseguito').getAttribute('style')).toContain('var(--ok)')
    expect(screen.getByText('Attività').closest('h2')?.nextElementSibling?.firstElementChild?.getAttribute('style')).toContain('min-height: 52px')
    expect(screen.getByRole('switch', { name: 'Backup automatico giornaliero' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText('8 servizi · tempi stimati')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Campi scheda/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Campi scheda' })).not.toBeInTheDocument()
    expect(screen.getByText('Tag dei cani')).toBeInTheDocument()
    expect(screen.getByText('Nessuno da proporre')).toBeInTheDocument()
    expect(screen.getByText('Il Cane Felice').getAttribute('style')).toContain('overflow-wrap: anywhere')
    expect(screen.getByText('Archivio animali')).toBeInTheDocument()
    expect(screen.getByText('Notifiche')).toBeInTheDocument()
    expect(screen.getByText('Promemoria mensile alle 18:30 · Push spente')).toBeInTheDocument()
    expect(screen.queryByRole('switch', { name: 'Promemoria mensili' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Controlla aggiornamenti/ })).not.toBeInTheDocument()
    const versionButton = screen.getByRole('button', { name: `Groomly ${APP_VERSION}, storico aggiornamenti` })
    expect(versionButton).toHaveTextContent(`Groomly ${APP_VERSION}`)
    expect(screen.queryByText(/In Home, Da chiudere/)).not.toBeInTheDocument()
    const exit = screen.getByRole('button', { name: 'Esci' })
    expect(exit.getAttribute('style')).toContain('color: var(--bad)')
    expect(exit.getAttribute('style')).toContain('margin-top: 24px')
    expect(exit.previousElementSibling).toBe(versionButton.parentElement)
    await user.click(exit)
    const leave = await screen.findByRole('dialog', { name: 'Uscire da Groomly?' })
    await user.click(within(leave).getByRole('button', { name: 'Resta' }))
    expect(screen.queryByRole('dialog', { name: 'Uscire da Groomly?' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Impostazioni' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Esci' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Uscire da Groomly?' })).getByRole('button', { name: 'Esci' }))
    expect(await screen.findByRole('button', { name: 'Entra' })).toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.session)).toBeNull()
    expect(localStorage.getItem(storageKeys.auth)).toContain('maria@salone.it')
  })

  it('mostra se le notifiche push sono attive insieme al promemoria mensile', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const view = render(<App memory isDev={false} initialPath="/impostazioni" />)
    expect(await screen.findByText('Promemoria mensile alle 18:30 · Push spente')).toBeInTheDocument()

    view.unmount()
    savePushPrefs(account.uid, {
      enabled: true,
      updates: true,
      complete: true,
      completeAfterMin: 60,
    })
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    expect(await screen.findByText('Promemoria mensile alle 18:30 · Push attive')).toBeInTheDocument()
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
    expect(screen.getByText('Partita IVA 12345678901')).toBeInTheDocument()
    expect(screen.getByText('333')).toBeInTheDocument()
    const address = screen.getByText('Via Roma 1')
    expect(address.getAttribute('style')).toContain('overflow-wrap: anywhere')
    expect(address.getAttribute('style') ?? '').not.toContain('nowrap')
    expect(getSettings(account.uid).business).toEqual({
      salonName: '',
      name: 'Salone Maria',
      vatNumber: '12345678901',
      phone: '333',
      address: 'Via Roma 1',
      taxCode: '',
    })
    await user.click(screen.getByRole('button', { name: 'Copia' }))
    expect(writeText).toHaveBeenCalledWith('12345678901')
    expect(await screen.findByRole('status')).toHaveTextContent('Copiato')
  })

  it('se la copia della partita IVA fallisce dice Copia non riuscita', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const current = getSettings(account.uid)
    writeJson(storageKeys.settings(account.uid), {
      ...current,
      business: { ...current.business, name: 'Salone Maria', vatNumber: '12345678901' },
    })
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await user.click(await screen.findByRole('button', { name: 'Copia' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Copia non riuscita')
  })

  it('sotto la Partita IVA il nome toelettatura resta in cima al riepilogo', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await user.click(await screen.findByRole('button', { name: 'Modifica attività' }))
    const dialog = screen.getByRole('dialog', { name: 'Attività' })
    const vat = within(dialog).getByLabelText('Partita IVA')
    const salon = within(dialog).getByLabelText('Nome toelettatura')
    const code = within(dialog).getByLabelText('Codice fiscale')
    expect(vat.compareDocumentPosition(salon) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(salon.compareDocumentPosition(code) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await user.type(within(dialog).getByLabelText('Ragione sociale'), 'Masala Laura')
    await user.type(vat, '02767860907')
    await user.type(salon, 'Bauci')
    await user.type(within(dialog).getByLabelText('Telefono'), '349 098 9700')
    await user.type(within(dialog).getByLabelText('Indirizzo'), 'Corso Vittorio Emanuele II, 4/C')
    await user.click(within(dialog).getByRole('button', { name: 'Salva' }))
    expect(screen.queryByRole('dialog', { name: 'Attività' })).not.toBeInTheDocument()
    const title = screen.getByText('Bauci')
    const legal = screen.getByText('Masala Laura')
    const vatLine = screen.getByText('Partita IVA 02767860907')
    const phone = screen.getByText('349 098 9700')
    const address = screen.getByText('Corso Vittorio Emanuele II, 4/C')
    expect(title.getAttribute('style')).toContain('font-weight: 600')
    expect(title.compareDocumentPosition(legal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(legal.compareDocumentPosition(vatLine) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(vatLine.compareDocumentPosition(phone) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(phone.compareDocumentPosition(address) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(getSettings(account.uid).business).toMatchObject({
      salonName: 'Bauci',
      name: 'Masala Laura',
      vatNumber: '02767860907',
      phone: '349 098 9700',
      address: 'Corso Vittorio Emanuele II, 4/C',
    })
  })

  it('Attività mostra Codice fiscale sotto Partita IVA con il suo aiuto', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await user.click(await screen.findByRole('button', { name: 'Modifica attività' }))
    const dialog = screen.getByRole('dialog', { name: 'Attività' })
    const vat = within(dialog).getByLabelText('Partita IVA')
    const code = within(dialog).getByLabelText('Codice fiscale')
    expect(vat.compareDocumentPosition(code) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(dialog).getByText('Basta la partita IVA oppure il codice fiscale.')).toBeInTheDocument()
  })

  it('un codice fiscale sbagliato mostra l’errore e lascia aperto il foglio', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await user.click(await screen.findByRole('button', { name: 'Modifica attività' }))
    await user.type(screen.getByLabelText('Codice fiscale'), 'abc')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(screen.getByText('16 lettere o numeri')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Attività' })).toBeInTheDocument()
    expect(getSettings(account.uid).business.taxCode).toBe('')
  })

  it('una partita IVA sbagliata mostra l’errore e non salva nulla', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await user.click(await screen.findByRole('button', { name: 'Modifica attività' }))
    await user.type(screen.getByLabelText('Ragione sociale'), 'Salone Maria')
    await user.type(screen.getByLabelText('Partita IVA'), 'IT123')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(screen.getByText('11 cifre, senza IT')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Attività' })).toBeInTheDocument()
    expect(getSettings(account.uid).business.name).toBe('')
  })

  it('il codice fiscale si salva in maiuscolo e la partita IVA senza spazi', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await user.click(await screen.findByRole('button', { name: 'Modifica attività' }))
    await user.type(screen.getByLabelText('Partita IVA'), '123 456 789 01')
    await user.type(screen.getByLabelText('Codice fiscale'), 'rssmra85t10a562s')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(screen.queryByRole('dialog', { name: 'Attività' })).not.toBeInTheDocument()
    expect(getSettings(account.uid).business.taxCode).toBe('RSSMRA85T10A562S')
    expect(getSettings(account.uid).business.vatNumber).toBe('12345678901')
  })

  it('il solo codice fiscale basta e la partita IVA può restare vuota', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await user.click(await screen.findByRole('button', { name: 'Modifica attività' }))
    await user.type(screen.getByLabelText('Codice fiscale'), 'rssmra85t10a562s')
    await user.click(screen.getByRole('button', { name: 'Salva' }))
    expect(screen.queryByRole('dialog', { name: 'Attività' })).not.toBeInTheDocument()
    expect(getSettings(account.uid).business).toMatchObject({ vatNumber: '', taxCode: 'RSSMRA85T10A562S' })
    expect(screen.queryByTestId('tax-dot')).not.toBeInTheDocument()
  })

  it('openBusiness apre il foglio una sola volta', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/" />)
    const fiscal = await screen.findByRole('region', { name: 'Completa l\'attività' })
    await user.click(within(fiscal).getByRole('button', { name: 'Aggiungi' }))
    expect(await screen.findByRole('dialog', { name: 'Attività' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(screen.queryByRole('dialog', { name: 'Attività' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Modifica attività' }))
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(screen.queryByRole('dialog', { name: 'Attività' })).not.toBeInTheDocument()
  })

  it('Esegui scarica il json del giorno e segna lastAt', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Bobi'))
    const downloads = captureDownloads()
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByText('Mai eseguito')
    await user.click(screen.getByRole('button', { name: 'Esegui ora' }))
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
    await user.click(await screen.findByRole('link', { name: /Impostazioni/ }))
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
    const preview = await screen.findByRole('dialog', { name: 'Ripristina' })
    expect(preview).toHaveTextContent('2 cani, 0 appuntamenti, 1 servizi')
    expect(preview).toHaveTextContent('Sostituisce i dati di questo salone.')
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(Object.keys(readJson<Record<string, unknown>>(storageKeys.dogs(account.uid)) ?? {})).not.toEqual(['a', 'b'])
    await user.upload(screen.getByLabelText('Scegli backup'), file)
    const dialog = await screen.findByRole('dialog', { name: 'Ripristina' })
    const restore = within(dialog).getByRole('button', { name: 'Ripristina' })
    expect(restore.getAttribute('style')).toContain('color: var(--bad)')
    await user.click(restore)
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
    expect(await screen.findByRole('status')).toHaveTextContent('File non valido')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(localStorage.getItem('groomly.session')).toBe(session)
    expect(localStorage.getItem(storageKeys.dogs(account.uid))).toBe(dogs)
  })

  async function fileZip(
    includiByte: boolean,
    settings: Record<string, unknown>,
    extra?: { files?: GroomlyDati['files']; voci?: Record<string, Uint8Array>; dogs?: Record<string, unknown> },
  ) {
    const base = datiRegistro()
    base.dogs = extra?.dogs ?? { a: {}, b: {} }
    base.settings = settings
    base.codiciCane = { next: 4, cartella: 'cani', byId: { a: 'C0001', b: 'C0002' } }
    if (extra?.files) base.files = extra.files
    const json = canonicalJson(base)
    const checksum = await sha256Hex(json)
    const manifest = buildManifest(base, { now: new Date(), salonId: 'salon', checksum, includiByte })
    const zip = new JSZip()
    zip.file('LEGGIMI.txt', 'ciao\n')
    zip.file('dati/manifest.json', JSON.stringify(manifest, null, 2))
    zip.file('dati/groomly-dati.json', json)
    for (const [path, bytes] of Object.entries(extra?.voci ?? {})) zip.file(path, bytes)
    const bytes = new Uint8Array(await zip.generateAsync({ type: 'uint8array' }))
    return new File([bytes], 'backup.zip', { type: 'application/zip' })
  }

  it('lo ZIP solo dati in locale rimette i cani e tiene il backup del telefono', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const phone = getSettings(account.uid)
    writeJson(storageKeys.settings(account.uid), {
      ...phone,
      backup: { autoDaily: false, lastAt: '2026-10-22T10:00:00.000Z' },
    })
    createDog(account.uid, dog('Bobi'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    expect(screen.getByLabelText('Scegli backup').getAttribute('accept')).toBe('application/json,.json,application/zip,.zip')
    const file = await fileZip(false, {
      ...phone,
      business: { ...phone.business, salonName: 'Dal file' },
      backup: { autoDaily: true, lastAt: '1999-01-01T00:00:00.000Z', snapshot: { dogs: {} } },
    })
    await user.upload(screen.getByLabelText('Scegli backup'), file)
    const preview = await screen.findByRole('dialog', { name: 'Ripristina' })
    expect(preview).toHaveTextContent('2 cani, 0 appuntamenti, 0 servizi')
    expect(preview).toHaveTextContent('Sostituisce i dati di questo salone.')
    await user.click(screen.getByRole('button', { name: 'Annulla' }))
    expect(scriviCodiciCane).not.toHaveBeenCalled()
    expect(Object.keys(readJson<Record<string, unknown>>(storageKeys.dogs(account.uid)) ?? {})).not.toEqual(['a', 'b'])
    await user.upload(screen.getByLabelText('Scegli backup'), file)
    await user.click(within(await screen.findByRole('dialog', { name: 'Ripristina' })).getByRole('button', { name: 'Ripristina' }))
    await waitFor(() => {
      expect(Object.keys(readJson<Record<string, unknown>>(storageKeys.dogs(account.uid)) ?? {})).toEqual(['a', 'b'])
    })
    const stored = readJson<SettingsMain>(storageKeys.settings(account.uid))
    expect(stored?.backup).toEqual({ autoDaily: false, lastAt: '2026-10-22T10:00:00.000Z' })
    expect(stored?.business.salonName).toBe('Dal file')
    expect(scriviCodiciCane).not.toHaveBeenCalled()
  })

  it('lo ZIP completo, il checksum rotto e il JSON interno non scrivono', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Bobi'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    const foto = new Uint8Array([1, 2, 3])
    await user.upload(screen.getByLabelText('Scegli backup'), await fileZip(true, { business: { salonName: 'Dal file' } }, {
      files: { f1: metaFoto() },
      voci: { 'cani/C0001 - Fido/profilo.webp': foto },
    }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Ripristina' })).getByRole('button', { name: 'Ripristina' }))
    await waitFor(() => {
      expect(Object.keys(readJson<Record<string, unknown>>(storageKeys.dogs(account.uid)) ?? {})).toEqual(['a', 'b'])
    })
    expect(scriviFileRipristino).not.toHaveBeenCalled()
    expect(scriviCodiciCane).not.toHaveBeenCalled()
    const dogsDopoRipristino = localStorage.getItem(storageKeys.dogs(account.uid))
    const base = datiRegistro()
    const json = canonicalJson(base)
    const manifest = buildManifest(base, { now: new Date(), salonId: 'salon', checksum: '0'.repeat(64), includiByte: false })
    const zip = new JSZip()
    zip.file('dati/manifest.json', JSON.stringify(manifest))
    zip.file('dati/groomly-dati.json', json)
    const bytes = new Uint8Array(await zip.generateAsync({ type: 'uint8array' }))
    await user.upload(screen.getByLabelText('Scegli backup'), new File([bytes], 'rotto.zip', { type: 'application/zip' }))
    expect(await screen.findByText('File non valido')).toBeInTheDocument()
    const interno = new File([JSON.stringify({ versioneFormato: 1, dogs: { a: {} }, appointments: {}, services: {}, settings: {} })], 'groomly-dati.json', { type: 'application/json' })
    await user.upload(screen.getByLabelText('Scegli backup'), interno)
    expect(await screen.findByText('Questo è il JSON interno. Ripristina lo ZIP di Backup ZIP.')).toBeInTheDocument()
    expect(localStorage.getItem(storageKeys.dogs(account.uid))).toBe(dogsDopoRipristino)
    expect(scriviCodiciCane).not.toHaveBeenCalled()
  })

  it('in cloud la conferma scrive i dati e poi i codici', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const phone = getSettings(account.uid)
    writeJson(storageKeys.settings(account.uid), {
      ...phone,
      backup: { autoDaily: false, lastAt: '2026-10-22T10:00:00.000Z' },
    })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    await user.upload(screen.getByLabelText('Scegli backup'), await fileZip(false, {
      business: { salonName: 'Dal file' },
      backup: { autoDaily: true, lastAt: '1999-01-01T00:00:00.000Z' },
    }))
    const enabled = await import('../data/firebase/enabled')
    const client = await import('../data/firebase/client')
    vi.spyOn(enabled, 'firebaseEnabled').mockReturnValue(true)
    vi.spyOn(enabled, 'readsLocal').mockReturnValue(false)
    const order: string[] = []
    const replace = vi.spyOn(client, 'replaceCloudData').mockImplementation(async () => { order.push('dati') })
    scriviCodiciCane.mockImplementation(async () => { order.push('codici') })
    await user.click(within(await screen.findByRole('dialog', { name: 'Ripristina' })).getByRole('button', { name: 'Ripristina' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Ripristinato')
    expect(order).toEqual(['dati', 'codici'])
    const written = replace.mock.calls[0]?.[1] as { settings?: { backup?: { lastAt?: string } } }
    expect(written.settings?.backup?.lastAt).toBe('2026-10-22T10:00:00.000Z')
    expect(scriviCodiciCane).toHaveBeenCalledWith({ next: 4, cartella: 'cani', byId: { a: 'C0001', b: 'C0002' } })
    expect(scriviFileRipristino).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('in cloud lo ZIP completo scrive dati, codici e poi i file', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    const foto = new Uint8Array([1, 2, 3])
    await user.upload(screen.getByLabelText('Scegli backup'), await fileZip(true, { business: { salonName: 'Dal file' } }, {
      files: { f1: metaFoto() },
      voci: { 'cani/C0001 - Fido/profilo.webp': foto },
    }))
    const enabled = await import('../data/firebase/enabled')
    const client = await import('../data/firebase/client')
    vi.spyOn(enabled, 'firebaseEnabled').mockReturnValue(true)
    vi.spyOn(enabled, 'readsLocal').mockReturnValue(false)
    const order: string[] = []
    vi.spyOn(client, 'replaceCloudData').mockImplementation(async () => { order.push('dati') })
    scriviCodiciCane.mockImplementation(async () => { order.push('codici') })
    scriviFileRipristino.mockImplementation(async () => { order.push('file') })
    await user.click(within(await screen.findByRole('dialog', { name: 'Ripristina' })).getByRole('button', { name: 'Ripristina' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Ripristinato')
    expect(order).toEqual(['dati', 'codici', 'file'])
    const scritti = scriviFileRipristino.mock.calls[0]?.[0] as Array<{ id: string; mime: string; bytes: Uint8Array }>
    expect(scritti).toHaveLength(1)
    expect(scritti[0]?.id).toBe('f1')
    expect(scritti[0]?.mime).toBe('image/webp')
    expect(Array.from(scritti[0]?.bytes ?? [])).toEqual([1, 2, 3])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('se i file falliscono il foglio resta aperto', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    await user.upload(screen.getByLabelText('Scegli backup'), await fileZip(true, { business: { salonName: 'Dal file' } }, {
      files: { f1: metaFoto() },
      voci: { 'cani/C0001 - Fido/profilo.webp': new Uint8Array([1, 2, 3]) },
    }))
    const enabled = await import('../data/firebase/enabled')
    const client = await import('../data/firebase/client')
    vi.spyOn(enabled, 'firebaseEnabled').mockReturnValue(true)
    vi.spyOn(enabled, 'readsLocal').mockReturnValue(false)
    const replace = vi.spyOn(client, 'replaceCloudData').mockResolvedValue(undefined)
    scriviFileRipristino.mockRejectedValue(new Error('file'))
    await user.click(within(await screen.findByRole('dialog', { name: 'Ripristina' })).getByRole('button', { name: 'Ripristina' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Ripristino incompleto, riprova')
    expect(screen.getByRole('dialog', { name: 'Ripristina' })).toBeInTheDocument()
    expect(replace).toHaveBeenCalledOnce()
    expect(scriviCodiciCane).toHaveBeenCalledOnce()
    expect(scriviFileRipristino).toHaveBeenCalledOnce()
  })

  it('se i codici falliscono il foglio resta aperto', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    await user.upload(screen.getByLabelText('Scegli backup'), await fileZip(false, { business: { salonName: 'Dal file' } }))
    const enabled = await import('../data/firebase/enabled')
    const client = await import('../data/firebase/client')
    vi.spyOn(enabled, 'firebaseEnabled').mockReturnValue(true)
    vi.spyOn(enabled, 'readsLocal').mockReturnValue(false)
    const replace = vi.spyOn(client, 'replaceCloudData').mockResolvedValue(undefined)
    scriviCodiciCane.mockRejectedValue(new Error('codici'))
    await user.click(within(await screen.findByRole('dialog', { name: 'Ripristina' })).getByRole('button', { name: 'Ripristina' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Ripristino incompleto, riprova')
    expect(screen.getByRole('dialog', { name: 'Ripristina' })).toBeInTheDocument()
    expect(replace).toHaveBeenCalledOnce()
    expect(scriviCodiciCane).toHaveBeenCalledOnce()
  })

  it('se la sostituzione cloud fallisce i codici non si scrivono', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    await user.upload(screen.getByLabelText('Scegli backup'), await fileZip(false, { business: { salonName: 'Dal file' } }))
    const enabled = await import('../data/firebase/enabled')
    const client = await import('../data/firebase/client')
    vi.spyOn(enabled, 'firebaseEnabled').mockReturnValue(true)
    vi.spyOn(enabled, 'readsLocal').mockReturnValue(false)
    vi.spyOn(client, 'replaceCloudData').mockRejectedValue(new Error('dati'))
    await user.click(within(await screen.findByRole('dialog', { name: 'Ripristina' })).getByRole('button', { name: 'Ripristina' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Ripristino incompleto, riprova')
    expect(screen.getByRole('dialog', { name: 'Ripristina' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Annulla ripristino' })).toBeInTheDocument()
    expect(scriviCodiciCane).not.toHaveBeenCalled()
  })

  it('se il ripristino locale fallisce resta la copia e annulla', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Bobi'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    await user.upload(screen.getByLabelText('Scegli backup'), await fileZip(false, { business: { salonName: 'Dal file' } }))
    const dialog = await screen.findByRole('dialog', { name: 'Ripristina' })
    const backupDoc = await import('../lib/backupDoc')
    vi.spyOn(backupDoc, 'restoreBackup').mockImplementationOnce(() => {
      throw new Error('restore')
    })
    await user.click(within(dialog).getByRole('button', { name: 'Ripristina' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Salvataggio non riuscito')
    expect(screen.getByRole('dialog', { name: 'Ripristina' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Annulla ripristino' })).toBeInTheDocument()
    expect(localStorage.getItem(`groomly.users.${account.uid}.ripristinoSicurezza`)).not.toBeNull()
    await user.click(screen.getByRole('button', { name: 'Annulla ripristino' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Ripristino annullato')
    expect(screen.queryByRole('dialog', { name: 'Ripristina' })).not.toBeInTheDocument()
    expect(localStorage.getItem(`groomly.users.${account.uid}.ripristinoSicurezza`)).toBeNull()
  })

  it('dopo un ripristino locale il pulsante resta riaprendo Impostazioni', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Bobi'))
    const phone = getSettings(account.uid)
    const cani = readJson<Record<string, unknown>>(storageKeys.dogs(account.uid)) ?? {}
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    await user.upload(screen.getByLabelText('Scegli backup'), await fileZip(false, {
      ...phone,
      business: { ...phone.business, salonName: 'Dal file' },
    }, { dogs: cani }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Ripristina' })).getByRole('button', { name: 'Ripristina' }))
    expect(await screen.findByRole('button', { name: 'Annulla ripristino' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Home' }))
    expect(await screen.findByRole('heading', { name: 'Groomly' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Impostazioni' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /Impostazioni/ }))
    await screen.findByRole('heading', { name: 'Impostazioni' })
    expect(await screen.findByRole('button', { name: 'Annulla ripristino' })).toBeInTheDocument()
  })

  it('senza rete non scrive dati né codici', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    await user.upload(screen.getByLabelText('Scegli backup'), await fileZip(false, { business: { salonName: 'Dal file' } }))
    const enabled = await import('../data/firebase/enabled')
    const client = await import('../data/firebase/client')
    vi.spyOn(enabled, 'firebaseEnabled').mockReturnValue(true)
    vi.spyOn(enabled, 'readsLocal').mockReturnValue(false)
    const replace = vi.spyOn(client, 'replaceCloudData').mockResolvedValue(undefined)
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false })
    await user.click(within(await screen.findByRole('dialog', { name: 'Ripristina' })).getByRole('button', { name: 'Ripristina' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Connessione assente')
    expect(replace).not.toHaveBeenCalled()
    expect(scriviCodiciCane).not.toHaveBeenCalled()
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true })
  })

  it('in locale si può annullare il ripristino', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    createDog(account.uid, dog('Bobi'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    expect(screen.queryByRole('button', { name: 'Annulla ripristino' })).not.toBeInTheDocument()
    await user.upload(screen.getByLabelText('Scegli backup'), await fileZip(false, { business: { salonName: 'Dal file' } }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Ripristina' })).getByRole('button', { name: 'Ripristina' }))
    await screen.findByRole('button', { name: 'Annulla ripristino' })
    expect(Object.keys(readJson<Record<string, unknown>>(storageKeys.dogs(account.uid)) ?? {})).toEqual(['a', 'b'])
    await user.click(screen.getByRole('button', { name: 'Annulla ripristino' }))
    await waitFor(() => {
      expect(Object.values(readJson<Record<string, { name?: string }>>(storageKeys.dogs(account.uid)) ?? {}).map((item) => item.name)).toEqual(['Bobi'])
    })
    expect(screen.queryByRole('button', { name: 'Annulla ripristino' })).not.toBeInTheDocument()
    expect(await screen.findByRole('status')).toHaveTextContent('Ripristino annullato')
  })

  it('in cloud la copia precede i dati e l annulla rimette i file', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    const foto = new Uint8Array([1, 2, 3])
    await user.upload(screen.getByLabelText('Scegli backup'), await fileZip(true, { business: { salonName: 'Dal file' } }, {
      files: { f1: metaFoto() },
      voci: { 'cani/C0001 - Fido/profilo.webp': foto },
    }))
    const dialog = await screen.findByRole('dialog', { name: 'Ripristina' })
    const enabled = await import('../data/firebase/enabled')
    const client = await import('../data/firebase/client')
    vi.spyOn(enabled, 'firebaseEnabled').mockReturnValue(true)
    vi.spyOn(enabled, 'readsLocal').mockReturnValue(false)
    const order: string[] = []
    salvaCopiaCloud.mockImplementation(async () => { order.push('copia') })
    vi.spyOn(client, 'replaceCloudData').mockImplementation(async () => { order.push('dati') })
    scriviCodiciCane.mockImplementation(async () => { order.push('codici') })
    scriviFileRipristino.mockImplementation(async () => { order.push('file') })
    await user.click(within(dialog).getByRole('button', { name: 'Ripristina' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Ripristinato')
    expect(order).toEqual(['copia', 'dati', 'codici', 'file'])
  })

  it('se la copia fallisce non scrive i dati', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    await user.upload(screen.getByLabelText('Scegli backup'), await fileZip(false, { business: { salonName: 'Dal file' } }))
    const dialog = await screen.findByRole('dialog', { name: 'Ripristina' })
    const enabled = await import('../data/firebase/enabled')
    const client = await import('../data/firebase/client')
    vi.spyOn(enabled, 'firebaseEnabled').mockReturnValue(true)
    vi.spyOn(enabled, 'readsLocal').mockReturnValue(false)
    salvaCopiaCloud.mockRejectedValue(new Error('copia'))
    const replace = vi.spyOn(client, 'replaceCloudData').mockResolvedValue(undefined)
    await user.click(within(dialog).getByRole('button', { name: 'Ripristina' }))
    expect(await screen.findByText('Copia di sicurezza non riuscita')).toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Ripristina' })).toBeInTheDocument()
  })

  it('in cloud annulla rimette dati, codici e file e toglie gli id assenti', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    await user.upload(screen.getByLabelText('Scegli backup'), await fileZip(false, { business: { salonName: 'Dal file' } }))
    const dialog = await screen.findByRole('dialog', { name: 'Ripristina' })
    const enabled = await import('../data/firebase/enabled')
    const client = await import('../data/firebase/client')
    vi.spyOn(enabled, 'firebaseEnabled').mockReturnValue(true)
    vi.spyOn(enabled, 'readsLocal').mockReturnValue(false)
    salvaCopiaCloud.mockResolvedValue(undefined)
    vi.spyOn(client, 'replaceCloudData').mockResolvedValue(undefined)
    await user.click(within(dialog).getByRole('button', { name: 'Ripristina' }))
    await screen.findByRole('button', { name: 'Annulla ripristino' })
    const order: string[] = []
    vi.mocked(client.replaceCloudData).mockImplementation(async () => { order.push('dati') })
    scriviCodiciCane.mockImplementation(async () => { order.push('codici') })
    scriviFileRipristino.mockImplementation(async () => { order.push('file') })
    eliminaFileDalSalone.mockImplementation(async () => { order.push('assenti') })
    cancellaCopiaCloud.mockImplementation(async () => { order.push('fine') })
    leggiCopiaCloud.mockResolvedValue({
      bundle: { dogs: {}, appointments: {}, services: {}, settings: {} },
      codici: { next: 2, cartella: 'cani', byId: { a: 'C0001' } },
      file: [{ id: 'f1', kind: 'foto', owner: 'dog:a', name: '', mime: 'image/webp', byteSize: 1, createdAt: 1, createdBy: 'u', bytes: new Uint8Array([9]) }],
      assenti: ['nuovo'],
    })
    await user.click(screen.getByRole('button', { name: 'Annulla ripristino' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Ripristino annullato')
    expect(order).toEqual(['dati', 'codici', 'file', 'assenti', 'fine'])
    expect(eliminaFileDalSalone).toHaveBeenCalledWith(['nuovo'])
    expect(screen.queryByRole('button', { name: 'Annulla ripristino' })).not.toBeInTheDocument()
  })

  it('il secondo clic sullo stesso foglio non rifà la copia', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    await user.upload(screen.getByLabelText('Scegli backup'), await fileZip(false, { business: { salonName: 'Dal file' } }))
    const dialog = await screen.findByRole('dialog', { name: 'Ripristina' })
    const enabled = await import('../data/firebase/enabled')
    const client = await import('../data/firebase/client')
    vi.spyOn(enabled, 'firebaseEnabled').mockReturnValue(true)
    vi.spyOn(enabled, 'readsLocal').mockReturnValue(false)
    salvaCopiaCloud.mockResolvedValue(undefined)
    const replace = vi.spyOn(client, 'replaceCloudData').mockRejectedValueOnce(new Error('dati'))
    await user.click(within(dialog).getByRole('button', { name: 'Ripristina' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Ripristino incompleto, riprova')
    expect(salvaCopiaCloud).toHaveBeenCalledOnce()
    replace.mockResolvedValue(undefined)
    await user.click(within(screen.getByRole('dialog', { name: 'Ripristina' })).getByRole('button', { name: 'Ripristina' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Ripristinato')
    expect(salvaCopiaCloud).toHaveBeenCalledOnce()
  })

  it('mostra il conteggio archivio, senza Campi scheda, e apre Tag dei cani', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const ada = createDog(account.uid, dog('Ada'))
    archiveDog(account.uid, ada.id, 'deceduto')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    expect(await screen.findByText('1 in archivio')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Archivio animali/ })).toHaveAttribute('href', '/impostazioni/archivio')
    await user.click(screen.getByRole('button', { name: 'Modifica attività' }))
    const business = screen.getByRole('dialog', { name: 'Attività' })
    expect(within(business).queryByTestId('sheet-grabber')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Chiudi' })).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(screen.queryByRole('dialog', { name: 'Attività' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Campi scheda/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Campi scheda' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tag dei cani/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Tag caratteristiche/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Tag dei cani/ }))
    const tags = screen.getByRole('dialog', { name: 'Tag dei cani' })
    expect(within(tags).getByTestId('sheet-grabber')).toBeInTheDocument()
    expect(within(tags).getByText('Queste parole compaiono quando, sulla scheda di un cane, premi + Tag. Servono per ricordare qualcosa dell’animale, per esempio ipoallergenico. Un tag scritto sulla scheda entra anche qui. Toglierlo da qui non lo cancella dalle schede dove è già messo.')).toBeInTheDocument()
    expect(within(tags).getByLabelText('Tag')).toBeInTheDocument()
    expect(within(tags).queryByLabelText('Strumenti')).not.toBeInTheDocument()
    expect(within(tags).queryByLabelText('Prodotti')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Togli Tagliando' })).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Tag'), 'ipoallergenico')
    await user.click(screen.getByRole('button', { name: 'Aggiungi tag' }))
    expect(getSettings(account.uid).tagSuggestions).toEqual(['ipoallergenico'])
    expect(getSettings(account.uid).toolSuggestions).toEqual([])
    expect(getSettings(account.uid).productSuggestions).toEqual([])
    expect(screen.getByText('1 da proporre sulla scheda')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Togli ipoallergenico' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Togli Tagliando' })).not.toBeInTheDocument()
    await user.click(within(tags).getByRole('button', { name: 'Chiudi' }))
    await user.click(screen.getByRole('link', { name: /Archivio animali/ }))
    expect(await screen.findByRole('heading', { name: 'Archivio' })).toBeInTheDocument()
    expect(screen.getByText('1 in archivio')).toBeInTheDocument()
  }, 15000)

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
    await user.click(screen.getByRole('link', { name: /Impostazioni/ }))
    expect(screen.getByRole('navigation', { name: 'Navigazione principale' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Impostazioni/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    await user.click(screen.getByRole('link', { name: /Notifiche/ }))
    await screen.findByRole('heading', { name: 'Notifiche' })
    await user.click(screen.getByRole('switch', { name: 'Notifica sul telefono' }))
    expect(getSettings(account.uid).monthlyReminder.enabled).toBe(false)
    await user.clear(screen.getByLabelText('Giorni di anticipo'))
    await user.type(screen.getByLabelText('Giorni di anticipo'), '3')
    expect(getSettings(account.uid).monthlyReminder.daysBefore).toBe(3)
    await user.click(screen.getByRole('link', { name: 'Home' }))
    expect(await screen.findByRole('region', { name: 'Mensili da programmare' })).toBeInTheDocument()
    expect(screen.getByText('scadono entro 3 gg')).toBeInTheDocument()
  })

  it('mostra automaticamente le novità al centro senza una riga di controllo', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({
      tag_name: 'v9.0.0',
      body: 'Prima novità',
      assets: [{ name: 'groomly.apk', browser_download_url: 'https://github.com/apk' }],
    }))
    vi.stubGlobal('fetch', fetchImpl)
    try {
      render(<App memory isDev={false} initialPath="/impostazioni" />)
      expect(screen.queryByRole('button', { name: /Controlla aggiornamenti/ })).not.toBeInTheDocument()
      const dialog = await screen.findByRole('dialog', { name: 'Vuoi aggiornare adesso?' })
      expect(dialog.parentElement?.getAttribute('style')).toContain('align-items: center')
      expect(within(dialog).getByText('Prima novità')).toBeInTheDocument()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('in Attività c’è Incassi e report e scrive il giorno del badge', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 17, 9))
    try {
      const account = await createAccount('maria@salone.it', 'segretissimo')
      render(<App memory isDev={false} initialPath="/impostazioni" />)
      expect(await screen.findByRole('link', { name: /Incassi e report/ })).toHaveAttribute('href', '/incassi/report')
      const badge = screen.getByText('NUOVO')
      expect(badge.getAttribute('style')).toContain('font-size: 12px')
      expect(badge.getAttribute('style')).toContain('color: var(--on-pri)')
      expect(badge.getAttribute('style')).toContain('background: var(--pri-solid)')
      expect(getSettings(account.uid).ui.reportBadgeSince).toBe('2026-10-17')
    } finally {
      vi.useRealTimers()
    }
  })

  it('senza una versione nuova non mostra controlli né messaggi', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({
      tag_name: `v${APP_VERSION}`,
      assets: [{ name: 'groomly.apk', browser_download_url: 'https://github.com/apk' }],
    })))
    try {
      render(<App memory isDev={false} initialPath="/impostazioni" />)
      await screen.findByRole('heading', { name: 'Impostazioni' })
      await waitFor(() => expect(fetch).toHaveBeenCalled())
      expect(screen.queryByRole('button', { name: /Controlla aggiornamenti/ })).not.toBeInTheDocument()
      expect(screen.queryByText('Nessun aggiornamento')).not.toBeInTheDocument()
      expect(screen.queryByRole('dialog', { name: 'Vuoi aggiornare adesso?' })).not.toBeInTheDocument()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('collega Google Drive e lo scollega', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    driveLeggi.mockResolvedValue({ collegato: false, email: null })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    expect(screen.getByRole('button', { name: 'Collega Google Drive' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Scollega' })).not.toBeInTheDocument()
    driveCollega.mockResolvedValue({ collegato: true, email: 'roberto@gmail.com' })
    await user.click(screen.getByRole('button', { name: 'Collega Google Drive' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Google Drive collegato')
    const email = screen.getByText('roberto@gmail.com')
    expect(email).toBeInTheDocument()
    expect(email.getAttribute('style') ?? '').toContain('overflow-wrap: anywhere')
    expect(screen.getByRole('button', { name: 'Scollega' })).toBeInTheDocument()
    driveScollega.mockResolvedValue(undefined)
    await user.click(screen.getByRole('button', { name: 'Scollega' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Google Drive scollegato')
    expect(screen.queryByText('roberto@gmail.com')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Collega Google Drive' })).toBeInTheDocument()
  })

  it('all apertura mostra l account gia collegato senza toast', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    driveLeggi.mockResolvedValue({ collegato: true, email: 'roberto@gmail.com' })
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    const email = await screen.findByText('roberto@gmail.com')
    expect(email.getAttribute('style') ?? '').toContain('overflow-wrap: anywhere')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(driveCollega).not.toHaveBeenCalled()
  })

  it('una lettura lenta non cancella il collegamento appena fatto', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    let resolveLeggi: (value: { collegato: boolean; email: string | null }) => void = () => undefined
    driveLeggi.mockImplementation(() => new Promise((resolve) => { resolveLeggi = resolve }))
    driveCollega.mockResolvedValue({ collegato: true, email: 'roberto@gmail.com' })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('button', { name: 'Collega Google Drive' })
    await user.click(screen.getByRole('button', { name: 'Collega Google Drive' }))
    expect(await screen.findByText('roberto@gmail.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scollega' })).toBeInTheDocument()
    resolveLeggi({ collegato: false, email: null })
    await waitFor(() => {
      expect(screen.getByText('roberto@gmail.com')).toBeInTheDocument()
    })
    expect(screen.getByText('roberto@gmail.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scollega' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Collega Google Drive' })).not.toBeInTheDocument()
  })

  it('chiudere il foglio Google non mostra un errore', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('button', { name: 'Collega Google Drive' })
    driveCollega.mockRejectedValue(new Error('annullato'))
    await user.click(screen.getByRole('button', { name: 'Collega Google Drive' }))
    await waitFor(() => expect(driveCollega).toHaveBeenCalledOnce())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Collega Google Drive' })).toBeEnabled()
  })

  it('un collegamento annullato non ignora la lettura gia in corso', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    let resolveLeggi: (value: { collegato: boolean; email: string | null }) => void = () => undefined
    driveLeggi.mockImplementation(() => new Promise((resolve) => { resolveLeggi = resolve }))
    driveCollega.mockRejectedValue(new Error('annullato'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('button', { name: 'Collega Google Drive' })
    await user.click(screen.getByRole('button', { name: 'Collega Google Drive' }))
    await waitFor(() => expect(driveCollega).toHaveBeenCalledOnce())
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    resolveLeggi({ collegato: true, email: 'roberto@gmail.com' })
    expect(await screen.findByText('roberto@gmail.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scollega' })).toBeInTheDocument()
  })

  it('un collegamento fallito resta scollegato', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('button', { name: 'Collega Google Drive' })
    driveCollega.mockRejectedValue(new Error('collegamento'))
    await user.click(screen.getByRole('button', { name: 'Collega Google Drive' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Collegamento Google non riuscito')
    expect(screen.getByRole('button', { name: 'Collega Google Drive' })).toBeInTheDocument()
  })

  it('senza rete non chiama Google', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('button', { name: 'Collega Google Drive' })
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false })
    try {
      await user.click(screen.getByRole('button', { name: 'Collega Google Drive' }))
      expect(await screen.findByRole('status')).toHaveTextContent('Connessione assente')
      expect(driveCollega).not.toHaveBeenCalled()
    } finally {
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true })
    }
  })

  it('dopo Scollega riaprendo Impostazioni resta scollegato', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    driveLeggi.mockResolvedValue({ collegato: true, email: 'roberto@gmail.com' })
    const user = userEvent.setup()
    const view = render(<App memory isDev={false} initialPath="/impostazioni" />)
    expect(await screen.findByText('roberto@gmail.com')).toBeInTheDocument()
    driveScollega.mockResolvedValue(undefined)
    await user.click(screen.getByRole('button', { name: 'Scollega' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Google Drive scollegato')
    const letture = driveLeggi.mock.calls.length
    view.unmount()
    driveLeggi.mockResolvedValue({ collegato: false, email: null })
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    await waitFor(() => expect(driveLeggi.mock.calls.length).toBeGreaterThan(letture))
    expect(screen.getByRole('button', { name: 'Collega Google Drive' })).toBeInTheDocument()
    expect(screen.queryByText('roberto@gmail.com')).not.toBeInTheDocument()
  })

  it('se scollega fallisce l email resta', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    driveLeggi.mockResolvedValue({ collegato: true, email: 'roberto@gmail.com' })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    expect(await screen.findByText('roberto@gmail.com')).toBeInTheDocument()
    driveScollega.mockRejectedValue(new Error('scollega'))
    await user.click(screen.getByRole('button', { name: 'Scollega' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Collegamento Google non riuscito')
    expect(screen.getByText('roberto@gmail.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scollega' })).toBeInTheDocument()
  })

  it('senza rete Scollega non chiama il plugin', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    driveLeggi.mockResolvedValue({ collegato: true, email: 'roberto@gmail.com' })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('button', { name: 'Scollega' })
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false })
    try {
      await user.click(screen.getByRole('button', { name: 'Scollega' }))
      expect(await screen.findByRole('status')).toHaveTextContent('Connessione assente')
      expect(driveScollega).not.toHaveBeenCalled()
    } finally {
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true })
    }
  })

  it('se leggi all apertura fallisce resta Collega senza toast', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    driveLeggi.mockRejectedValue(new Error('collegamento'))
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('heading', { name: 'Impostazioni' })
    await waitFor(() => expect(driveLeggi).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: 'Collega Google Drive' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('invia il backup su Drive quando l account è collegato', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    driveLeggi.mockResolvedValue({ collegato: true, email: 'roberto@gmail.com' })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await user.click(await screen.findByRole('button', { name: 'Invia su Drive' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Backup inviato su Google Drive')
    expect(inviaBackupSuDrive).toHaveBeenCalledOnce()
  })

  it('senza collegamento non mostra Invia su Drive', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('button', { name: 'Collega Google Drive' })
    expect(screen.queryByRole('button', { name: 'Invia su Drive' })).not.toBeInTheDocument()
  })

  it('sul web Invia su Drive dice che serve il telefono', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    driveLeggi.mockResolvedValue({ collegato: true, email: 'roberto@gmail.com' })
    inviaBackupSuDrive.mockRejectedValue(new Error('telefono'))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await user.click(await screen.findByRole('button', { name: 'Invia su Drive' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Il collegamento a Google Drive funziona sul telefono')
  })

  it('senza rete Invia su Drive non parte', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    driveLeggi.mockResolvedValue({ collegato: true, email: 'roberto@gmail.com' })
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    await screen.findByRole('button', { name: 'Invia su Drive' })
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false })
    try {
      await user.click(screen.getByRole('button', { name: 'Invia su Drive' }))
      expect(await screen.findByRole('status')).toHaveTextContent('Connessione assente')
      expect(inviaBackupSuDrive).not.toHaveBeenCalled()
    } finally {
      Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true })
    }
  })
})
