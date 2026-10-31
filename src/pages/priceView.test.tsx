// @vitest-environment happy-dom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useEffect } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { Providers } from '../app/providers'
import { useSettings } from '../hooks/useSettings'
import { PriceViewPage } from './PriceViewPage'
import { createAccount } from '../data/local/auth'
import { getSettings, type PriceFile } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'

vi.mock('../lib/openDocument', () => ({ openPdf: vi.fn(() => Promise.resolve()), openPdfBlob: vi.fn(() => Promise.resolve()) }))
vi.mock('../hooks/useFileSrc', async (importOriginal) => ({
  ...await importOriginal<typeof import('../hooks/useFileSrc')>(),
  readFileBlob: vi.fn(() => Promise.resolve(new Blob(['%PDF'], { type: 'application/pdf' }))),
}))

const { readStoredFile } = vi.hoisted(() => ({
  readStoredFile: vi.fn(async (_ref: string, _variant: 'thumb' | 'full') => ({ bytes: new Uint8Array([1, 2, 3]), mime: 'image/webp' })),
}))
vi.mock('../data/firebase/client', () => ({ readStoredFile }))

import { readFileBlob } from '../hooks/useFileSrc'
import { openPdf, openPdfBlob } from '../lib/openDocument'

function priceFile(extra: Partial<PriceFile> = {}): PriceFile {
  return {
    id: 'listino',
    fileName: 'listino.jpg',
    mime: 'image/jpeg',
    byteSize: 1200,
    uploadedAt: new Date(2026, 0, 15, 12).toISOString(),
    dataUrl: 'https://files.example/listino.jpg',
    ...extra,
  }
}

function seedPrice(uid: string, priceList: PriceFile) {
  const settings = getSettings(uid)
  writeJson(storageKeys.settings(uid), { ...settings, priceList, priceListHistory: [] })
}

function listinoHeaderLogo() {
  const title = screen.getByRole('heading', { name: 'Listino' })
  return within(title.closest('header')!).getByRole('img', { name: 'Groomly' })
}

function PriceViewWithSettingsBump({ uid, bump }: { uid: string; bump: number }) {
  const { save } = useSettings()
  useEffect(() => {
    if (bump === 0) return
    const settings = getSettings(uid)
    const priceList = settings.priceList
    if (!priceList) return
    save({ ...settings, priceList: { ...priceList } })
  }, [bump, save, uid])
  return <PriceViewPage />
}

