import { Directory, Filesystem } from '@capacitor/filesystem'
import { AppError } from '../data/errors'
import { getSettings } from '../data/local/settings'
import { DriveAuth } from './driveAuth'
import { cartellaBackup } from './driveRipristino'
import { blobBase64 } from './shareFile'

export function chiaveInvioDrive(uid: string): string {
  return `groomly.users.${uid}.driveUltimoInvio`
}

export function invioDriveDovuto(uid: string, now: Date): boolean {
  const raw = localStorage.getItem(chiaveInvioDrive(uid))
  if (!raw) return true
  const then = Date.parse(raw)
  if (Number.isNaN(then)) return true
  return now.getTime() - then >= 24 * 60 * 60 * 1000
}

export function messaggioInvio(error: unknown): string {
  if (error instanceof Error && error.message === 'telefono') return 'Il collegamento a Google Drive funziona sul telefono'
  if (error instanceof Error && error.message === 'ricollega') return 'Ricollega Google Drive'
  if (error instanceof AppError && error.code === 'backup_offline') return error.message
  return 'Invio su Drive non riuscito'
}

export async function inviaBackupSuDrive(uid: string, now: Date): Promise<void> {
  const { raccogliBackup } = await import('../data/firebase/backupCollect')
  const { registroXlsx } = await import('../lib/registroXlsx')
  const { backupCompleto, cartellaFoto } = await import('../lib/backupCompleto')
  const scritti: string[] = []
  const file: { percorso: string; bytes: Uint8Array }[] = []
  const raccolto = await raccogliBackup(now, {
    includiByte: true,
    onFile: (_meta, bytes, percorso) => {
      scritti.push(percorso)
      file.push({ percorso, bytes })
    },
  })
  const registro = await registroXlsx(raccolto.dati, { now, risolviLink: (percorso) => cartellaFoto(percorso, scritti) })
  const pronto = await backupCompleto(raccolto, registro, file, now)
  const written = await Filesystem.writeFile({
    path: pronto.name,
    data: await blobBase64(pronto.blob),
    directory: Directory.Cache,
  })
  try {
    await DriveAuth.carica({
      cartella: cartellaBackup(raccolto.manifest.salone.nome),
      nome: pronto.name,
      percorso: written.uri,
    })
    localStorage.setItem(chiaveInvioDrive(uid), now.toISOString())
  } finally {
    await Filesystem.deleteFile({ path: pronto.name, directory: Directory.Cache }).catch(() => undefined)
  }
}

export async function provaInvioAutomatico(uid: string, now: Date): Promise<'inviato' | 'saltato'> {
  if (!getSettings(uid).backup.autoDaily) return 'saltato'
  if (!invioDriveDovuto(uid, now)) return 'saltato'
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'saltato'
  const rete = await DriveAuth.wifi()
  if (!rete.wifi) return 'saltato'
  const account = await DriveAuth.leggi()
  if (!account.collegato) return 'saltato'
  await inviaBackupSuDrive(uid, now)
  return 'inviato'
}
