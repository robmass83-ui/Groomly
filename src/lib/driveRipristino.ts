import { Directory, Filesystem } from '@capacitor/filesystem'
import { DriveAuth, type DriveCopia } from './driveAuth'
import { nomeSicuro } from './nomeSicuro'

const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
const FILE_RIPRISTINO = 'groomly-drive-ripristino.zip'

export function cartellaBackup(nome: string): string {
  return `Groomly Backup – ${nomeSicuro(nome.trim() || 'Groomly')}`
}

export function etichettaCopia(giorno: string, nome: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(giorno)
  const mese = match ? MESI[Number(match[2]) - 1] : undefined
  if (!match || !mese) return nome
  return `${Number(match[3])} ${mese} ${match[1]}`
}

export function messaggioRipristinoDrive(error: unknown): string {
  if (error instanceof Error && error.message === 'telefono') return 'Il collegamento a Google Drive funziona sul telefono'
  if (error instanceof Error && error.message === 'ricollega') return 'Ricollega Google Drive'
  return 'Ripristino da Drive non riuscito'
}

export async function elencoCopie(cartella: string): Promise<DriveCopia[]> {
  const risposta = await DriveAuth.elenco({ cartella })
  return Array.isArray(risposta.copie) ? risposta.copie : []
}

export async function leggiCopia(cartella: string, id: string): Promise<Uint8Array> {
  await DriveAuth.scarica({ cartella, id })
  try {
    const letto = await Filesystem.readFile({ path: FILE_RIPRISTINO, directory: Directory.Cache })
    if (typeof letto.data !== 'string' || letto.data.length === 0) throw new Error('invio')
    const binary = atob(letto.data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
    return bytes
  } finally {
    await Filesystem.deleteFile({ path: FILE_RIPRISTINO, directory: Directory.Cache }).catch(() => undefined)
  }
}
