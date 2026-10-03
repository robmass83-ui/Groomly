import { describe, expect, it, vi } from 'vitest'
import { fitSquare, prepareDogPhoto } from './dogPhoto'

describe('fitSquare', () => {
  it('ritaglia il centro e non supera 256', () => {
    expect(fitSquare(800, 400)).toEqual({ sx: 200, sy: 0, source: 400, side: 256 })
    expect(fitSquare(100, 180)).toEqual({ sx: 0, sy: 40, source: 100, side: 100 })
    expect(fitSquare(40, 40)).toEqual({ sx: 0, sy: 0, source: 40, side: 40 })
  })
})

describe('prepareDogPhoto', () => {
  it('esporta un JPEG il cui lato non supera 256', async () => {
    const bitmap = { width: 800, height: 400, close: vi.fn() }
    vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap))
    const drawn: number[] = []
    const canvas = {
      width: 0,
      height: 0,
      getContext() {
        return {
          drawImage(_image: unknown, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number) {
            drawn.push(sx, sy, sw, sh, dx, dy, dw, dh)
          },
        }
      },
      toDataURL(type: string, quality: number) {
        expect(type).toBe('image/jpeg')
        expect(quality).toBe(0.7)
        return 'data:image/jpeg;base64,abc'
      },
    }
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName === 'canvas') return canvas
      return realCreate(tagName)
    }) as typeof document.createElement)
    const file = new File([new Uint8Array([1, 2, 3])], 'grande.png', { type: 'image/png' })
    await expect(prepareDogPhoto(file)).resolves.toBe('data:image/jpeg;base64,abc')
    expect(canvas.width).toBe(256)
    expect(canvas.height).toBe(256)
    expect(drawn).toEqual([200, 0, 400, 400, 0, 0, 256, 256])
    expect(bitmap.close).toHaveBeenCalled()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('rifiuta un file che non è un’immagine', async () => {
    const file = new File(['ciao'], 'nota.txt', { type: 'text/plain' })
    await expect(prepareDogPhoto(file)).rejects.toThrow()
  })
})
