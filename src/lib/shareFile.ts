import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

export async function blobBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  }
  return btoa(binary)
}

export function downloadAnchor(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

export async function shareFiles(files: { blob: Blob; name: string }[], title: string) {
  const uris: string[] = []
  for (const file of files) {
    const written = await Filesystem.writeFile({
      path: file.name,
      data: await blobBase64(file.blob),
      directory: Directory.Cache,
    })
    uris.push(written.uri)
  }
  await Share.share({ files: uris, title })
}

export function isShareCancel(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const record = error as { message?: unknown; name?: unknown }
  return record.message === 'Share canceled' || record.name === 'AbortError'
}

export async function writeDocuments(files: { blob: Blob; name: string }[]) {
  for (const file of files) {
    await Filesystem.writeFile({
      path: `Groomly/${file.name}`,
      data: await blobBase64(file.blob),
      directory: Directory.Documents,
      recursive: true,
    })
  }
}
