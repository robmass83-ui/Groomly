import { bytesToDataUrl } from './fileBytes'
import { ritagliaLogo } from './logoTaglio'

export function dogPortrait(dog: { photo?: string; gallery?: { photo: string }[] } | null | undefined): string | undefined {
  if (!dog) return undefined
  if (dog.photo) return dog.photo
  return dog.gallery?.find((item) => item.photo)?.photo
}

const LISTINO_MAX_SIDE = 4096
const LISTINO_MIN_SIDE = 2400
const LISTINO_MAX_BYTES = 1_500_000

export function fitInside(width: number, height: number, maxSide: number): { width: number; height: number } {
  const long = Math.max(width, height)
  if (long < 1 || long <= maxSide) return { width, height }
  const scale = maxSide / long
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

const LOGO_MAX_SIDE = 600
const LOGO_MAX_BYTES = 450 * 1024

function dataUrlBytes(dataUrl: string): number {
  const payload = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((payload.length * 3) / 4) - padding)
}

function paintJpeg(bitmap: ImageBitmap, maxSide: number, quality: number): string {
  const box = fitInside(bitmap.width, bitmap.height, maxSide)
  const canvas = document.createElement('canvas')
  canvas.width = box.width
  canvas.height = box.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('foto')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, 0, 0, box.width, box.height)
  const url = canvas.toDataURL('image/jpeg', quality)
  if (!url.startsWith('data:image/jpeg')) throw new Error('foto')
  return url
}

export async function openBitmap(file: Blob): Promise<ImageBitmap> {
  if (!file.type.startsWith('image/')) throw new Error('foto')
  const bitmap = await createImageBitmap(file)
  if (bitmap.width < 1 || bitmap.height < 1) {
    bitmap.close()
    throw new Error('foto')
  }
  return bitmap
}

export async function prepareDogPhoto(file: Blob): Promise<string> {
  const { compressFull } = await import('./photoCodec')
  const photo = await compressFull(file)
  return bytesToDataUrl(photo.full, photo.mime)
}

export function assertLogoSize(bytes: number): void {
  if (bytes > LOGO_MAX_BYTES) throw new Error('logo')
}

/** Il logo si ripulisce più grande di come si salva: il taglio dei margini non gli toglie nitidezza. */
const LOGO_WORK_SIDE = 1200

function logoCanvas(width: number, height: number): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('logo')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  return { canvas, context }
}

/** Il logo resta nella sua forma: sfondo bianco attorno trasparente, margini vuoti tagliati. */
export async function prepareLogo(file: Blob): Promise<string> {
  const bitmap = await openBitmap(file)
  try {
    const work = fitInside(bitmap.width, bitmap.height, LOGO_WORK_SIDE)
    const source = logoCanvas(work.width, work.height)
    source.context.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height, 0, 0, work.width, work.height)
    const image = source.context.getImageData(0, 0, work.width, work.height)
    const crop = ritagliaLogo(image.data, work.width, work.height)
    source.context.putImageData(image, 0, 0)
    let png = false
    for (let y = crop.y; y < crop.y + crop.h && !png; y++) {
      for (let x = crop.x; x < crop.x + crop.w; x++) {
        if ((image.data[(y * work.width + x) * 4 + 3] ?? 255) < 255) {
          png = true
          break
        }
      }
    }
    const box = fitInside(crop.w, crop.h, LOGO_MAX_SIDE)
    const { canvas, context } = logoCanvas(box.width, box.height)
    context.drawImage(source.canvas, crop.x, crop.y, crop.w, crop.h, 0, 0, box.width, box.height)
    const url = png ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.85)
    assertLogoSize(dataUrlBytes(url))
    return url
  } finally {
    bitmap.close()
  }
}

export async function prepareListinoPhoto(file: Blob): Promise<string> {
  const bitmap = await openBitmap(file)
  try {
    const steps = [
      { side: LISTINO_MAX_SIDE, quality: 0.92 },
      { side: 3200, quality: 0.86 },
      { side: LISTINO_MIN_SIDE, quality: 0.8 },
    ]
    let last = ''
    for (const step of steps) {
      last = paintJpeg(bitmap, step.side, step.quality)
      if (dataUrlBytes(last) <= LISTINO_MAX_BYTES) return last
    }
    return last
  } finally {
    bitmap.close()
  }
}
