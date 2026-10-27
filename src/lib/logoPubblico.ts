const MIME = /^image\/(png|jpeg|webp|gif)$/
const LOGO = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function idFileLogo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('file:')) return ''
  const id = value.slice(5)
  return UUID.test(id) ? id : ''
}

export function byteDelThumb(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) return value
  if (value && typeof value === 'object' && 'toUint8Array' in value && typeof (value as { toUint8Array: unknown }).toUint8Array === 'function') {
    const out = (value as { toUint8Array: () => unknown }).toUint8Array()
    if (out instanceof Uint8Array) return out
  }
  return null
}

function base64(bytes: Uint8Array): string {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  }
  return btoa(binary)
}

/** Il logo pubblico è solo l’anteprima già salvata con la foto, mai il file intero. */
export function logoDaThumb(mime: unknown, thumb: unknown): string {
  if (typeof mime !== 'string' || !MIME.test(mime)) return ''
  const bytes = byteDelThumb(thumb)
  if (!bytes || bytes.length === 0 || bytes.length > 25000) return ''
  return `data:${mime};base64,${base64(bytes)}`
}

export function logoSicuro(value: string | undefined): string {
  if (!value || value.length > 40000 || !LOGO.test(value)) return ''
  return value
}
