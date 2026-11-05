import JSZip from 'jszip'
import type { AltriDati } from './altriDati'
import type { BackupManifest, GroomlyDati } from './backupBundle'
import { nomeSicuro } from './nomeSicuro'
import { romeDay } from './romeTime'
import { frase } from '../i18n/frase'

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
    frase('bakLeggimiTitolo'),
    frase('bakLeggimiSalone', { nome: nomeSalone(manifest) }),
    frase('bakLeggimiCreato', { data: manifest.creatoIl }),
    '',
    frase('bakLeggimiCompleto'),
    frase('bakLeggimiEstraiLink'),
    '',
    frase('bakLeggimiCani', { n: counts.cani }),
    frase('bakLeggimiClienti', { n: counts.clienti }),
    frase('bakLeggimiAppuntamenti', { n: counts.appuntamenti }),
    frase('bakLeggimiFoto', { n: counts.foto }),
    frase('bakLeggimiFileListino', { n: counts.fileListino }),
  ]
  if (mancanti > 0) {
    lines.push('', frase('bakLeggimiFotoNonLette', { n: mancanti }), frase('bakLeggimiFotoElenco'))
  }
  lines.push('')
  return lines.join('\n')
}

export async function backupCompleto(
  raccolto: { json: string; manifest: BackupManifest; dati: GroomlyDati },
  registro: Blob,
  file: ReadonlyArray<{ percorso: string; bytes: Uint8Array }>,
  now: Date,
  altri?: AltriDati,
): Promise<{ blob: Blob; name: string }> {
  const zip = new JSZip()
  const mancanti = raccolto.dati.fotoMancanti
  zip.file(frase('bakFileLeggimi'), leggiMi(raccolto.manifest, mancanti.length))
  zip.file(`${frase('regTitolo')}.xlsx`, await registro.arrayBuffer(), { compression: 'STORE' })
  zip.file('dati/manifest.json', JSON.stringify(raccolto.manifest, null, 2))
  zip.file('dati/groomly-dati.json', raccolto.json)
  if (altri) {
    const { account, ...resto } = altri
    zip.file('dati/altri-dati.json', JSON.stringify(resto, null, 2))
    if (account) zip.file('dati/account.json', JSON.stringify(account, null, 2))
  }
  if (mancanti.length > 0) zip.file('dati/foto-mancanti.txt', `${mancanti.map(rigaMancante).join('\n')}\n`)
  for (const item of file) zip.file(item.percorso, item.bytes, { compression: 'STORE' })
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip', compression: 'DEFLATE' })
  const name = `Groomly Backup completo – ${nomeSicuro(nomeSalone(raccolto.manifest))} – ${romeDay(now)}.zip`
  return { blob, name }
}
