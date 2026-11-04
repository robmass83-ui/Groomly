import JSZip from 'jszip'
import type { BackupManifest } from './backupBundle'
import { nomeSicuro } from './nomeSicuro'
import { romeDay } from './romeTime'
import { frase } from '../i18n/frase'

function nomeSalone(manifest: BackupManifest): string {
  return manifest.salone.nome.trim() || 'Groomly'
}

function leggiMi(manifest: BackupManifest): string {
  const counts = manifest.conteggi
  return [
    frase('bakLeggimiTitolo'),
    frase('bakLeggimiSalone', { nome: nomeSalone(manifest) }),
    frase('bakLeggimiCreato', { data: manifest.creatoIl }),
    '',
    frase('bakLeggimiDati'),
    frase('bakLeggimiEstrai'),
    '',
    frase('bakLeggimiCartelle'),
    '',
    frase('bakLeggimiCani', { n: counts.cani }),
    frase('bakLeggimiClienti', { n: counts.clienti }),
    frase('bakLeggimiAppuntamenti', { n: counts.appuntamenti }),
    frase('bakLeggimiFoto', { n: counts.foto }),
    frase('bakLeggimiFileListino', { n: counts.fileListino }),
    '',
  ].join('\n')
}

export async function backupZip(
  raccolto: { json: string; manifest: BackupManifest },
  registro: Blob,
  now: Date,
): Promise<{ blob: Blob; name: string }> {
  const zip = new JSZip()
  zip.file(frase('bakFileLeggimi'), leggiMi(raccolto.manifest))
  zip.file(`${frase('regTitolo')}.xlsx`, await registro.arrayBuffer())
  zip.file('dati/manifest.json', JSON.stringify(raccolto.manifest, null, 2))
  zip.file('dati/groomly-dati.json', raccolto.json)
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' })
  const name = `Groomly Backup – ${nomeSicuro(nomeSalone(raccolto.manifest))} – ${romeDay(now)}.zip`
  return { blob, name }
}
