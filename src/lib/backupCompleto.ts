import JSZip from 'jszip'
import type { BackupManifest, GroomlyDati } from './backupBundle'
import { nomeSicuro } from './nomeSicuro'
import { romeDay } from './romeTime'

function nomeSalone(manifest: BackupManifest): string {
  return manifest.salone.nome.trim() || 'Groomly'
}

export function cartellaFoto(percorso: string, percorsiScritti: readonly string[]): string {
  const slash = percorso.lastIndexOf('/')
  if (slash <= 0) return ''
  const cartella = percorso.slice(0, slash)
  const prefix = `${cartella}/`
  const presente = percorsiScritti.some((path) => path.startsWith(prefix) && !path.slice(prefix.length).includes('/'))
  return presente ? prefix : ''
}

function rigaMancante(row: GroomlyDati['fotoMancanti'][number]): string {
  const parts = [row.id, row.motivo]
  if (row.byteSize !== undefined) parts.push(String(row.byteSize))
  if (row.lunghezza !== undefined) parts.push(String(row.lunghezza))
  return parts.join(' ')
}

function leggiMi(manifest: BackupManifest, mancanti: number): string {
  const counts = manifest.conteggi
  const lines = [
    'Backup Groomly',
    `Salone: ${nomeSalone(manifest)}`,
    `Creato: ${manifest.creatoIl}`,
    '',
    'Questo file contiene i dati del salone, il Registro Excel e le cartelle dei file.',
    'Estrai lo ZIP prima di aprire l\'Excel, altrimenti i link alle cartelle non funzionano.',
    '',
    `Cani: ${counts.cani}`,
    `Clienti: ${counts.clienti}`,
    `Appuntamenti: ${counts.appuntamenti}`,
    `Foto: ${counts.foto}`,
    `File del listino: ${counts.fileListino}`,
  ]
  if (mancanti > 0) {
    lines.push('', `Foto non lette: ${mancanti}`, 'L\'elenco è in dati/foto-mancanti.txt.')
  }
  lines.push('')
  return lines.join('\n')
}

export async function backupCompleto(
  raccolto: { json: string; manifest: BackupManifest; dati: GroomlyDati },
  registro: Blob,
  file: ReadonlyArray<{ percorso: string; bytes: Uint8Array }>,
  now: Date,
): Promise<{ blob: Blob; name: string }> {
  const zip = new JSZip()
  const mancanti = raccolto.dati.fotoMancanti
  zip.file('LEGGIMI.txt', leggiMi(raccolto.manifest, mancanti.length))
  zip.file('Registro Groomly.xlsx', await registro.arrayBuffer(), { compression: 'STORE' })
  zip.file('dati/manifest.json', JSON.stringify(raccolto.manifest, null, 2))
  zip.file('dati/groomly-dati.json', raccolto.json)
  if (mancanti.length > 0) zip.file('dati/foto-mancanti.txt', `${mancanti.map(rigaMancante).join('\n')}\n`)
  for (const item of file) zip.file(item.percorso, item.bytes, { compression: 'STORE' })
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip', compression: 'DEFLATE' })
  const name = `Groomly Backup completo – ${nomeSicuro(nomeSalone(raccolto.manifest))} – ${romeDay(now)}.zip`
  return { blob, name }
}
