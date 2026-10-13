import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { native, writeFile, openLocal } = vi.hoisted(() => ({
  native: { value: true },
  writeFile: vi.fn(async (_options: { path: string; data: string; directory: string }) => ({ uri: 'file:///cache/listino_aprile.pdf' })),
  openLocal: vi.fn(async (_options: { path: string }) => undefined),
}))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.value } }))
vi.mock('@capacitor/browser', () => ({ Browser: { open: vi.fn() } }))
vi.mock('@capacitor/filesystem', () => ({ Directory: { Cache: 'CACHE' }, Filesystem: { writeFile } }))
vi.mock('@capacitor/file-viewer', () => ({ FileViewer: { openDocumentFromLocalPath: openLocal } }))

import { openPdfBlob } from './openDocument'

describe('openPdfBlob', () => {
  const original = URL.createObjectURL

  beforeEach(() => {
    native.value = true
    writeFile.mockClear()
    openLocal.mockClear()
  })

  afterEach(() => {
    URL.createObjectURL = original
    vi.unstubAllGlobals()
  })

  it('sul telefono scrive il pdf nella cache e lo apre', async () => {
    await openPdfBlob(new Blob(['%PDF'], { type: 'application/pdf' }), 'listino aprile')
    expect(writeFile).toHaveBeenCalledWith({ path: 'listino_aprile.pdf', data: btoa('%PDF'), directory: 'CACHE' })
    expect(openLocal).toHaveBeenCalledWith({ path: 'file:///cache/listino_aprile.pdf' })
  })

  it('senza app per il pdf dice Nessuna app per aprire il PDF', async () => {
    openLocal.mockRejectedValueOnce(new Error('no app'))
    await expect(openPdfBlob(new Blob(['%PDF']), 'listino.pdf')).rejects.toThrow('Nessuna app per aprire il PDF')
  })

  it('nel browser apre un url blob', async () => {
    native.value = false
    URL.createObjectURL = vi.fn(() => 'blob:pdf')
    const open = vi.fn(() => ({}) as Window)
    vi.stubGlobal('open', open)
    await openPdfBlob(new Blob(['%PDF']), 'listino.pdf')
    expect(open).toHaveBeenCalledWith('blob:pdf', '_blank', 'noopener')
    expect(writeFile).not.toHaveBeenCalled()
  })
})
