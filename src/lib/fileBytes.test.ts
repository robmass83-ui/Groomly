import { describe, expect, it } from 'vitest'
import {
  CHUNK_BYTES,
  FILE_TOO_LARGE,
  INLINE_MAX_BYTES,
  bytesToDataUrl,
  dataUrlToBytes,
  fileIdOf,
  fileRef,
  isFileRef,
  joinChunks,
  splitChunks,
} from './fileBytes'

function filled(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  for (let index = 0; index < length; index += 1) bytes[index] = index % 251
  return bytes
}

describe('fileBytes', () => {
  it('riferimento file:{id}', () => {
    expect(fileRef('abc')).toBe('file:abc')
    expect(fileIdOf('file:abc')).toBe('abc')
    expect(fileIdOf('data:image/png;base64,QQ==')).toBeNull()
    expect(fileIdOf(undefined)).toBeNull()
    expect(isFileRef('file:x')).toBe(true)
    expect(isFileRef('https://x')).toBe(false)
    expect(isFileRef('file:///storage/emulated/0/foto.jpg')).toBe(false)
    expect(fileIdOf('file:///storage/emulated/0/foto.jpg')).toBeNull()
  })

  it('data URL e byte vanno e tornano uguali', () => {
    const bytes = filled(1000)
    const url = bytesToDataUrl(bytes, 'application/pdf')
    expect(url.startsWith('data:application/pdf;base64,')).toBe(true)
    const back = dataUrlToBytes(url)
    expect(back.mime).toBe('application/pdf')
    expect(Array.from(back.bytes)).toEqual(Array.from(bytes))
  })

  it('un file da 500 KB resta intero', () => {
    expect(splitChunks(filled(500 * 1024))).toEqual([])
    expect(splitChunks(filled(INLINE_MAX_BYTES))).toEqual([])
  })

  it('un file da 2 MB va in 4 pezzi da 600 KB e torna uguale', () => {
    const bytes = filled(2 * 1024 * 1024)
    const parts = splitChunks(bytes)
    expect(parts).toHaveLength(4)
    expect(parts.slice(0, 3).every((part) => part.length === CHUNK_BYTES)).toBe(true)
    const joined = joinChunks(parts)
    expect(joined.length).toBe(bytes.length)
    expect(joined.every((value, index) => value === bytes[index])).toBe(true)
  })

  it('messaggio del file troppo grande', () => {
    expect(FILE_TOO_LARGE).toBe('Il file pesa più di 10 MB. Riduci la scansione e riprova.')
  })
})
