import { fitInside, openBitmap } from './dogPhoto'
import { dataUrlToBytes } from './fileBytes'

export const FULL_MAX_SIDE = 1400
export const FULL_REDUCED_SIDE = 1100
export const FULL_QUALITY = 80
export const MIN_QUALITY = 45
export const QUALITY_STEP = 5
export const FULL_MAX_BYTES = 450 * 1024
export const THUMB_MAX_SIDE = 200
export const THUMB_QUALITY = 70
export const THUMB_MAX_BYTES = 12 * 1024
export const THUMB_HARD_MAX_BYTES = 25000
export const THUMB_MAX_ATTEMPTS = 8
export const THUMB_MIN_SIDE = 40

export const PHOTO_TOO_LARGE = 'La foto è troppo grande per essere salvata. Prova con un’altra immagine.'
export const FOTO_ALTRO = 'altro' as const

export class PhotoTooLargeError extends Error {
  constructor() {
    super(PHOTO_TOO_LARGE)
    this.name = 'PhotoTooLargeError'
  }
}

export type Encode = (maxSide: number, quality: number) => Promise<Uint8Array>

export type CompressedPhoto = {
  full: Uint8Array
  thumb: Uint8Array
  mime: 'image/webp' | 'image/jpeg'
  width: number
  height: number
}

export async function ladderFull(encode: Encode): Promise<Uint8Array> {
  let quality = FULL_QUALITY
  let side = FULL_MAX_SIDE
  for (;;) {
    const bytes = await encode(side, quality)
    if (bytes.length <= FULL_MAX_BYTES) return bytes
    if (quality > MIN_QUALITY) {
      quality -= QUALITY_STEP
      continue
    }
    if (side > FULL_REDUCED_SIDE) {
      side = FULL_REDUCED_SIDE
      continue
    }
    throw new PhotoTooLargeError()
  }
}

export async function ladderThumb(encode: Encode): Promise<Uint8Array> {
  let quality = THUMB_QUALITY
  let side = THUMB_MAX_SIDE
  let attempts = 0
  for (;;) {
    const bytes = await encode(side, quality)
    if (bytes.length <= THUMB_MAX_BYTES) return bytes
    attempts += 1
    if (quality > MIN_QUALITY) {
      quality -= QUALITY_STEP
      continue
    }
    if (attempts < THUMB_MAX_ATTEMPTS && side > THUMB_MIN_SIDE) {
      side = Math.min(THUMB_MAX_SIDE, Math.max(THUMB_MIN_SIDE, Math.round(side * 0.85)))
      continue
    }
    if (bytes.length < THUMB_HARD_MAX_BYTES) return bytes
    throw new PhotoTooLargeError()
  }
}

function paint(bitmap: ImageBitmap, maxSide: number): HTMLCanvasElement {
  const box = fitInside(bitmap.width, bitmap.height, maxSide)
  const canvas = document.createElement('canvas')
  canvas.width = box.width
  canvas.height = box.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('foto')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, 0, 0, box.width, box.height)
  return canvas
}

function toBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('foto'))), mime, quality / 100)
  })
}

async function supportedMime(bitmap: ImageBitmap): Promise<'image/webp' | 'image/jpeg'> {
  const probe = await toBlob(paint(bitmap, THUMB_MIN_SIDE), 'image/webp', THUMB_QUALITY)
  return probe.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
}

function canvasEncoder(bitmap: ImageBitmap, mime: string): Encode {
  return async (maxSide, quality) => {
    const blob = await toBlob(paint(bitmap, maxSide), mime, quality)
    return new Uint8Array(await blob.arrayBuffer())
  }
}

async function withEncoder<T>(
  source: Blob,
  work: (bitmap: ImageBitmap, encode: Encode, mime: CompressedPhoto['mime']) => Promise<T>,
): Promise<T> {
  const bitmap = await openBitmap(source)
  try {
    const mime = await supportedMime(bitmap)
    return await work(bitmap, canvasEncoder(bitmap, mime), mime)
  } finally {
    bitmap.close()
  }
}

export function compressFull(source: Blob): Promise<{ full: Uint8Array; mime: CompressedPhoto['mime'] }> {
  return withEncoder(source, async (_bitmap, encode, mime) => ({ full: await ladderFull(encode), mime }))
}

export function compressPhoto(source: Blob): Promise<CompressedPhoto> {
  return withEncoder(source, async (bitmap, encode, mime) => {
    const full = await ladderFull(encode)
    const thumb = await ladderThumb(encode)
    const box = fitInside(bitmap.width, bitmap.height, FULL_MAX_SIDE)
    return { full, thumb, mime, width: box.width, height: box.height }
  })
}

function dataUrlBlob(dataUrl: string): Blob {
  const { mime, bytes } = dataUrlToBytes(dataUrl)
  return new Blob([bytes], { type: mime })
}

export function photoFromDataUrl(dataUrl: string): Promise<CompressedPhoto> {
  const source = dataUrlBlob(dataUrl)
  return withEncoder(source, async (bitmap, encode, mime) => {
    const thumb = await ladderThumb(encode)
    const kept =
      (source.type === 'image/webp' || source.type === 'image/jpeg') &&
      source.size <= FULL_MAX_BYTES &&
      Math.max(bitmap.width, bitmap.height) <= FULL_MAX_SIDE
    if (kept) {
      const full = new Uint8Array(await source.arrayBuffer())
      return { full, thumb, mime: source.type as CompressedPhoto['mime'], width: bitmap.width, height: bitmap.height }
    }
    const full = await ladderFull(encode)
    const box = fitInside(bitmap.width, bitmap.height, FULL_MAX_SIDE)
    return { full, thumb, mime, width: box.width, height: box.height }
  })
}
