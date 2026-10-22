import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { backupCompleto, cartellaFoto } from './backupCompleto'
import { buildManifest, canonicalJson, sha256Hex, type BackupFileMeta, type BackupManifest, type GroomlyDati } from './backupBundle'
import { registroXlsx } from './registroXlsx'

const NOW = new Date('2026-10-22T12:00:00.000Z')
const PERCORSO = 'cani/C0001 - Fido/profilo.webp'

function meta(id: string, percorsoBackup: string, extra: Partial<BackupFileMeta> = {}): BackupFileMeta {
  return {
    id,
    kind: 'foto',
    owner: 'dog:d1',
    name: 'profilo.webp',
    mime: 'image/webp',
    byteSize: 3,
    chunkCount: 0,
    createdAt: '2026-10-22T12:00:00.000Z',
    createdBy: 'u',
    estensione: '.webp',
    percorsoBackup,
    esito: 'ok',
    ...extra,
  }
}

function dati(salonName: string): GroomlyDati {
  return {
    versioneFormato: 1,
    dogs: {
      d1: {
        id: 'd1', name: 'Fido', breed: 'Barboncino',
        contact: { name: 'Ada', phone: '0333' },
        photo: 'file:f1', gallery: [], status: 'attivo',
      },
    },
    appointments: {},
    services: {},
    settings: { business: { salonName } },
    closures: {},
    files: { f1: meta('f1', PERCORSO) },
    deletedDogs: { ids: [], appointmentIds: [] },
    codiciCane: { next: 2, cartella: 'cani', byId: { d1: 'C0001' } },
    fotoMancanti: [
      { id: 'm1', motivo: 'assente' },
      { id: 'm2', motivo: 'dimensione', byteSize: 12, lunghezza: 9 },
    ],
  }
}

async function raccolto(salonName: string, base = dati(salonName)) {
  const json = canonicalJson(base)
  const checksum = await sha256Hex(json)
  const manifest = buildManifest(base, { now: NOW, salonId: 'salon', checksum, includiByte: true })
  return { base, json, checksum, manifest }
}

async function voci(blob: Blob) {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer())
  const files = Object.values(zip.files).filter((file) => !file.dir).map((file) => file.name).sort()
  return { zip, files }
}

function magic(file: JSZip.JSZipObject): string {
  const data = file as JSZip.JSZipObject & { _data?: { compression?: { magic?: string } } }
  return data._data?.compression?.magic ?? ''
}

