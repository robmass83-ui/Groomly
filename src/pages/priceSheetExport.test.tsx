// @vitest-environment happy-dom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { share, writeFile, renderSheetJpegs, openPdfBlob, addImage, setProperties, addPage, output, jsPDF, paperPages } = vi.hoisted(() => ({
  share: vi.fn(async () => undefined),
  writeFile: vi.fn(async () => ({ uri: 'file:///cache/Listino_I_Pelosetti_A4.pdf' })),
  renderSheetJpegs: vi.fn(async () => ['data:image/jpeg;base64,QQ==']),
  openPdfBlob: vi.fn(async () => undefined),
  addImage: vi.fn(),
  setProperties: vi.fn(),
  addPage: vi.fn(),
  output: vi.fn(() => new Blob(['%PDF'], { type: 'application/pdf' })),
  jsPDF: vi.fn(),
  paperPages: { value: '1' as '1' | '2' },
}))

jsPDF.mockImplementation(function JsPdfMock() {
  return { addImage, setProperties, addPage, output }
})

vi.mock('jspdf', () => ({ jsPDF }))
vi.mock('@capacitor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capacitor/core')>()
  return { ...actual, Capacitor: { ...actual.Capacitor, isNativePlatform: () => true } }
})
vi.mock('@capacitor/app', () => ({
  App: { addListener: vi.fn(async () => ({ remove: vi.fn() })), exitApp: vi.fn() },
}))
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    addListener: vi.fn(async () => ({ remove: vi.fn() })),
    cancel: vi.fn(),
    createChannel: vi.fn(),
    schedule: vi.fn(),
  },
}))
vi.mock('@capacitor/share', () => ({ Share: { share } }))
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE', Documents: 'DOCUMENTS' },
  Filesystem: { writeFile },
}))
vi.mock('../lib/openDocument', () => ({
  openPdf: vi.fn(async () => undefined),
  openPdfBlob,
}))
vi.mock('../lib/priceSheetExport', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/priceSheetExport')>()
  return { ...actual, renderSheetJpegs }
})
vi.mock('../components/priceSheet/PriceSheetPaper', () => ({
  PriceSheetPaper: () => (
    <div data-pages={paperPages.value} data-fit-ok="true" className="fly" />
  ),
}))

import { App } from '../app/App'
import { createAccount } from '../data/local/auth'

describe('stampa e condividi', () => {
  beforeEach(() => {
    localStorage.clear()
    paperPages.value = '1'
    share.mockClear()
    writeFile.mockClear()
    writeFile.mockImplementation(async () => ({ uri: 'file:///cache/Listino_I_Pelosetti_A4.pdf' }))
    renderSheetJpegs.mockClear()
    renderSheetJpegs.mockImplementation(async () => ['data:image/jpeg;base64,QQ=='])
    openPdfBlob.mockClear()
  })

  it('mostra formato, tipo, switch e i tre bottoni', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/listino/stampa" />)
    expect(await screen.findByRole('heading', { name: 'Stampa e condividi' })).toBeInTheDocument()
    expect(screen.getByText('A4')).toBeInTheDocument()
    expect(screen.getByText('A3')).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()
    expect(screen.getByText('JPEG (immagine)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Stampa' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Scarica' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Condividi' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Scrivi "a partire da" sui prezzi' })).toBeInTheDocument()
  })

  it('Condividi chiama Share.share con title Listino prezzi e un file', async () => {
    const user = userEvent.setup()
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/listino/stampa" />)
    await screen.findByRole('heading', { name: 'Stampa e condividi' })
    await user.click(screen.getByRole('button', { name: 'Condividi' }))
    await waitFor(() => expect(share).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Listino prezzi',
      files: [expect.any(String)],
    })))
    expect(writeFile).toHaveBeenCalledWith(expect.objectContaining({ directory: 'CACHE' }))
  })

  it('se Documents rifiuta, Scarica chiama Share.share e il toast è Scegli dove salvarlo', async () => {
    const user = userEvent.setup()
    writeFile.mockImplementation(async (options: { directory: string }) => {
      if (options.directory === 'DOCUMENTS') throw new Error('denied')
      return { uri: 'file:///cache/Listino_I_Pelosetti_A4.pdf' }
    })
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/listino/stampa" />)
    await screen.findByRole('heading', { name: 'Stampa e condividi' })
    await user.click(screen.getByRole('button', { name: 'Scarica' }))
    expect(await screen.findByText('Scegli dove salvarlo')).toBeInTheDocument()
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: 'Listino prezzi' }))
  })

  it('se Documents riesce il toast è Salvato in Documenti/Groomly', async () => {
    const user = userEvent.setup()
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/listino/stampa" />)
    await screen.findByRole('heading', { name: 'Stampa e condividi' })
    await user.click(screen.getByRole('button', { name: 'Scarica' }))
    expect(await screen.findByText('Salvato in Documenti/Groomly')).toBeInTheDocument()
    expect(writeFile).toHaveBeenCalledWith(expect.objectContaining({ directory: 'DOCUMENTS' }))
    expect(share).not.toHaveBeenCalled()
  })

  it('Stampa chiama openPdfBlob', async () => {
    const user = userEvent.setup()
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/listino/stampa" />)
    await screen.findByRole('heading', { name: 'Stampa e condividi' })
    await user.click(screen.getByRole('button', { name: 'Stampa' }))
    await waitFor(() => expect(openPdfBlob).toHaveBeenCalledWith(expect.any(Blob), expect.stringMatching(/\.pdf$/)))
  })

  it('durante la generazione i tre bottoni sono disabilitati', async () => {
    const user = userEvent.setup()
    let release!: (value: string[]) => void
    renderSheetJpegs.mockImplementationOnce(() => new Promise((resolve) => {
      release = resolve
    }))
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/listino/stampa" />)
    await screen.findByRole('heading', { name: 'Stampa e condividi' })
    await user.click(screen.getByRole('button', { name: 'Condividi' }))
    expect(screen.getByRole('button', { name: 'Stampa' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Scarica' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Condividi' })).toBeDisabled()
    release(['data:image/jpeg;base64,QQ=='])
    await waitFor(() => expect(screen.getByRole('button', { name: 'Condividi' })).toBeEnabled())
  })

  it('con data-pages=2 e data-fit-ok=true mostra la frase delle 2 pagine', async () => {
    paperPages.value = '2'
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/listino/stampa" />)
    expect(await screen.findByText('Il listino non entra in 1 pagina: verrà diviso su 2 pagine')).toBeInTheDocument()
    expect(screen.queryByText(/Tutto in 1 pagina/)).toBeNull()
  })
})
