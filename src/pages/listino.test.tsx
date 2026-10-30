// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { getSettings, type PriceFile, type SettingsMain } from '../data/local/settings'
import { ensureServiceSeed, updateService } from '../data/local/services'
import { seedPriceSheet } from '../data/seed/priceSheet'
import { readJson, storageKeys, writeJson } from '../data/local/storage'
import * as photo from '../lib/dogPhoto'

function priceFile(id: string, extra: Partial<PriceFile> = {}): PriceFile {
  return {
    id,
    fileName: `${id}.pdf`,
    mime: 'application/pdf',
    byteSize: 1200,
    uploadedAt: new Date(2026, 0, 15, 12).toISOString(),
    dataUrl: `data:application/pdf;base64,${id}`,
    ...extra,
  }
}

function seedPrice(uid: string, priceList: PriceFile | undefined, history: PriceFile[] = []) {
  const settings = getSettings(uid)
  writeJson(storageKeys.settings(uid), { ...settings, priceList, priceListHistory: history })
}

function fileInput(name: string): HTMLInputElement {
  const input = document.querySelector(`input[aria-label="${name}"]`)
  if (!(input instanceof HTMLInputElement)) throw new Error(name)
  return input
}

describe('listino', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 3, 12, 0, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('la card del listino mostra il nome della toelettatura', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const settings = getSettings(account.uid)
    const priceSheet = seedPriceSheet(settings.business)
    priceSheet.intestazione.titolo = 'TOELETTATURA'
    writeJson(storageKeys.settings(account.uid), {
      ...settings,
      business: { ...settings.business, salonName: 'Canespa' },
      priceSheet,
    })
    render(<App memory isDev={false} initialPath="/listino" />)
    expect(await screen.findByText('Canespa')).toBeInTheDocument()
    expect(screen.queryByText('TOELETTATURA')).not.toBeInTheDocument()
  })

  it('mostra il listino per razza tra i file e i prezzi standard', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPrice(account.uid, priceFile('attuale'))
    render(<App memory isDev={false} initialPath="/listino" />)
    expect(await screen.findByRole('button', { name: 'Aggiungi il tuo listino prezzi' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'attuale.pdf' })).toBeInTheDocument()
    const breed = screen.getByRole('heading', { name: 'Listino per razza' })
    const standard = screen.getByRole('heading', { name: 'Prezzi e tempi standard' })
    expect(breed.compareDocumentPosition(standard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('Tipo Yorkshire')).toBeInTheDocument()
    expect(screen.getByText('TAGLIA PICCOLA')).toBeInTheDocument()
    expect(screen.getByText('TAGLIA MEDIA')).toBeInTheDocument()
    expect(screen.getByText('TAGLIA GRANDE')).toBeInTheDocument()
    const title = screen.getByRole('heading', { name: 'Listino prezzi' })
    const manage = screen.getByRole('button', { name: 'Gestione listino' })
    const prices = screen.getByRole('button', { name: 'Aggiorna prezzi' })
    const share = screen.getByRole('button', { name: 'Stampa e condividi' })
    expect(title.compareDocumentPosition(manage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(manage.compareDocumentPosition(prices) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(prices.compareDocumentPosition(share) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(title.closest('header')?.contains(manage)).toBe(false)
  })

  it('mostra i prezzi attivi e la data dell’ultimo aggiornamento', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/listino" />)
    expect(await screen.findByRole('heading', { name: 'Listino prezzi' })).toBeInTheDocument()
    expect(screen.getByText('Aggiornato 3 ott 2026')).toBeInTheDocument()
    expect(screen.queryByText('In arrivo')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aggiungi il tuo listino prezzi' })).toBeInTheDocument()
    expect(screen.getByText('Nessun file')).toBeInTheDocument()
    const priorita = screen.getByText('I prezzi in scheda cane hanno priorità sul listino.')
    expect(priorita.getAttribute('style')).toContain('background: var(--pri-s)')
    expect(screen.getByRole('columnheader', { name: 'Servizio' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Piccola' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Media' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Grande' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Listino' })).toBeInTheDocument()
    const table = screen.getByRole('columnheader', { name: 'Servizio' }).closest('table')
    expect(table).not.toBeNull()
    expect(table?.getAttribute('style')).toContain('font-size: 14px')
    const bagno = within(table!).getByText('Bagno').closest('tr')
    expect(bagno).not.toBeNull()
    expect(within(bagno!).getByText('30–60 min')).toBeInTheDocument()
    expect(within(bagno!).getByText('€ 20')).toBeInTheDocument()
    expect(within(bagno!).getByText('€ 28')).toBeInTheDocument()
    expect(within(bagno!).getByText('€ 38')).toBeInTheDocument()
    expect(within(bagno!).getAllByRole('cell')).toHaveLength(4)
    const serviceName = within(bagno!).getByText('Bagno')
    expect(serviceName.getAttribute('style')).toContain('overflow-wrap: anywhere')
    expect(serviceName.getAttribute('style')).toContain('white-space: normal')
    expect(serviceName.getAttribute('style')).not.toContain('ellipsis')
    expect(serviceName.getAttribute('style')).not.toContain('nowrap')
    const serviceCell = within(bagno!).getAllByRole('cell')[0]
    expect(serviceCell?.getAttribute('style')).toContain('overflow-wrap: anywhere')
    expect(serviceCell?.getAttribute('style')).toContain('white-space: normal')
    expect(screen.getByText('Gestione nodi').closest('tr')).toBeNull()
    expect(screen.getByText('Servizi aggiuntivi · prezzo unico')).toBeInTheDocument()
    const nodi = screen.getByText('Gestione nodi').closest('li')
    expect(nodi).not.toBeNull()
    expect(within(nodi!).getByText('+20 min')).toBeInTheDocument()
    expect(within(nodi!).getByText('€ 5')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Modifica' })).toHaveAttribute('href', '/impostazioni/servizi')
  })

  it('Aggiungi il tuo listino prezzi sta in cima con i formati sotto e la riga file ha un occhio nel link', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPrice(account.uid, priceFile('attuale'))
    render(<App memory isDev={false} initialPath="/listino" />)
    const add = await screen.findByRole('button', { name: 'Aggiungi il tuo listino prezzi' })
    const link = await screen.findByRole('link', { name: 'attuale.pdf' })
    expect(add.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(add.compareDocumentPosition(screen.getByText('Puoi caricare PDF o JPEG')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(link.querySelector('svg')).not.toBeNull()
  })

  it('un prezzo uguale per tutte le taglie è una sola cella «tutte le taglie»', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    ensureServiceSeed(account.uid)
    updateService(account.uid, 'stripping', { price: { piccola: 5, media: 5, grande: 5 } })
    render(<App memory isDev={false} initialPath="/listino" />)
    const text = await screen.findByText('€ 5 · tutte le taglie')
    const row = text.closest('tr')
    expect(row).not.toBeNull()
    expect(within(row!).getByText('Stripping')).toBeInTheDocument()
    expect(within(row!).getAllByRole('cell')).toHaveLength(2)
    expect(text).toHaveAttribute('colspan', '3')
    expect(screen.getAllByText('€ 5 · tutte le taglie')).toHaveLength(1)
  })

  it('l’intestazione della tabella resta in alto, opaca', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/listino" />)
    const head = await screen.findByRole('columnheader', { name: 'Servizio' })
    expect(head.getAttribute('style')).toContain('position: sticky')
    expect(head.getAttribute('style')).toContain('top: 0')
    expect(head.getAttribute('style')).toContain('background: var(--bg)')
  })

  it('Modifica apre Servizi e durate e Indietro torna a Impostazioni', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino" />)
    await user.click(await screen.findByRole('link', { name: 'Modifica' }))
    expect(await screen.findByRole('heading', { name: 'Servizi e durate' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Indietro' })).toHaveAttribute('href', '/impostazioni')
  })

  it('senza servizi attivi dice Nessun servizio e tiene Modifica', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    for (const service of ensureServiceSeed(account.uid)) {
      updateService(account.uid, service.id, { active: false })
    }
    render(<App memory isDev={false} initialPath="/listino" />)
    expect(await screen.findByText('Nessun servizio')).toBeInTheDocument()
    expect(screen.queryByText(/Aggiornato/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Modifica' })).toHaveAttribute('href', '/impostazioni/servizi')
  })

  it('senza file mostra Nessun file e non mostra In arrivo', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/listino" />)
    expect(await screen.findByText('Nessun file')).toBeInTheDocument()
    expect(screen.queryByText('In arrivo')).not.toBeInTheDocument()
    const input = fileInput('Aggiungi il tuo listino prezzi')
    expect(input).toHaveAttribute('accept', 'application/pdf,image/*,.pdf')
    expect(input).toHaveAttribute('multiple')
    expect(screen.getByRole('button', { name: 'Aggiungi il tuo listino prezzi' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'PDF' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Foto' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sostituisci' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apri' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Elimina' })).not.toBeInTheDocument()
  })

  it('Aggiungi file accoda i file e il cestino toglie solo quello scelto', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPrice(account.uid, priceFile('attuale', { fileName: 'attuale.pdf' }), [priceFile('vecchio', { fileName: 'vecchio.pdf' })])
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino" />)
    expect(await screen.findByRole('link', { name: 'attuale.pdf' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'vecchio.pdf' })).toBeInTheDocument()
    expect(screen.queryByText('Precedente')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apri' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'PDF' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Foto' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sostituisci' })).not.toBeInTheDocument()
    const trash = screen.getByRole('button', { name: 'Elimina attuale.pdf' })
    expect(trash).not.toHaveTextContent('Elimina')
    expect(trash.querySelector('svg')).not.toBeNull()
    await user.upload(fileInput('Aggiungi il tuo listino prezzi'), new File(['/Type /Page /Type /Page'], 'nuovo.pdf', { type: 'application/pdf' }))
    expect(await screen.findByRole('link', { name: 'nuovo.pdf' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'attuale.pdf' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'vecchio.pdf' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Elimina nuovo.pdf' }))
    const dialog = screen.getByRole('dialog', { name: 'Eliminare questo file?' })
    expect(within(dialog).getByText('nuovo.pdf')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Elimina' }).getAttribute('style')).toContain('color: var(--bad)')
    await user.click(within(dialog).getByRole('button', { name: 'Annulla' }))
    expect(screen.queryByRole('dialog', { name: 'Eliminare questo file?' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'nuovo.pdf' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Elimina nuovo.pdf' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Eliminare questo file?' })).getByRole('button', { name: 'Elimina' }))
    expect(screen.queryByText('nuovo.pdf')).not.toBeInTheDocument()
    expect(screen.queryByText('Nessun file')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Elimina attuale.pdf' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Eliminare questo file?' })).getByRole('button', { name: 'Elimina' }))
    expect(screen.queryByText('attuale.pdf')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'vecchio.pdf' })).toBeInTheDocument()
    const stored = readJson<SettingsMain>(storageKeys.settings(account.uid))
    expect(stored?.priceList?.id).toBe('vecchio')
    expect(stored?.priceListHistory).toEqual([])
  })

  it('con un file il nome apre la vista e il sottotitolo è la data del file', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPrice(account.uid, priceFile('attuale', { fileName: 'attuale.pdf' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino" />)
    expect(await screen.findByText('Aggiornato 15 gen 2026')).toBeInTheDocument()
    expect(screen.queryByText('Aggiornato 3 ott 2026')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apri' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sostituisci' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Foto' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'PDF' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'attuale.pdf' }))
    expect(await screen.findByText('File non apribile')).toBeInTheDocument()
    expect(document.querySelector('iframe')).toBeNull()
    expect(screen.getByRole('link', { name: 'Indietro' })).toHaveAttribute('href', '/listino')
  })

  it('Aggiungi file legge le pagine del pdf solo da /Type /Page', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino" />)
    await user.upload(fileInput('Aggiungi il tuo listino prezzi'), new File(['/Type /Pages /Type /Page /Type /Page'], 'listino.pdf', { type: 'application/pdf' }))
    expect(await screen.findByText(/2 pagine/)).toBeInTheDocument()
    const stored = readJson<SettingsMain>(storageKeys.settings(account.uid))
    expect(stored?.priceList?.pageCount).toBe(2)
    expect(stored?.priceList?.mime).toBe('application/pdf')
  })

  it('un pdf senza /Type /Page resta senza conteggio', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino" />)
    await user.upload(fileInput('Aggiungi il tuo listino prezzi'), new File(['/Type /Pages soltanto'], 'listino.pdf', { type: 'application/pdf' }))
    expect(await screen.findByText(/^PDF · /)).toBeInTheDocument()
    expect(screen.queryByText(/pagine/)).not.toBeInTheDocument()
    expect(readJson<SettingsMain>(storageKeys.settings(account.uid))?.priceList?.pageCount).toBeUndefined()
  })

  it('un file oltre 10 MB non entra e lo dice', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPrice(account.uid, priceFile('attuale', { fileName: 'attuale.pdf' }))
    const before = readJson<SettingsMain>(storageKeys.settings(account.uid))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino" />)
    expect(await screen.findByRole('link', { name: 'attuale.pdf' })).toBeInTheDocument()
    const file = new File(['/Type /Page'], 'enorme.pdf', { type: 'application/pdf' })
    Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 })
    await user.upload(fileInput('Aggiungi il tuo listino prezzi'), file)
    expect(await screen.findByText('Il file pesa più di 10 MB. Riduci la scansione e riprova.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'enorme.pdf' })).not.toBeInTheDocument()
    const stored = readJson<SettingsMain>(storageKeys.settings(account.uid))
    expect(stored?.priceList).toEqual(before?.priceList)
    expect(stored?.priceListHistory).toEqual(before?.priceListHistory)
  })

  it('una foto del listino che resta oltre 10 MB non entra e lo dice', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const spy = vi.spyOn(photo, 'prepareListinoPhoto').mockResolvedValue(`data:image/jpeg;base64,${'A'.repeat(14 * 1024 * 1024)}`)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino" />)
    await user.upload(fileInput('Aggiungi il tuo listino prezzi'), new File(['png'], 'scatto.png', { type: 'image/png' }))
    expect(await screen.findByText('Il file pesa più di 10 MB. Riduci la scansione e riprova.')).toBeInTheDocument()
    expect(screen.getByText('Nessun file')).toBeInTheDocument()
    expect(readJson<SettingsMain>(storageKeys.settings(account.uid))?.priceList).toBeUndefined()
    spy.mockRestore()
  })

  it('una foto grande in origine entra se ridotta sta sotto 10 MB', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const spy = vi.spyOn(photo, 'prepareListinoPhoto').mockResolvedValue('data:image/jpeg;base64,abc')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino" />)
    const file = new File(['png'], 'scatto.png', { type: 'image/png' })
    Object.defineProperty(file, 'size', { value: 12 * 1024 * 1024 })
    await user.upload(fileInput('Aggiungi il tuo listino prezzi'), file)
    expect(await screen.findByText(/Immagine/)).toBeInTheDocument()
    expect(readJson<SettingsMain>(storageKeys.settings(account.uid))?.priceList?.dataUrl).toBe('data:image/jpeg;base64,abc')
    spy.mockRestore()
  })

  it('Foto del listino resta ad alta risoluzione e non usa il ritratto del cane', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const spy = vi.spyOn(photo, 'prepareListinoPhoto').mockResolvedValue('data:image/jpeg;base64,abc')
    const dog = vi.spyOn(photo, 'prepareDogPhoto')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino" />)
    await user.upload(fileInput('Aggiungi il tuo listino prezzi'), new File(['png'], 'scatto.png', { type: 'image/png' }))
    expect(await screen.findByText(/Immagine/)).toBeInTheDocument()
    const stored = readJson<SettingsMain>(storageKeys.settings(account.uid))
    expect(spy).toHaveBeenCalled()
    expect(dog).not.toHaveBeenCalled()
    expect(stored?.priceList?.mime).toBe('image/jpeg')
    expect(stored?.priceList?.dataUrl).toBe('data:image/jpeg;base64,abc')
    spy.mockRestore()
    dog.mockRestore()
  })

  it('Aggiungi file tiene la foto e il pdf insieme, senza sostituire', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const spy = vi.spyOn(photo, 'prepareListinoPhoto').mockResolvedValue('data:image/jpeg;base64,menu')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino" />)
    await user.upload(fileInput('Aggiungi il tuo listino prezzi'), new File(['png'], 'menu.png', { type: 'image/png' }))
    expect(await screen.findByText(/Immagine/)).toBeInTheDocument()
    expect(spy).toHaveBeenCalled()
    expect(readJson<SettingsMain>(storageKeys.settings(account.uid))?.priceList?.dataUrl).toBe('data:image/jpeg;base64,menu')
    spy.mockRestore()
    await user.upload(fileInput('Aggiungi il tuo listino prezzi'), new File(['/Type /Page'], 'listino.pdf', { type: 'application/pdf' }))
    expect(await screen.findByRole('link', { name: 'listino.pdf' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'menu.png' })).toBeInTheDocument()
    const stored = readJson<SettingsMain>(storageKeys.settings(account.uid))
    expect(stored?.priceList?.fileName).toBe('menu.png')
    expect(stored?.priceList?.mime).toBe('image/jpeg')
    expect(stored?.priceListHistory[0]?.mime).toBe('application/pdf')
    expect(stored?.priceListHistory[0]?.dataUrl.startsWith('data:application/pdf;base64,')).toBe(true)
  })

  it('un file già in elenco si apre dal nome e resta al suo posto', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPrice(account.uid, priceFile('current', { fileName: 'attuale.pdf', dataUrl: 'data:application/pdf;base64,current' }), [priceFile('old', { fileName: 'vecchio.pdf', dataUrl: 'data:application/pdf;base64,old' })])
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino" />)
    const precedente = await screen.findByRole('link', { name: 'vecchio.pdf' })
    expect(screen.queryByText('Precedente')).not.toBeInTheDocument()
    expect(precedente.getAttribute('style') ?? '').not.toContain('opacity: 0.72')
    await user.click(precedente)
    expect(await screen.findByText('File non apribile')).toBeInTheDocument()
    expect(document.querySelector('iframe')).toBeNull()
    expect(readJson<SettingsMain>(storageKeys.settings(account.uid))?.priceList?.id).toBe('current')
  })

  it('si rinomina un file senza cambiare gli altri', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPrice(account.uid, priceFile('attuale', { fileName: 'attuale.pdf' }), [priceFile('vecchio', { fileName: 'vecchio.pdf' })])
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino" />)
    await user.click(await screen.findByRole('button', { name: 'Rinomina vecchio.pdf' }))
    const field = screen.getByRole('textbox', { name: 'Nome di vecchio.pdf' })
    await user.clear(field)
    await user.type(field, 'Listino estate{Enter}')
    expect(await screen.findByRole('link', { name: 'Listino estate' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'attuale.pdf' })).toBeInTheDocument()
    const stored = readJson<SettingsMain>(storageKeys.settings(account.uid))
    expect(stored?.priceList?.fileName).toBe('attuale.pdf')
    expect(stored?.priceListHistory[0]?.fileName).toBe('Listino estate')
  })

  it('Aggiungi file carica più file in una volta', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const spy = vi.spyOn(photo, 'prepareListinoPhoto').mockResolvedValue('data:image/jpeg;base64,menu')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino" />)
    await user.upload(fileInput('Aggiungi il tuo listino prezzi'), [
      new File(['/Type /Page'], 'listino.pdf', { type: 'application/pdf' }),
      new File(['png'], 'menu.png', { type: 'image/png' }),
    ])
    expect(await screen.findByRole('link', { name: 'listino.pdf' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'menu.png' })).toBeInTheDocument()
    const stored = readJson<SettingsMain>(storageKeys.settings(account.uid))
    expect(stored?.priceList?.fileName).toBe('listino.pdf')
    expect(stored?.priceList?.mime).toBe('application/pdf')
    expect(stored?.priceListHistory.map((item) => item.fileName)).toEqual(['menu.png'])
    expect(stored?.priceListHistory[0]?.mime).toBe('image/jpeg')
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('la vista di un’immagine mostra img', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPrice(account.uid, priceFile('foto', { fileName: 'foto.jpg', mime: 'image/jpeg', dataUrl: 'data:image/jpeg;base64,abc' }))
    render(<App memory isDev={false} initialPath="/listino/vedi" />)
    expect(await screen.findByRole('img', { name: 'foto.jpg' })).toHaveAttribute('src', 'data:image/jpeg;base64,abc')
    expect(screen.queryByTitle('Listino')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Indietro' })).toHaveAttribute('href', '/listino')
  })

  it('se la scrittura fallisce riprova senza la versione più vecchia', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPrice(account.uid, priceFile('current'), [priceFile('mid'), priceFile('oldest')])
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino" />)
    const real = localStorage.setItem.bind(localStorage)
    let settingsWrites = 0
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (String(key).endsWith('.settings')) {
        settingsWrites += 1
        if (settingsWrites === 1) throw new Error('quota')
      }
      return real(key, value)
    })
    await user.upload(fileInput('Aggiungi il tuo listino prezzi'), new File(['/Type /Page'], 'nuovo.pdf', { type: 'application/pdf' }))
    spy.mockRestore()
    const stored = readJson<SettingsMain>(storageKeys.settings(account.uid))
    expect(stored?.priceList?.fileName).toBe('current.pdf')
    expect(stored?.priceListHistory.map((item) => item.fileName)).toEqual(['mid.pdf', 'nuovo.pdf'])
    expect(settingsWrites).toBe(2)
  })

  it('al secondo fallimento torna allo stato precedente e avvisa', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPrice(account.uid, priceFile('current', { fileName: 'attuale.pdf' }), [priceFile('oldest')])
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino" />)
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    await user.upload(fileInput('Aggiungi il tuo listino prezzi'), new File(['/Type /Page'], 'nuovo.pdf', { type: 'application/pdf' }))
    spy.mockRestore()
    expect(await screen.findByRole('status')).toHaveTextContent('Salvataggio non riuscito')
    expect(screen.getByText('attuale.pdf')).toBeInTheDocument()
    expect(screen.queryByText('nuovo.pdf')).not.toBeInTheDocument()
    expect(readJson<SettingsMain>(storageKeys.settings(account.uid))?.priceList?.id).toBe('current')
  })

  it('una razza di quattro parole resta tutta nel documento', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const settings = getSettings(account.uid)
    const sheet = seedPriceSheet(settings.business)
    const breed = sheet.razze.find((item) => item.id === 'york')
    if (!breed) throw new Error('razza')
    breed.nome = 'Pastore Belga Pelo Lungo'
    writeJson(storageKeys.settings(account.uid), { ...settings, priceSheet: sheet })
    render(<App memory isDev={false} initialPath="/listino" />)
    const name = await screen.findByText('Tipo Pastore Belga Pelo Lungo')
    expect(name.textContent).toBe('Tipo Pastore Belga Pelo Lungo')
    const style = name.getAttribute('style') ?? ''
    expect(style).toContain('white-space: normal')
    expect(style).toContain('overflow-wrap: anywhere')
    expect(style).not.toContain('ellipsis')
    expect(style).not.toContain('nowrap')
  })

  it('la home dice PDF · apri quando il listino c’è', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPrice(account.uid, priceFile('home'))
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByText('PDF · apri')).toBeInTheDocument()
  })

  it('in inglese titolo, vuoto e pulsante, e il nome del file resta', async () => {
    localStorage.setItem('groomly.lingua', 'en')
    const account = await createAccount('maria-en@salone.it', 'segretissimo')
    seedPrice(account.uid, priceFile('estate', { fileName: 'Listino estate.pdf' }))
    render(<App memory isDev={false} initialPath="/listino" />)
    expect(await screen.findByRole('heading', { name: 'Price list' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add your price list' })).toBeInTheDocument()
    expect(screen.getByText('Listino estate.pdf')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Listino prezzi' })).not.toBeInTheDocument()
  })
})
