export const INLINE_MAX_BYTES = 700 * 1024
export const CHUNK_BYTES = 600 * 1024
export const FILE_MAX_BYTES = 10 * 1024 * 1024
export const CHUNK_WRITE_GROUP = 8

export const FILE_TOO_LARGE = 'Il file pesa più di 10 MB. Riduci la scansione e riprova.'
export const FILE_UNOPENABLE = 'File non apribile'

const PREFIX = 'file:'

export function fileRef(id: string): string {
  return `${PREFIX}${id}`
}

export function isFileRef(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(PREFIX) && value.length > PREFIX.length && value[PREFIX.length] !== '/'
}

export function fileIdOf(value: string | undefined): string | null {
  return isFileRef(value) ? value.slice(PREFIX.length) : null
}

export function dataUrlToBytes(dataUrl: string): { mime: string; bytes: Uint8Array<ArrayBuffer> } {
  const comma = dataUrl.indexOf(',')
  const mime = dataUrl.slice(5, comma).split(';')[0] || 'application/octet-stream'
  const binary = atob(dataUrl.slice(comma + 1))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return { mime, bytes }
}

export function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  }
  return `data:${mime};base64,${btoa(binary)}`
}

export function splitChunks(bytes: Uint8Array): Uint8Array[] {
  if (bytes.length <= INLINE_MAX_BYTES) return []
  const parts: Uint8Array[] = []
  for (let start = 0; start < bytes.length; start += CHUNK_BYTES) parts.push(bytes.slice(start, start + CHUNK_BYTES))
  return parts
}

export function joinChunks(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const joined = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    joined.set(part, offset)
    offset += part.length
  }
  return joined
}
