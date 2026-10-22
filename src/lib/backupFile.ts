import { joinChunks } from './fileBytes'

export type MotivoMancante = 'assente' | 'chunk-assente' | 'dimensione' | 'illeggibile'

const NOTE = {
  'image/webp': '.webp',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
} as const

export function estensioneDaMime(mime: string): string {
  const known = NOTE[mime as keyof typeof NOTE]
  if (known) return known
  const sub = mime.split('/')[1] ?? ''
  return /^[a-z0-9]+$/.test(sub) ? `.${sub}` : '.bin'
}

export function stimaByte(files: readonly { byteSize?: number }[]): number {
  return files.reduce((sum, file) => sum + (typeof file.byteSize === 'number' ? file.byteSize : 0), 0)
}

function esito(bytes: Uint8Array, byteSize: number | undefined) {
  if (typeof byteSize === 'number' && bytes.byteLength !== byteSize) {
    return { ok: false as const, motivo: 'dimensione' as const, byteSize, lunghezza: bytes.byteLength }
  }
  return { ok: true as const, bytes }
}

export function ricomponiFile(input: {
  chunkCount: number
  byteSize?: number
  parts: ReadonlyArray<Uint8Array | null>
}): { ok: true; bytes: Uint8Array } | { ok: false; motivo: MotivoMancante; byteSize?: number; lunghezza?: number } {
  try {
    if (input.chunkCount <= 0) {
      const only = input.parts[0]
      if (!only) return { ok: false, motivo: 'assente', byteSize: input.byteSize }
      return esito(only, input.byteSize)
    }
    const parts: Uint8Array[] = []
    for (let index = 0; index < input.chunkCount; index += 1) {
      const part = input.parts[index]
      if (!part) return { ok: false, motivo: 'chunk-assente', byteSize: input.byteSize }
      parts.push(part)
    }
    return esito(joinChunks(parts), input.byteSize)
  } catch {
    return { ok: false, motivo: 'illeggibile', byteSize: input.byteSize }
  }
}
