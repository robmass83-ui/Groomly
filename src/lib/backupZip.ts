import JSZip from 'jszip'
import type { BackupManifest } from './backupBundle'
import { nomeSicuro } from './nomeSicuro'
import { romeDay } from './romeTime'

function nomeSalone(manifest: BackupManifest): string {
  return manifest.salone.nome.trim() || 'Groomly'
}

function leggiMi(manifest: BackupManifest): string {
  const counts = manifest.conteggi
  return [
    'Backup Groomly',
    `Salone: ${nomeSalone(manifest)}`,
    `Creato: ${manifest.creatoIl}`,
    '',
    'Questo file contiene i dati del salone e il Registro Excel.',
    'Estrai lo ZIP prima di aprire l\'Excel.',
    '',
    'Le cartelle delle foto arrivano con il backup completo.',
    '',
    `Cani: ${counts.cani}`,
    `Clienti: ${counts.clienti}`,
    `Appuntamenti: ${counts.appuntamenti}`,
    `Foto: ${counts.foto}`,
    `File del listino: ${counts.fileListino}`,
    '',
  ].join('\n')
}

export async function backupZip(
  raccolto: { json: string; manifest: BackupManifest },
  registro: Blob,
  now: Date,
): Promise<{ blob: Blob; name: string }> {
  const zip = new JSZip()
  zip.file('LEGGIMI.txt', leggiMi(raccolto.manifest))
  zip.file('Registro Groomly.xlsx', await registro.arrayBuffer())
  zip.file('dati/manifest.json', JSON.stringify(raccolto.manifest, null, 2))
  zip.file('dati/groomly-dati.json', raccolto.json)
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' })
  const name = `Groomly Backup – ${nomeSicuro(nomeSalone(raccolto.manifest))} – ${romeDay(now)}.zip`
  return { blob, name }
}
