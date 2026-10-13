import { useEffect, useState } from 'react'
import { isFileRef } from '../lib/fileBytes'

type Variant = 'thumb' | 'full'

const urls = new Map<string, Promise<string>>()
let client: Promise<typeof import('../data/firebase/client')> | null = null

async function readBlob(ref: string, variant: Variant): Promise<Blob> {
  client ??= import('../data/firebase/client').catch((error: unknown) => {
    client = null
    throw error
  })
  const { readStoredFile } = await client
  const { bytes, mime } = await readStoredFile(ref, variant)
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: mime })
}

export function readFileBlob(ref: string): Promise<Blob> {
  return readBlob(ref, 'full')
}

function objectUrl(ref: string, variant: Variant): Promise<string> {
  const key = `${variant}:${ref}`
  let found = urls.get(key)
  if (!found) {
    found = readBlob(ref, variant).then((blob) => URL.createObjectURL(blob))
    found.catch(() => urls.delete(key))
    urls.set(key, found)
  }
  return found
}

export function useFileState(value: string | undefined, variant: Variant): { src: string | undefined; failed: boolean } {
  const [resolved, setResolved] = useState<{ key: string; url?: string } | null>(null)
  const key = value && isFileRef(value) ? `${variant}:${value}` : ''
  useEffect(() => {
    if (!value || !isFileRef(value)) return
    let active = true
    const current = `${variant}:${value}`
    objectUrl(value, variant).then(
      (url) => {
        if (active) setResolved({ key: current, url })
      },
      () => {
        if (active) setResolved({ key: current })
      },
    )
    return () => {
      active = false
    }
  }, [value, variant])
  if (!key) return { src: value, failed: false }
  if (resolved?.key !== key) return { src: undefined, failed: false }
  return { src: resolved.url, failed: resolved.url === undefined }
}

export function useFileSrc(value: string | undefined, variant: Variant): string | undefined {
  return useFileState(value, variant).src
}
