import { Directory, Filesystem } from '@capacitor/filesystem'
import { DriveAuth, type DriveCopia } from './driveAuth'
import { nomeSicuro } from './nomeSicuro'
import { frase } from '../i18n/frase'
import { LOCALE_INTL } from '../i18n/lingua'
import { leggiLinguaAttiva } from '../i18n/linguaLocale'

const FILE_RIPRISTINO = 'groomly-drive-ripristino.zip'

export function cartellaBackup(nome: string): string {
  return `Groomly Backup – ${nomeSicuro(nome.trim() || 'Groomly')}`
}

export function etichettaCopia(giorno: string, nome: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(giorno)
  if (!match) return nome
  const giornoUtc = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  if (Number.isNaN(giornoUtc.getTime()) || giornoUtc.getUTCMonth() !== Number(match[2]) - 1) return nome
  return new Intl.DateTimeFormat(LOCALE_INTL[leggiLinguaAttiva()], { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(giornoUtc)
}

export function messaggioRipristinoDrive(error: unknown): string {
  if (error instanceof Error && error.message === 'telefono') return frase('bakSoloTelefono')
  if (error instanceof Error && error.message === 'ricollega') return frase('bakRicollega')
  return frase('bakRipristinoDriveKo')
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
