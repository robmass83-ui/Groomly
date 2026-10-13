import { afterEach, describe, expect, it, vi } from 'vitest'
import { FULL_MAX_BYTES, PhotoTooLargeError, THUMB_MAX_BYTES, ladderFull, ladderThumb, photoFromDataUrl, type Encode } from './photoCodec'

function recorder(sizeOf: (side: number, quality: number) => number) {
  const calls: Array<[number, number]> = []
  const encode: Encode = async (side, quality) => {
    calls.push([side, quality])
    return new Uint8Array(sizeOf(side, quality))
  }
  return { calls, encode }
}

describe('ladderFull', () => {
  it('tiene 1400 px qualità 80 se sta sotto 450 KB', async () => {
    const { calls, encode } = recorder(() => 300 * 1024)
    const bytes = await ladderFull(encode)
    expect(bytes.length).toBe(300 * 1024)
    expect(calls).toEqual([[1400, 80]])
  })

  it('scende di 5 fino a 45 e poi passa a 1100 px', async () => {
    const { calls, encode } = recorder((side) => (side === 1100 ? 400 * 1024 : 500 * 1024))
    const bytes = await ladderFull(encode)
    expect(bytes.length).toBeLessThanOrEqual(FULL_MAX_BYTES)
    expect(calls).toEqual([
      [1400, 80], [1400, 75], [1400, 70], [1400, 65], [1400, 60], [1400, 55], [1400, 50], [1400, 45],
      [1100, 45],
    ])
  })

  it('rifiuta la foto che non sta neanche al minimo', async () => {
    const { encode } = recorder(() => 600 * 1024)
    await expect(ladderFull(encode)).rejects.toBeInstanceOf(PhotoTooLargeError)
    await expect(ladderFull(encode)).rejects.toThrow('La foto è troppo grande per essere salvata. Prova con un’altra immagine.')
  })
})

describe('ladderThumb', () => {
  it('tiene 200 px qualità 70 se sta sotto 12 KB', async () => {
    const { calls, encode } = recorder(() => 8 * 1024)
    await ladderThumb(encode)
    expect(calls).toEqual([[200, 70]])
  })

  it('scende di qualità fino a 45, poi riduce il lato del 15%, al massimo 8 tentativi', async () => {
    const { calls, encode } = recorder(() => 20 * 1024)
    const bytes = await ladderThumb(encode)
    expect(calls).toEqual([
      [200, 70], [200, 65], [200, 60], [200, 55], [200, 50], [200, 45],
      [170, 45], [145, 45],
    ])
    expect(bytes.length).toBe(20 * 1024)
  })

  it('arriva sotto 12 KB riducendo il lato', async () => {
    const { calls, encode } = recorder((side) => (side <= 170 ? THUMB_MAX_BYTES : 20 * 1024))
    const bytes = await ladderThumb(encode)
    expect(bytes.length).toBe(THUMB_MAX_BYTES)
    expect(calls.at(-1)).toEqual([170, 45])
  })

  it('rifiuta una miniatura oltre 25000 byte', async () => {
    const { encode } = recorder(() => 30000)
    await expect(ladderThumb(encode)).rejects.toBeInstanceOf(PhotoTooLargeError)
  })
})

describe('photoFromDataUrl', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  function stubImage(width: number, height: number) {
    const bitmap = { width, height, close: vi.fn() }
    vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap))
    const canvas = { width: 0, height: 0, getContext: () => ({ imageSmoothingEnabled: false, imageSmoothingQuality: 'low', drawImage() {} }),
      toBlob(callback: (blob: Blob | null) => void, type: string) {
        callback(new Blob([new Uint8Array(1000).fill(7)], { type }))
      },
    }
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => (tagName === 'canvas' ? canvas : realCreate(tagName))) as typeof document.createElement)
    return bitmap
  }

  const source = new Uint8Array([255, 216, 255, 1, 2, 3, 4, 5])
  const sourceBase64 = btoa(String.fromCharCode(...source))

  it('tiene i byte di un JPEG piccolo e calcola solo la miniatura', async () => {
    const bitmap = stubImage(1000, 800)
    const photo = await photoFromDataUrl(`data:image/jpeg;base64,${sourceBase64}`)
    expect(Array.from(photo.full)).toEqual(Array.from(source))
    expect(photo.mime).toBe('image/jpeg')
    expect(photo.width).toBe(1000)
    expect(photo.height).toBe(800)
    expect(photo.thumb.length).toBe(1000)
    expect(bitmap.close).toHaveBeenCalled()
  })

  it('ricomprime un JPEG leggero ma oltre 1400 px', async () => {
    stubImage(2000, 1500)
    const photo = await photoFromDataUrl(`data:image/jpeg;base64,${sourceBase64}`)
    expect(Array.from(photo.full)).not.toEqual(Array.from(source))
    expect(photo.full.length).toBe(1000)
    expect(photo.mime).toBe('image/webp')
    expect(photo.width).toBe(1400)
    expect(photo.height).toBe(1050)
  })

  it('ricomprime un PNG', async () => {
    stubImage(800, 600)
    const photo = await photoFromDataUrl(`data:image/png;base64,${sourceBase64}`)
    expect(Array.from(photo.full)).not.toEqual(Array.from(source))
    expect(photo.mime).toBe('image/webp')
    expect(photo.width).toBe(800)
    expect(photo.height).toBe(600)
  })
})