function leggiMi(manifest: BackupManifest, mancanti: number): string {
  const nome = manifest.salone.nome.trim() || 'Groomly'
  const counts = manifest.conteggi
  const lines = [
    'Backup Groomly',
    `Salone: ${nome}`,
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

describe('cartellaFoto', () => {
  it('apre la cartella solo se contiene un file scritto', () => {
    expect(cartellaFoto(PERCORSO, [PERCORSO])).toBe('cani/C0001 - Fido/')
    expect(cartellaFoto(PERCORSO, ['cani/C0001 - Fido/2026-10-15 - Bagno/prima-01.webp'])).toBe('')
    expect(cartellaFoto('profilo.webp', ['profilo.webp'])).toBe('')
  })
})

describe('backupCompleto', () => {
  it('mette i file letti, i mancanti e il Registro con la cartella', async () => {
    const pronto = await raccolto('Pelosetti')
    const percorsi = [PERCORSO, 'listino/logo.webp']
    const registro = await registroXlsx(pronto.base, { now: NOW, risolviLink: (percorso) => cartellaFoto(percorso, percorsi) })
    const file = await backupCompleto(
      { json: pronto.json, manifest: pronto.manifest, dati: pronto.base },
      registro,
      [{ percorso: PERCORSO, bytes: Uint8Array.of(1, 2, 3) }, { percorso: 'listino/logo.webp', bytes: Uint8Array.of(4, 5) }],
      NOW,
    )
    expect(file.blob.type).toBe('application/zip')
    expect(file.name).toBe('Groomly Backup completo – Pelosetti – 2026-10-22.zip')
    const opened = await voci(file.blob)
    expect(opened.files).toEqual([
      'LEGGIMI.txt',
      'Registro Groomly.xlsx',
      PERCORSO,
      'dati/foto-mancanti.txt',
      'dati/groomly-dati.json',
      'dati/manifest.json',
      'listino/logo.webp',
    ])
    expect(await opened.zip.file('dati/foto-mancanti.txt')!.async('string')).toBe('m1 assente\nm2 dimensione 12 9\n')
    const json = await opened.zip.file('dati/groomly-dati.json')!.async('string')
    expect(json).toBe(pronto.json)
    expect(await sha256Hex(json)).toBe(pronto.checksum)
    const manifest = JSON.parse(await opened.zip.file('dati/manifest.json')!.async('string')) as BackupManifest
    expect(manifest.tipo).toBe('completo')
    expect(manifest.fotoIncluse).toBe(true)
    expect(manifest.checksum['groomly-dati.json']).toBe(pronto.checksum)
    expect(await opened.zip.file('LEGGIMI.txt')!.async('string')).toBe(leggiMi(pronto.manifest, 2))
    expect(magic(opened.zip.file(PERCORSO)!)).toBe('\x00\x00')
    expect(magic(opened.zip.file('Registro Groomly.xlsx')!)).toBe('\x00\x00')
    expect(magic(opened.zip.file('LEGGIMI.txt')!)).toBe('\x08\x00')
    expect(await opened.zip.file(PERCORSO)!.async('uint8array')).toEqual(Uint8Array.of(1, 2, 3))
    const excel = await import('exceljs')
    const ExcelJS = excel.default ?? excel
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await opened.zip.file('Registro Groomly.xlsx')!.async('arraybuffer'))
    const cani = workbook.getWorksheet('Cani')
    const headers = (cani?.getRow(1).values as unknown[]).filter((value) => value !== undefined)
    const cell = cani?.getRow(2).getCell(headers.indexOf('Cartella foto') + 1)
    const raw = cell?.value
    const text = raw && typeof raw === 'object' && 'text' in raw ? raw.text : cell?.text
    const href = raw && typeof raw === 'object' && 'hyperlink' in raw ? raw.hyperlink : cell?.hyperlink
    expect(text).toBe('Apri cartella')
    expect(href).toBe('cani/C0001 - Fido/')
  })

  it('senza mancanti non scrive l elenco', async () => {
    const base = dati('Pelosetti')
    base.fotoMancanti = []
    const pronto = await raccolto('Pelosetti', base)
    const registro = await registroXlsx(pronto.base, { now: NOW })
    const file = await backupCompleto({ json: pronto.json, manifest: pronto.manifest, dati: pronto.base }, registro, [], NOW)
    const opened = await voci(file.blob)
    expect(opened.files).not.toContain('dati/foto-mancanti.txt')
    expect(await opened.zip.file('LEGGIMI.txt')!.async('string')).not.toContain('Foto non lette')
  })

  it('sistema il nome vuoto e il nome con la barra', async () => {
    const registro = await registroXlsx(dati('Pelosetti'), { now: NOW })
    const vuoto = dati('')
    vuoto.fotoMancanti = []
    const primo = await raccolto('', vuoto)
    const fileVuoto = await backupCompleto({ json: primo.json, manifest: primo.manifest, dati: primo.base }, registro, [], NOW)
    expect(fileVuoto.name).toBe('Groomly Backup completo – Groomly – 2026-10-22.zip')
    const slash = dati('A/B')
    slash.fotoMancanti = []
    const secondo = await raccolto('A/B', slash)
    const fileSlash = await backupCompleto({ json: secondo.json, manifest: secondo.manifest, dati: secondo.base }, registro, [], NOW)
    expect(fileSlash.name).toContain('AB')
    expect(await (await JSZip.loadAsync(await fileSlash.blob.arrayBuffer())).file('LEGGIMI.txt')!.async('string')).toContain('Salone: A/B')
  })
})
