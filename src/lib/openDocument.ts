import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { FileViewer } from '@capacitor/file-viewer'
import { Directory, Filesystem } from '@capacitor/filesystem'

export async function openPdf(url: string): Promise<void> {
  if (!url.startsWith('https://')) throw new Error('File non apribile')
  try {
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url })
      return
    }
    if (window.open(url, '_blank', 'noopener') == null) {
      throw new Error('Nessuna app per aprire il PDF')
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Nessuna app per aprire il PDF') throw error
    throw new Error('Nessuna app per aprire il PDF')
  }
}

async function blobBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  }
  return btoa(binary)
}

export async function openPdfBlob(blob: Blob, name: string): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      const safe = name.replace(/[^\w.-]+/g, '_') || 'listino.pdf'
      const written = await Filesystem.writeFile({ path: safe.endsWith('.pdf') ? safe : `${safe}.pdf`, data: await blobBase64(blob), directory: Directory.Cache })
      await FileViewer.openDocumentFromLocalPath({ path: written.uri })
      return
    }
    const url = URL.createObjectURL(blob)
    if (window.open(url, '_blank', 'noopener') == null) throw new Error('Nessuna app per aprire il PDF')
  } catch {
    throw new Error('Nessuna app per aprire il PDF')
  }
}
