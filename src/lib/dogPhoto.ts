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

async function openBitmap(file: Blob): Promise<ImageBitmap> {
  if (!file.type.startsWith('image/')) throw new Error('foto')
  const bitmap = await createImageBitmap(file)
  if (bitmap.width < 1 || bitmap.height < 1) {
    bitmap.close()
    throw new Error('foto')
  }
  return bitmap
}

export async function prepareDogPhoto(file: Blob): Promise<string> {
  const { compressPhoto } = await import('./photoCodec')
  const photo = await compressPhoto(file)
  let binary = ''
  for (let index = 0; index < photo.full.length; index += 0x8000) {
    binary += String.fromCharCode(...photo.full.subarray(index, index + 0x8000))
  }
  return `data:${photo.mime};base64,${btoa(binary)}`
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
