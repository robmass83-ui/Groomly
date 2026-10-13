import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { read } = vi.hoisted(() => ({
  read: vi.fn(async (_ref: string, _variant: 'thumb' | 'full') => ({ bytes: new Uint8Array([1, 2, 3]), mime: 'image/webp' })),
}))
vi.mock('../data/firebase/client', () => ({ readStoredFile: read }))

describe('useFileSrc', () => {
  const original = URL.createObjectURL

  beforeEach(() => {
    vi.resetModules()
    read.mockClear()
    URL.createObjectURL = vi.fn(() => 'blob:uno')
  })

  afterEach(() => {
    URL.createObjectURL = original
  })

  it('lascia passare data: e https:', async () => {
    const { useFileSrc } = await import('./useFileSrc')
    expect(renderHook(() => useFileSrc('data:image/png;base64,QQ==', 'thumb')).result.current).toBe('data:image/png;base64,QQ==')
    expect(renderHook(() => useFileSrc('https://x/y.jpg', 'full')).result.current).toBe('https://x/y.jpg')
    expect(renderHook(() => useFileSrc(undefined, 'full')).result.current).toBeUndefined()
    expect(read).not.toHaveBeenCalled()
  })

  it('risolve file:{id} in un blob e lo legge una volta sola', async () => {
    const { useFileSrc } = await import('./useFileSrc')
    const first = renderHook(() => useFileSrc('file:abc', 'thumb'))
    expect(first.result.current).toBeUndefined()
    await waitFor(() => expect(first.result.current).toBe('blob:uno'))
    const second = renderHook(() => useFileSrc('file:abc', 'thumb'))
    await waitFor(() => expect(second.result.current).toBe('blob:uno'))
    expect(read).toHaveBeenCalledTimes(1)
    expect(read).toHaveBeenCalledWith('file:abc', 'thumb')
  })

  it('legge miniatura e foto intera separatamente', async () => {
    const { useFileSrc } = await import('./useFileSrc')
    const thumb = renderHook(() => useFileSrc('file:due', 'thumb'))
    const full = renderHook(() => useFileSrc('file:due', 'full'))
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(thumb.result.current).toBe('blob:uno'))
    await waitFor(() => expect(full.result.current).toBe('blob:uno'))
    expect(read).toHaveBeenCalledWith('file:due', 'thumb')
    expect(read).toHaveBeenCalledWith('file:due', 'full')
  })

  it('dopo un errore di lettura resta vuoto e riprova la volta dopo', async () => {
    read.mockRejectedValueOnce(new Error('File non apribile'))
    const { useFileSrc } = await import('./useFileSrc')
    const failed = renderHook(() => useFileSrc('file:tre', 'full'))
    await waitFor(() => expect(read).toHaveBeenCalledTimes(1))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(failed.result.current).toBeUndefined()
    const retry = renderHook(() => useFileSrc('file:tre', 'full'))
    await waitFor(() => expect(retry.result.current).toBe('blob:uno'))
    expect(read).toHaveBeenCalledTimes(2)
  })

  it('useFileState segnala failed quando la lettura fallisce', async () => {
    read.mockRejectedValueOnce(new Error('File non apribile'))
    const { useFileState } = await import('./useFileSrc')
    const loading = renderHook(() => useFileState('file:quattro', 'full'))
    expect(loading.result.current).toEqual({ src: undefined, failed: false })
    await waitFor(() => expect(loading.result.current).toEqual({ src: undefined, failed: true }))
    const ok = renderHook(() => useFileState('file:cinque', 'full'))
    await waitFor(() => expect(ok.result.current).toEqual({ src: 'blob:uno', failed: false }))
    expect(renderHook(() => useFileState('data:image/png;base64,QQ==', 'thumb')).result.current).toEqual({ src: 'data:image/png;base64,QQ==', failed: false })
  })

  it('readFileBlob restituisce il file intero con il suo tipo', async () => {
    read.mockResolvedValueOnce({ bytes: new Uint8Array([37, 80, 68, 70]), mime: 'application/pdf' })
    const { readFileBlob } = await import('./useFileSrc')
    const blob = await readFileBlob('file:pdf')
    expect(read).toHaveBeenCalledWith('file:pdf', 'full')
    expect(blob.type).toBe('application/pdf')
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array([37, 80, 68, 70]))
  })
})
