import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { native, writeFile, openLocal } = vi.hoisted(() => ({
  native: { value: true },
  writeFile: vi.fn(async (_options: { path: string; data: string; directory: string }) => ({ uri: 'file:///data/user/0/app/cache/listino%20aprile.pdf' })),
  openLocal: vi.fn(async (_options: { path: string }) => undefined),
}))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.value } }))
vi.mock('@capacitor/browser', () => ({ Browser: { open: vi.fn() } }))
vi.mock('@capacitor/filesystem', () => ({ Directory: { Cache: 'CACHE' }, Filesystem: { writeFile } }))
vi.mock('@capacitor/file-viewer', () => ({ FileViewer: { openDocumentFromLocalPath: openLocal } }))

import { openPdf, openPdfBlob } from './openDocument'

describe('openPdfBlob', () => {
  const original = URL.createObjectURL
  const originalRevoke = URL.revokeObjectURL

  beforeEach(() => {
    native.value = true
    writeFile.mockClear()
    openLocal.mockClear()
  })

  afterEach(() => {
    URL.createObjectURL = original
    URL.revokeObjectURL = originalRevoke
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('sul telefono scrive il pdf nella cache e lo apre', async () => {
    await openPdfBlob(new Blob(['%PDF'], { type: 'application/pdf' }), 'listino aprile')
    expect(writeFile).toHaveBeenCalledWith({ path: 'listino_aprile.pdf', data: btoa('%PDF'), directory: 'CACHE' })
    expect(openLocal).toHaveBeenCalledWith({ path: '/data/user/0/app/cache/listino aprile.pdf' })
  })

  it('senza app per il pdf dice Nessuna app per aprire il PDF', async () => {
    openLocal.mockRejectedValueOnce(new Error('no app'))
    await expect(openPdfBlob(new Blob(['%PDF']), 'listino.pdf')).rejects.toThrow('Nessuna app per aprire il PDF')
  })

  it('nel browser apre un url blob, stacca opener e lo libera dopo 60 s', async () => {
    vi.useFakeTimers()
    native.value = false
    URL.createObjectURL = vi.fn(() => 'blob:pdf')
    const revoke = vi.fn()
    URL.revokeObjectURL = revoke
    const opened = { opener: {} } as unknown as Window
    const open = vi.fn((_url: string, _target: string) => opened)
    vi.stubGlobal('open', open)
    await openPdfBlob(new Blob(['%PDF']), 'listino.pdf')
    expect(open).toHaveBeenCalledWith('blob:pdf', '_blank')
    expect(opened.opener).toBeNull()
    expect(writeFile).not.toHaveBeenCalled()
    expect(revoke).not.toHaveBeenCalled()
    vi.advanceTimersByTime(60_000)
    expect(revoke).toHaveBeenCalledWith('blob:pdf')
    vi.useRealTimers()
  })

  it('nel browser una finestra bloccata dice Nessuna app per aprire il PDF', async () => {
    vi.useFakeTimers()
    native.value = false
    URL.createObjectURL = vi.fn(() => 'blob:pdf')
    vi.stubGlobal('open', vi.fn(() => null))
    await expect(openPdfBlob(new Blob(['%PDF']), 'listino.pdf')).rejects.toThrow('Nessuna app per aprire il PDF')
  })

  it('openPdf nel browser apre l’https e stacca opener', async () => {
    native.value = false
    const opened = { opener: {} } as unknown as Window
    const open = vi.fn((_url: string, _target: string) => opened)
    vi.stubGlobal('open', open)
    await openPdf('https://files.example/listino.pdf')
    expect(open).toHaveBeenCalledWith('https://files.example/listino.pdf', '_blank')
    expect(opened.opener).toBeNull()
  })
})
