import { Directory, Filesystem } from '@capacitor/filesystem'
import { AppError } from '../data/errors'
import { getSettings } from '../data/local/settings'
import { lasciaBlocco, prendiBlocco } from './backupLock'
import { DriveAuth } from './driveAuth'
import { pianoFoto } from './driveFoto'
import { pianoPermette } from './pianoSalvato'
import { cartellaBackup } from './driveRipristino'
import { chiamaPonte, ponteBackup } from './ponteBackup'
import { blobBase64 } from './shareFile'
import { chiaveErroreDrive, millisecondiFrequenza, prossimoBackup } from './statoDrive'

export function chiaveInvioDrive(uid: string): string {
  return `groomly.users.${uid}.driveUltimoInvio`
}

export function invioDriveDovuto(uid: string, now: Date, frequenza?: string): boolean {
  const raw = localStorage.getItem(chiaveInvioDrive(uid))
  if (!raw) return true
  const then = Date.parse(raw)
  if (Number.isNaN(then)) return true
  return now.getTime() - then >= millisecondiFrequenza(frequenza)
}

export function messaggioInvio(error: unknown): string {
  if (error instanceof Error && error.message === 'telefono') return 'Il collegamento a Google Drive funziona sul telefono'
  if (error instanceof Error && error.message === 'ricollega') return 'Ricollega Google Drive'
  if (error instanceof Error && error.message === 'occupato') return 'Un altro telefono sta facendo il backup'
  if (error instanceof AppError && error.code === 'backup_offline') return error.message
  return 'Invio su Drive non riuscito'
}

// Nel backup notturno Capacitor non c'è: i file passano dal ponte di Android.
async function scriviCache(path: string, data: string): Promise<string> {
  if (ponteBackup()) return (await chiamaPonte<{ uri: string }>('scrivi', { path, dati: data })).uri
  return (await Filesystem.writeFile({ path, data, directory: Directory.Cache })).uri
}

async function cancellaCache(path: string): Promise<void> {
  if (ponteBackup()) await chiamaPonte<void>('cancella', { path })
  else await Filesystem.deleteFile({ path, directory: Directory.Cache })
}

export async function inviaBackupSuDrive(uid: string, now: Date): Promise<void> {
  const nomi: string[] = []
  try {
    await prendiBlocco(now)
    const { raccogliBackup } = await import('../data/firebase/backupCollect')
    const { registroXlsx } = await import('../lib/registroXlsx')
    const { backupCompleto, cartellaFoto } = await import('../lib/backupCompleto')
    const scritti: string[] = []
    const file: { percorso: string; bytes: Uint8Array }[] = []
    const candidati: { id: string; percorso: string; bytes: Uint8Array }[] = []
    const raccolto = await raccogliBackup(now, {
      includiByte: true,
      onFile: (meta, bytes, percorso) => {
        scritti.push(percorso)
        file.push({ percorso, bytes })
        candidati.push({ id: meta.id, percorso, bytes })
      },
    })
    const registro = await registroXlsx(raccolto.dati, { now, risolviLink: (percorso) => cartellaFoto(percorso, scritti) })
    const pronto = await backupCompleto(raccolto, registro, file, now)
    const written = await scriviCache(pronto.name, await blobBase64(pronto.blob))
    nomi.push(pronto.name)
    const cartella = cartellaBackup(raccolto.manifest.salone.nome)
    await DriveAuth.carica({ cartella, nome: pronto.name, percorso: written })
    const registroPath = 'groomly-registro-ultimo.xlsx'
    const registroScritto = await scriviCache(registroPath, await blobBase64(registro))
    nomi.push(registroPath)
    await DriveAuth.registro({ cartella, nome: 'Registro Groomly – ULTIMO.xlsx', percorso: registroScritto })
    const piano = pianoFoto(candidati)
    const voci = []
    for (let index = 0; index < piano.length; index += 1) {
      const voce = piano[index]
      if (!voce) continue
      const origine = candidati.find((item) => item.id === voce.fileId)
      if (!origine) throw new Error('invio')
      const path = `groomly-foto-${index}.bin`
      const foto = await scriviCache(path, await blobBase64(new Blob([origine.bytes.buffer.slice(origine.bytes.byteOffset, origine.bytes.byteOffset + origine.bytes.byteLength) as ArrayBuffer])))
      nomi.push(path)
      voci.push({ ...voce, percorso: foto })
    }
    await DriveAuth.foto({ cartella, voci })
    localStorage.setItem(chiaveInvioDrive(uid), now.toISOString())
    localStorage.removeItem(chiaveErroreDrive(uid))
    // Android deve sapere che la copia c'è già, anche quando l'ha fatta la persona a mano.
    await programmaInvio(uid).catch(() => undefined)
  } catch (error) {
    localStorage.setItem(chiaveErroreDrive(uid), messaggioInvio(error))
    throw error
  } finally {
    await lasciaBlocco()
    for (const path of nomi) {
      await cancellaCache(path).catch(() => undefined)
    }
  }
}

export async function programmaInvio(uid: string): Promise<void> {
  const backup = getSettings(uid).backup
  const dovuto = prossimoBackup(localStorage.getItem(chiaveInvioDrive(uid)), backup.frequenza, backup.orario, new Date())
  await DriveAuth.programma({
    attivo: backup.autoDaily,
    wifi: backup.soloWifi !== false,
    carica: backup.soloCarica === true,
    dovuto,
  })
}

export async function provaInvioAutomatico(uid: string, now: Date): Promise<'inviato' | 'saltato'> {
  const backup = getSettings(uid).backup
  if (!backup.autoDaily) return 'saltato'
  if (!pianoPermette(uid, 'backupAuto', now)) return 'saltato'
  if (!invioDriveDovuto(uid, now, backup.frequenza)) return 'saltato'
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'saltato'
  if (backup.soloWifi !== false) {
    const rete = await DriveAuth.wifi()
    if (!rete.wifi) return 'saltato'
  }
  if (backup.soloCarica === true) {
    const batteria = await DriveAuth.inCarica()
    if (!batteria.carica) return 'saltato'
  }
  const account = await DriveAuth.leggi({ uid })
  if (!account.collegato) return 'saltato'
  await inviaBackupSuDrive(uid, now)
  return 'inviato'
}