describe('vista listino', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(openPdf).mockClear()
    vi.mocked(openPdfBlob).mockClear()
    vi.mocked(readFileBlob).mockClear()
  })

  it('un’immagine salvata in files mostra Apertura… e poi il blob', async () => {
    const original = URL.createObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:listino')
    let release: (value: { bytes: Uint8Array<ArrayBuffer>; mime: string }) => void = () => undefined
    readStoredFile.mockImplementationOnce(() => new Promise((resolve) => { release = resolve }))
    try {
      const account = await createAccount('maria@salone.it', 'segretissimo')
      seedPrice(account.uid, priceFile({ dataUrl: 'file:img1' }))
      render(<App memory isDev={false} initialPath="/listino/vedi" />)
      expect(await screen.findByText('Apertura…')).toBeInTheDocument()
      await waitFor(() => expect(readStoredFile).toHaveBeenCalled())
      release({ bytes: new Uint8Array([1, 2, 3]), mime: 'image/webp' })
      expect(listinoHeaderLogo()).toHaveAttribute('height', '44')
      expect(await screen.findByRole('img', { name: 'listino.jpg' })).toHaveAttribute('src', 'blob:listino')
      expect(readStoredFile).toHaveBeenCalledWith('file:img1', 'full')
    } finally {
      URL.createObjectURL = original
    }
  })

  it('un’immagine salvata in files che non si legge dice File non apribile', async () => {
    readStoredFile.mockRejectedValueOnce(new Error('File non apribile'))
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPrice(account.uid, priceFile({ dataUrl: 'file:img2' }))
    render(<App memory isDev={false} initialPath="/listino/vedi" />)
    expect(await screen.findByText('File non apribile')).toBeInTheDocument()
    expect(listinoHeaderLogo()).toHaveAttribute('height', '44')
    expect(screen.queryByRole('img', { name: 'listino.jpg' })).toBeNull()
  })

  it('un pdf salvato in files si legge e si apre con openPdfBlob', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPrice(account.uid, priceFile({ fileName: 'listino.pdf', mime: 'application/pdf', dataUrl: 'file:pdf1' }))
    render(<App memory isDev={false} initialPath="/listino/vedi" />)
    await screen.findByRole('heading', { name: 'Listino' })
    await waitFor(() => expect(openPdfBlob).toHaveBeenCalledWith(expect.any(Blob), 'listino.pdf'))
    expect(readFileBlob).toHaveBeenCalledWith('file:pdf1')
    expect(openPdf).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Apri' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Apri' }))
    await waitFor(() => expect(openPdfBlob).toHaveBeenCalledTimes(2))
    expect(openPdfBlob).toHaveBeenLastCalledWith(expect.any(Blob), 'listino.pdf')
  })

  it('un pdf salvato in files che non si legge dice File non apribile', async () => {
    vi.mocked(readFileBlob).mockRejectedValueOnce(new Error('File non apribile'))
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPrice(account.uid, priceFile({ fileName: 'listino.pdf', mime: 'application/pdf', dataUrl: 'file:pdf2' }))
    render(<App memory isDev={false} initialPath="/listino/vedi" />)
    expect(await screen.findByText('File non apribile')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apri' })).toBeInTheDocument()
    expect(openPdfBlob).not.toHaveBeenCalled()
  })

  it('una jpeg è un’immagine e non un iframe', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPrice(account.uid, priceFile())
    render(<App memory isDev={false} initialPath="/listino/vedi" />)
    expect(listinoHeaderLogo()).toHaveAttribute('height', '44')
    const img = await screen.findByRole('img', { name: 'listino.jpg' })
    expect(img).toHaveAttribute('src', 'https://files.example/listino.jpg')
    expect(img.closest('button')).toHaveStyle({ touchAction: 'none' })
    expect(document.querySelector('iframe')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Apri' })).not.toBeInTheDocument()
  })

  it('un pdf chiama openPdf e non usa un iframe', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPrice(account.uid, priceFile({
      fileName: 'listino.pdf',
      mime: 'application/pdf',
      dataUrl: 'https://files.example/listino.pdf',
    }))
    render(<App memory isDev={false} initialPath="/listino/vedi" />)
    await screen.findByRole('heading', { name: 'Listino' })
    expect(openPdf).toHaveBeenCalledWith('https://files.example/listino.pdf')
    expect(document.querySelector('iframe')).toBeNull()
    expect(screen.getByRole('button', { name: 'Apri' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Apri' }))
    await waitFor(() => expect(openPdf).toHaveBeenCalledTimes(2))
    expect(openPdf).toHaveBeenLastCalledWith('https://files.example/listino.pdf')
  })

  it('un pdf non si riapre se le impostazioni cambiano con lo stesso url', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    const pdf = priceFile({
      fileName: 'listino.pdf',
      mime: 'application/pdf',
      dataUrl: 'https://files.example/listino.pdf',
    })
    seedPrice(account.uid, pdf)
    const { rerender } = render(
      <Providers>
        <MemoryRouter initialEntries={['/listino/vedi']}>
          <Routes>
            <Route path="/listino/vedi" element={<PriceViewWithSettingsBump uid={account.uid} bump={0} />} />
          </Routes>
        </MemoryRouter>
      </Providers>,
    )
    await screen.findByRole('heading', { name: 'Listino' })
    expect(openPdf).toHaveBeenCalledTimes(1)
    rerender(
      <Providers>
        <MemoryRouter initialEntries={['/listino/vedi']}>
          <Routes>
            <Route path="/listino/vedi" element={<PriceViewWithSettingsBump uid={account.uid} bump={1} />} />
          </Routes>
        </MemoryRouter>
      </Providers>,
    )
    await screen.findByText('listino.pdf')
    expect(openPdf).toHaveBeenCalledTimes(1)
  })

  it('uno zip dice File non apribile e non chiama openPdf', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPrice(account.uid, priceFile({
      fileName: 'listino.zip',
      mime: 'application/zip',
      dataUrl: 'https://files.example/listino.zip',
    }))
    render(<App memory isDev={false} initialPath="/listino/vedi" />)
    expect(await screen.findByText('File non apribile')).toBeInTheDocument()
    expect(openPdf).not.toHaveBeenCalled()
  })

  it('un’immagine rotta dice File non apribile', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPrice(account.uid, priceFile())
    render(<App memory isDev={false} initialPath="/listino/vedi" />)
    expect(listinoHeaderLogo()).toHaveAttribute('height', '44')
    fireEvent.error(await screen.findByRole('img', { name: 'listino.jpg' }))
    expect(await screen.findByText('File non apribile')).toBeInTheDocument()
  })
})
