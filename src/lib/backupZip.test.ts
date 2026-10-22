import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { backupZip } from './backupZip'
import { buildManifest, canonicalJson, sha256Hex, type BackupManifest, type GroomlyDati } from './backupBundle'
import { registroXlsx } from './registroXlsx'

const NOW = new Date('2026-10-22T12:00:00.000Z')

function dati(salonName: string): GroomlyDati {
  return {
    versioneFormato: 1,
    dogs: {},
    appointments: {},
    services: {},
    settings: { business: { salonName } },
    closures: {},
    files: {},
    deletedDogs: { ids: [], appointmentIds: [] },
    codiciCane: { next: 1, cartella: 'cani', byId: {} },
    fotoMancanti: [],
  }
}

async function raccolto(salonName: string) {
  const base = dati(salonName)
  const json = canonicalJson(base)
  const checksum = await sha256Hex(json)
  const manifest = buildManifest(base, { now: NOW, salonId: 'salon', checksum, includiByte: false })
  return { base, json, checksum, manifest }
}

async function voci(blob: Blob) {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer())
  const files = Object.values(zip.files).filter((file) => !file.dir).map((file) => file.name).sort()
  return { zip, files }
}

function leggiMi(manifest: BackupManifest): string {
  const nome = manifest.salone.nome.trim() || 'Groomly'
  const counts = manifest.conteggi
  return [
    'Backup Groomly',
    `Salone: ${nome}`,
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

describe('backupZip', () => {
  it('mette i quattro file, il checksum e il Registro senza cartelle', async () => {
    const pronto = await raccolto('Pelosetti')
    const registro = await registroXlsx(pronto.base, { now: NOW })
    const file = await backupZip({ json: pronto.json, manifest: pronto.manifest }, registro, NOW)
    expect(file.blob.type).toBe('application/zip')
    expect(file.name).toBe('Groomly Backup – Pelosetti – 2026-10-22.zip')
    const opened = await voci(file.blob)
    expect(opened.files).toEqual(['LEGGIMI.txt', 'Registro Groomly.xlsx', 'dati/groomly-dati.json', 'dati/manifest.json'])
    expect(Object.keys(opened.zip.files).some((name) => name.startsWith('cani/') || name.startsWith('listino/'))).toBe(false)
    const json = await opened.zip.file('dati/groomly-dati.json')!.async('string')
    expect(json).toBe(pronto.json)
    expect(await sha256Hex(json)).toBe(pronto.checksum)
    const manifest = JSON.parse(await opened.zip.file('dati/manifest.json')!.async('string')) as BackupManifest
    expect(manifest.tipo).toBe('solo-dati')
    expect(manifest.fotoIncluse).toBe(false)
    expect(manifest.checksum['groomly-dati.json']).toBe(pronto.checksum)
    expect(await opened.zip.file('LEGGIMI.txt')!.async('string')).toBe(leggiMi(pronto.manifest))
    const excel = await import('exceljs')
    const ExcelJS = excel.default ?? excel
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await opened.zip.file('Registro Groomly.xlsx')!.async('arraybuffer'))
    const headers = (workbook.getWorksheet('Cani')?.getRow(1).values as unknown[]).filter((value) => value !== undefined)
    expect(headers).not.toContain('Cartella foto')
  })

  it('usa Groomly se il salone non ha nome e toglie la barra dal nome del file', async () => {
    const vuoto = await raccolto('')
    const registro = await registroXlsx(vuoto.base, { now: NOW })
    const senzaNome = await backupZip({ json: vuoto.json, manifest: vuoto.manifest }, registro, NOW)
    expect(senzaNome.name).toBe('Groomly Backup – Groomly – 2026-10-22.zip')
    const slash = await raccolto('A/B')
    const conBarra = await backupZip({ json: slash.json, manifest: slash.manifest }, registro, NOW)
    expect(conBarra.name).toBe('Groomly Backup – AB – 2026-10-22.zip')
    const opened = await voci(conBarra.blob)
    expect(await opened.zip.file('LEGGIMI.txt')!.async('string')).toContain('Salone: A/B')
  })
})
