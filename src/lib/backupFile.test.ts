import { describe, expect, it } from 'vitest'
import { estensioneDaMime, ricomponiFile, stimaByte } from './backupFile'

describe('backupFile', () => {
  it('un webp intero resta webp e la stima non legge i byte', () => {
    const bytes = new Uint8Array([1, 2, 3, 4])
    const done = ricomponiFile({ chunkCount: 0, byteSize: 4, parts: [bytes] })
    expect(done).toEqual({ ok: true, bytes })
    expect(estensioneDaMime('image/webp')).toBe('.webp')
    expect(estensioneDaMime('image/jpeg')).toBe('.jpg')
    expect(stimaByte([{ byteSize: 4 }, {}])).toBe(4)
  })

  it('concatena i chunk nell’ordine degli indici', () => {
    const done = ricomponiFile({
      chunkCount: 3,
      byteSize: 6,
      parts: [new Uint8Array([1, 2]), new Uint8Array([3, 4]), new Uint8Array([5, 6])],
    })
    expect(done.ok).toBe(true)
    if (done.ok) expect(Array.from(done.bytes)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('dimensione diversa o pezzo mancante non lancia', () => {
    expect(ricomponiFile({ chunkCount: 0, byteSize: 3, parts: [new Uint8Array([1])] })).toMatchObject({ ok: false, motivo: 'dimensione', lunghezza: 1 })
    expect(ricomponiFile({ chunkCount: 0, byteSize: 1, parts: [null] })).toMatchObject({ ok: false, motivo: 'assente' })
    expect(ricomponiFile({ chunkCount: 2, byteSize: 2, parts: [new Uint8Array([1]), null] })).toMatchObject({ ok: false, motivo: 'chunk-assente' })
  })
})
