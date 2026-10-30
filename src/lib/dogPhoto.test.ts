import { describe, expect, it, vi } from 'vitest'
import { assertLogoSize, fitInside, prepareDogPhoto, prepareListinoPhoto, prepareLogo } from './dogPhoto'

function stubBitmap(width: number, height: number) {
  const bitmap = { width, height, close: vi.fn() }
  vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap))
  return bitmap
}

function opaquePixels(count = 4): Uint8ClampedArray {
  const data = new Uint8ClampedArray(count * 4)
  for (let i = 0; i < count; i++) data[i * 4 + 3] = 255
  return data
}

function stubCanvas(onUrl: (type: string, quality: number) => string, pixels = opaquePixels()) {
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
        getImageData() {
          return { data: pixels }
        },
        putImageData() {},
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
  it('salva il fotogramma intero entro 1400 px in WebP, qualità 80', async () => {
    const bitmap = stubBitmap(2800, 1400)
    const calls: Array<[string, number, number]> = []
    const canvas = { width: 0, height: 0, getContext: () => ({ imageSmoothingEnabled: false, imageSmoothingQuality: 'low', drawImage() {} }),
      toBlob(callback: (blob: Blob | null) => void, type: string, quality: number) {
        calls.push([type, quality, canvas.width])
        callback(new Blob([new Uint8Array(1000)], { type }))
      },
    }
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => (tagName === 'canvas' ? canvas : realCreate(tagName))) as typeof document.createElement)
    const file = new File([new Uint8Array([1, 2, 3])], 'grande.png', { type: 'image/png' })
    const url = await prepareDogPhoto(file)
    expect(url.startsWith('data:image/webp;base64,')).toBe(true)
    expect(calls).toEqual([['image/webp', 0.7, 40], ['image/webp', 0.8, 1400]])
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

describe('prepareLogo', () => {
  it('un PNG 2×2 tutto opaco ritorna data:image/jpeg', async () => {
    stubBitmap(2, 2)
    stubCanvas((type) => type === 'image/jpeg' ? 'data:image/jpeg;base64,abc' : 'data:image/png;base64,abc')
    const file = new File([new Uint8Array([1])], 'logo.png', { type: 'image/png' })
    await expect(prepareLogo(file)).resolves.toMatch(/^data:image\/jpeg/)
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('un logo su sfondo bianco perde il bianco e i margini: PNG grande solo quanto il marchio', async () => {
    // una croce: tagliata sul suo riquadro, gli angoli restano trasparenti
    const pixels = new Uint8ClampedArray(7 * 7 * 4).fill(255)
    for (const [x, y] of [[3, 2], [2, 3], [3, 3], [4, 3], [3, 4]] as const) pixels.set([200, 30, 60, 255], (y * 7 + x) * 4)
    stubBitmap(7, 7)
    const { canvas, drawn } = stubCanvas((type) => `data:${type};base64,abc`, pixels)
    const file = new File([new Uint8Array([1])], 'logo.jpg', { type: 'image/jpeg' })
    await expect(prepareLogo(file)).resolves.toMatch(/^data:image\/png/)
    expect(canvas.width).toBe(3)
    expect(canvas.height).toBe(3)
    expect(drawn.slice(-8)).toEqual([2, 2, 3, 3, 0, 0, 3, 3])
  })

  it('un logo quadrato pieno dopo il taglio resta JPEG', async () => {
    const pixels = new Uint8ClampedArray(6 * 6 * 4).fill(255)
    for (const [x, y] of [[2, 2], [3, 2], [2, 3], [3, 3]] as const) pixels.set([200, 30, 60, 255], (y * 6 + x) * 4)
    stubBitmap(6, 6)
    const { canvas } = stubCanvas((type) => `data:${type};base64,abc`, pixels)
    const file = new File([new Uint8Array([1])], 'logo.jpg', { type: 'image/jpeg' })
    await expect(prepareLogo(file)).resolves.toMatch(/^data:image\/jpeg/)
    expect(canvas.width).toBe(2)
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('un PNG con un pixel alpha 0 ritorna data:image/png', async () => {
    const pixels = opaquePixels()
    pixels[3] = 0
    stubBitmap(2, 2)
    stubCanvas((type) => type === 'image/png' ? 'data:image/png;base64,abc' : 'data:image/jpeg;base64,abc', pixels)
    const file = new File([new Uint8Array([1])], 'logo.png', { type: 'image/png' })
    await expect(prepareLogo(file)).resolves.toMatch(/^data:image\/png/)
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
})

describe('assertLogoSize', () => {
  it('rifiuta un logo oltre 450 KB', () => {
    expect(() => assertLogoSize(450 * 1024)).not.toThrow()
    expect(() => assertLogoSize(450 * 1024 + 1)).toThrow('logo')
  })
})
