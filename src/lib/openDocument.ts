import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'

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
