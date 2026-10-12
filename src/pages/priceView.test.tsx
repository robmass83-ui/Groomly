// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { getSettings, type PriceFile } from '../data/local/settings'
import { storageKeys, writeJson } from '../data/local/storage'

vi.mock('../lib/openDocument', () => ({ openPdf: vi.fn(() => Promise.resolve()) }))

import { openPdf } from '../lib/openDocument'

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

describe('vista listino', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(openPdf).mockClear()
  })

  it('una jpeg è un’immagine e non un iframe', async () => {
    const account = await createAccount('maria@salone.it', 'segretissimo')
    seedPrice(account.uid, priceFile())
    render(<App memory isDev={false} initialPath="/listino/vedi" />)
    expect(await screen.findByRole('img')).toHaveAttribute('src', 'https://files.example/listino.jpg')
    expect(document.querySelector('iframe')).toBeNull()
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
    fireEvent.error(await screen.findByRole('img'))
    expect(await screen.findByText('File non apribile')).toBeInTheDocument()
  })
})
