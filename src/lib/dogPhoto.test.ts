import { describe, expect, it, vi } from 'vitest'
import { fitInside, prepareDogPhoto, prepareListinoPhoto } from './dogPhoto'

function stubBitmap(width: number, height: number) {
  const bitmap = { width, height, close: vi.fn() }
  vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap))
  return bitmap
}

function stubCanvas(onUrl: (type: string, quality: number) => string) {
  const drawn: number[] = []
  const canvas = {
    width: 0,
    height: 0,
    getContext() {
      return {
        imageSmoothingEnabled: false,
        imageSmoothingQuality: 'low' as ImageSmoothingQuality,
        drawImage(_image: unknown, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number) {
          drawn.push(sx, sy, sw, sh, dx, dy, dw, dh)
        },
      }
    },
    toDataURL(type: string, quality: number) {
      return onUrl(type, quality)
    },
  }
  const realCreate = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
    if (tagName === 'canvas') return canvas
    return realCreate(tagName)
  }) as typeof document.createElement)
  return { canvas, drawn }
}

describe('fitInside', () => {
  it('tiene le proporzioni e non ingrandisce', () => {
    expect(fitInside(2800, 1400, 1400)).toEqual({ width: 1400, height: 700 })
    expect(fitInside(800, 400, 1400)).toEqual({ width: 800, height: 400 })
    expect(fitInside(100, 180, 1400)).toEqual({ width: 100, height: 180 })
  })
})

describe('prepareDogPhoto', () => {
  it('salva il fotogramma intero entro 1400 px, qualità da aprire', async () => {
    const bitmap = stubBitmap(2800, 1400)
    const { canvas, drawn } = stubCanvas((type, quality) => {
      expect(type).toBe('image/jpeg')
      expect(quality).toBe(0.8)
      return 'data:image/jpeg;base64,abc'
    })
    const file = new File([new Uint8Array([1, 2, 3])], 'grande.png', { type: 'image/png' })
    await expect(prepareDogPhoto(file)).resolves.toBe('data:image/jpeg;base64,abc')
    expect(canvas.width).toBe(1400)
    expect(canvas.height).toBe(700)
    expect(drawn).toEqual([0, 0, 2800, 1400, 0, 0, 1400, 700])
    expect(bitmap.close).toHaveBeenCalled()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('rifiuta un file che non è un’immagine', async () => {
    const file = new File(['ciao'], 'nota.txt', { type: 'text/plain' })
    await expect(prepareDogPhoto(file)).rejects.toThrow()
  })
})

describe('prepareListinoPhoto', () => {
  it('tiene la foto del listino quasi intera, senza ritaglio', async () => {
    const bitmap = stubBitmap(8000, 4000)
    const { canvas, drawn } = stubCanvas((type, quality) => {
      expect(type).toBe('image/jpeg')
      expect(quality).toBe(0.92)
      return 'data:image/jpeg;base64,abc'
    })
    const file = new File([new Uint8Array([1])], 'listino.png', { type: 'image/png' })
    await expect(prepareListinoPhoto(file)).resolves.toBe('data:image/jpeg;base64,abc')
    expect(canvas.width).toBe(4096)
    expect(canvas.height).toBe(2048)
    expect(drawn).toEqual([0, 0, 8000, 4000, 0, 0, 4096, 2048])
    expect(bitmap.close).toHaveBeenCalled()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('non ingrandisce una foto già più piccola del tetto', async () => {
    stubBitmap(900, 600)
    const { canvas } = stubCanvas(() => 'data:image/jpeg;base64,abc')
    const file = new File([new Uint8Array([1])], 'piccola.jpg', { type: 'image/jpeg' })
    await prepareListinoPhoto(file)
    expect(canvas.width).toBe(900)
    expect(canvas.height).toBe(600)
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('se il file è troppo pesante scende verso 2400 px e resta leggibile', async () => {
    stubBitmap(8000, 4000)
    const heavy = `data:image/jpeg;base64,${'A'.repeat(2_100_000)}`
    const qualities: number[] = []
    const { canvas } = stubCanvas((_type, quality) => {
      qualities.push(quality)
      return canvas.width <= 2400 ? 'data:image/jpeg;base64,abc' : heavy
    })
    const file = new File([new Uint8Array([1])], 'listino.png', { type: 'image/png' })
    await expect(prepareListinoPhoto(file)).resolves.toBe('data:image/jpeg;base64,abc')
    expect(canvas.width).toBe(2400)
    expect(canvas.height).toBe(1200)
    expect(qualities[0]).toBe(0.92)
    expect(qualities.at(-1)).toBe(0.8)
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('rifiuta un file che non è un’immagine', async () => {
    const file = new File(['ciao'], 'nota.txt', { type: 'text/plain' })
    await expect(prepareListinoPhoto(file)).rejects.toThrow()
  })
})
