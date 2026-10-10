// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { getSettings, type PriceFile, type SettingsMain } from '../data/local/settings'
import { ensureServiceSeed, updateService } from '../data/local/services'
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

  it('mostra i prezzi attivi e la data dell’ultimo aggiornamento', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/listino" />)
    expect(await screen.findByRole('heading', { name: 'Listino prezzi' })).toBeInTheDocument()
    expect(screen.getByText('Aggiornato 3 ott 2026')).toBeInTheDocument()
    expect(screen.queryByText('In arrivo')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sostituisci' })).toBeInTheDocument()
    expect(screen.getByText('Nessun file')).toBeInTheDocument()
    const priorita = screen.getByText('I prezzi in scheda cane hanno priorità sul listino.')
    expect(priorita.getAttribute('style')).toContain('background: var(--pri-s)')
    expect(screen.getByRole('columnheader', { name: 'Servizio' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Piccola' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Media' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Grande' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Listino' })).toBeInTheDocument()
    const bagno = screen.getByText('Bagno').closest('tr')
    expect(bagno).not.toBeNull()
    expect(within(bagno!).getByText('30–60m')).toBeInTheDocument()
    expect(within(bagno!).getByText('€ 20')).toBeInTheDocument()
    expect(within(bagno!).getByText('€ 28')).toBeInTheDocument()
    expect(within(bagno!).getByText('€ 38')).toBeInTheDocument()
    expect(within(bagno!).getAllByRole('cell')).toHaveLength(4)
    expect(screen.getByText('Gestione nodi').closest('tr')).toBeNull()
    expect(screen.getByText('Servizi aggiuntivi · prezzo unico')).toBeInTheDocument()
    const nodi = screen.getByText('Gestione nodi').closest('li')
    expect(nodi).not.toBeNull()
    expect(within(nodi!).getByText('+20m')).toBeInTheDocument()
    expect(within(nodi!).getByText('€ 5')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Modifica' })).toHaveAttribute('href', '/impostazioni/servizi')
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
    expect(fileInput('Sostituisci')).toHaveAttribute('accept', 'application/pdf,image/*')
  })

  it('con un file il sottotitolo è la data del file e Apri apre la vista', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPrice(account.uid, priceFile('attuale', { fileName: 'attuale.pdf' }))
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino" />)
    expect(await screen.findByText('Aggiornato 15 gen 2026')).toBeInTheDocument()
    expect(screen.queryByText('Aggiornato 3 ott 2026')).not.toBeInTheDocument()
    const fileName = screen.getByText('attuale.pdf')
    let fileCard: HTMLElement | null = fileName
    while (fileCard && !(fileCard.getAttribute('style') ?? '').includes('background: var(--card)')) {
      fileCard = fileCard.parentElement
    }
    expect(fileCard).not.toBeNull()
    expect(within(fileCard!).getByRole('link', { name: 'Apri' })).toBeInTheDocument()
    expect(within(fileCard!).getByRole('button', { name: 'Sostituisci' })).toBeInTheDocument()
    expect(within(fileCard!).getByRole('button', { name: 'Foto' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Apri' })).toHaveAttribute('href', '/listino/vedi')
    await user.click(screen.getByRole('link', { name: 'Apri' }))
    expect(await screen.findByTitle('Listino')).toHaveAttribute('src', 'data:application/pdf;base64,attuale')
    expect(screen.getByRole('link', { name: 'Indietro' })).toHaveAttribute('href', '/listino')
  })

  it('Sostituisci legge le pagine del pdf solo da /Type /Page', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino" />)
    await user.upload(fileInput('Sostituisci'), new File(['/Type /Pages /Type /Page /Type /Page'], 'listino.pdf', { type: 'application/pdf' }))
    expect(await screen.findByText(/2 pagine/)).toBeInTheDocument()
    const stored = readJson<SettingsMain>(storageKeys.settings(account.uid))
    expect(stored?.priceList?.pageCount).toBe(2)
    expect(stored?.priceList?.mime).toBe('application/pdf')
  })

  it('un pdf senza /Type /Page resta senza conteggio', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino" />)
    await user.upload(fileInput('Sostituisci'), new File(['/Type /Pages soltanto'], 'listino.pdf', { type: 'application/pdf' }))
    expect(await screen.findByText(/^PDF · /)).toBeInTheDocument()
    expect(screen.queryByText(/pagine/)).not.toBeInTheDocument()
    expect(readJson<SettingsMain>(storageKeys.settings(account.uid))?.priceList?.pageCount).toBeUndefined()
  })

  it('Foto passa da prepareDogPhoto e salva image/jpeg', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const spy = vi.spyOn(photo, 'prepareDogPhoto').mockResolvedValue('data:image/jpeg;base64,abc')
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino" />)
    await user.upload(fileInput('Foto'), new File(['png'], 'scatto.png', { type: 'image/png' }))
    expect(await screen.findByText(/Immagine/)).toBeInTheDocument()
    const stored = readJson<SettingsMain>(storageKeys.settings(account.uid))
    expect(spy).toHaveBeenCalled()
    expect(stored?.priceList?.mime).toBe('image/jpeg')
    expect(stored?.priceList?.dataUrl).toBe('data:image/jpeg;base64,abc')
    spy.mockRestore()
  })

  it('una versione precedente si apre e non diventa quella attuale', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPrice(account.uid, priceFile('current', { fileName: 'attuale.pdf', dataUrl: 'data:application/pdf;base64,current' }), [priceFile('old', { fileName: 'vecchio.pdf', dataUrl: 'data:application/pdf;base64,old' })])
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/listino" />)
    const precedente = await screen.findByRole('link', { name: /vecchio\.pdf/ })
    expect(precedente).toHaveTextContent('Precedente')
    const previousRow = precedente.closest('[style*="opacity"]') ?? precedente
    expect(previousRow.getAttribute('style')).toContain('opacity: 0.72')
    await user.click(precedente)
    expect(await screen.findByTitle('Listino')).toHaveAttribute('src', 'data:application/pdf;base64,old')
    expect(readJson<SettingsMain>(storageKeys.settings(account.uid))?.priceList?.id).toBe('current')
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
    await user.upload(fileInput('Sostituisci'), new File(['/Type /Page'], 'nuovo.pdf', { type: 'application/pdf' }))
    spy.mockRestore()
    const stored = readJson<SettingsMain>(storageKeys.settings(account.uid))
    expect(stored?.priceList?.fileName).toBe('nuovo.pdf')
    expect(stored?.priceListHistory.map((item) => item.id)).toEqual(['current', 'mid'])
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
    await user.upload(fileInput('Sostituisci'), new File(['/Type /Page'], 'nuovo.pdf', { type: 'application/pdf' }))
    spy.mockRestore()
    expect(await screen.findByRole('status')).toHaveTextContent('Salvataggio non riuscito')
    expect(screen.getByText('attuale.pdf')).toBeInTheDocument()
    expect(screen.queryByText('nuovo.pdf')).not.toBeInTheDocument()
    expect(readJson<SettingsMain>(storageKeys.settings(account.uid))?.priceList?.id).toBe('current')
  })

  it('la home dice PDF · apri quando il listino c’è', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPrice(account.uid, priceFile('home'))
    render(<App memory isDev={false} initialPath="/" />)
    expect(await screen.findByText('PDF · apri')).toBeInTheDocument()
  })
})
