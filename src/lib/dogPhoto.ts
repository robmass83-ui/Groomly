export function dogPortrait(dog: { photo?: string; gallery?: { photo: string }[] } | null | undefined): string | undefined {
  if (!dog) return undefined
  if (dog.photo) return dog.photo
  return dog.gallery?.find((item) => item.photo)?.photo
}

const MAX_SIDE = 256
const JPEG_QUALITY = 0.7

export function fitSquare(width: number, height: number, maxSide = MAX_SIDE): { sx: number; sy: number; source: number; side: number } {
  const source = Math.min(width, height)
  const side = Math.min(maxSide, source)
  return { sx: (width - source) / 2, sy: (height - source) / 2, source, side }
}

export async function prepareDogPhoto(file: Blob): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('foto')
  const bitmap = await createImageBitmap(file)
  try {
    if (bitmap.width < 1 || bitmap.height < 1) throw new Error('foto')
    const box = fitSquare(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = box.side
    canvas.height = box.side
    const context = canvas.getContext('2d')
    if (!context) throw new Error('foto')
    context.drawImage(bitmap, box.sx, box.sy, box.source, box.source, 0, 0, box.side, box.side)
    const url = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
    if (!url.startsWith('data:image/jpeg')) throw new Error('foto')
    return url
  } finally {
    bitmap.close()
  }
}
