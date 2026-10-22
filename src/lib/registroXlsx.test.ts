import { describe, expect, it } from 'vitest'
import type { GroomlyDati } from './backupBundle'
import { registroXlsx } from './registroXlsx'

const NOW = new Date('2026-10-23T12:00:00.000Z')
const VISITA = '2026-10-22T21:30:00.000Z'

function dati(): GroomlyDati {
  return {
    versioneFormato: 1,
    dogs: {
      d1: {
        id: 'd1', name: 'Fido', breed: 'Barboncino', size: 'piccola', sex: 'M', birthYear: 2019,
        temperament: 'bravo', contact: { name: 'Ada', phone: '0333' },
        contacts: [{ id: 'c', name: 'Ada', role: '', phone: '0333', isPrimary: true }],
        photo: 'file:f1', gallery: [], status: 'attivo', notes: 'Lame 4',
      },
    },
    appointments: {
      a1: {
        id: 'a1', dogId: 'd1', start: VISITA, status: 'completato',
        services: [{ serviceId: 's', name: 'Bagno', durationMin: 30, price: 10 }],
        photos: [{ id: 'p', photo: 'file:f1', kind: 'prima' }],
      },
    },
    services: {
      s: { id: 's', name: 'Bagno', kind: 'principale', price: { piccola: 10, media: 20, grande: 30 }, durationMin: { piccola: 30, media: 40, grande: 50 }, order: 1, active: true },
    },
    settings: { business: { salonName: 'Pelosetti' } },
    closures: {},
    files: { f1: { id: 'f1', kind: 'foto', owner: 'dog:d1', name: 'profilo.webp', mime: 'image/webp', byteSize: 1, chunkCount: 1, createdAt: VISITA, createdBy: 'u', estensione: '.webp', percorsoBackup: 'cani/C0001/profilo.webp', esito: 'ok' } },
    deletedDogs: { ids: [], appointmentIds: [] },
    codiciCane: { next: 2, cartella: 'cani', byId: { d1: 'C0001' } },
    fotoMancanti: [],
  }
}

async function book(blob: Blob) {
  const excel = await import('exceljs')
  const ExcelJS = excel.default ?? excel
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await blob.arrayBuffer())
  return workbook
}

describe('registroXlsx', () => {
  it('apre su Cani, con data di Roma e telefono testo', async () => {
    const workbook = await book(await registroXlsx(dati(), { now: NOW }))
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Cani', 'Appuntamenti', 'Clienti', 'Incassi mensili', 'Listino', 'Info'])
    expect(workbook.views?.[0]?.activeTab ?? 0).toBe(0)
    const cani = workbook.getWorksheet('Cani')
    const headers = (cani?.getRow(1).values as unknown[]).filter((value) => value !== undefined)
    expect(headers).not.toContain('Cartella foto')
    expect(headers).toContain('Telefono')
    const phone = cani?.getRow(2).getCell(headers.indexOf('Telefono') + 1)
    expect(phone?.value).toBe('0333')
    expect(phone?.numFmt).toBe('@')
    const visite = workbook.getWorksheet('Appuntamenti')
    const visitHeaders = (visite?.getRow(1).values as unknown[]).filter((value) => value !== undefined)
    const data = visite?.getRow(2).getCell(visitHeaders.indexOf('Data') + 1).value as Date
    expect(data.getUTCFullYear()).toBe(2026)
    expect(data.getUTCMonth()).toBe(9)
    expect(data.getUTCDate()).toBe(22)
    expect(data.getUTCHours()).toBe(0)
    expect(visite?.getRow(2).getCell(visitHeaders.indexOf('Ora') + 1).value).toBe('23:30')
    const stato = visite?.getRow(2).getCell(visitHeaders.indexOf('Stato') + 1)
    expect(stato?.value).toBe('Completato')
    expect(stato?.fill && 'fgColor' in stato.fill ? stato.fill.fgColor?.argb : '').toBe('FFE2F4EA')
    const info = workbook.getWorksheet('Info')
    expect(info?.getCell('B1').value).toBe('Pelosetti')
    expect(String(info?.getCell('B2').value)).toContain('+02:00')
  })

  it('con risolviLink aggiunge Apri cartella', async () => {
    const workbook = await book(await registroXlsx(dati(), { now: NOW, risolviLink: () => 'https://esempio/cartella' }))
    const cani = workbook.getWorksheet('Cani')
    const headers = (cani?.getRow(1).values as unknown[]).filter((value) => value !== undefined)
    const cell = cani?.getRow(2).getCell(headers.indexOf('Cartella foto') + 1)
    const raw = cell?.value
    const text = raw && typeof raw === 'object' && 'text' in raw ? raw.text : cell?.text
    const href = raw && typeof raw === 'object' && 'hyperlink' in raw ? raw.hyperlink : cell?.hyperlink
    expect(text).toBe('Apri cartella')
    expect(href).toBe('https://esempio/cartella')
  })

  it('risolviLink vuoto lascia la cella vuota', async () => {
    const workbook = await book(await registroXlsx(dati(), { now: NOW, risolviLink: () => '' }))
    const cani = workbook.getWorksheet('Cani')
    const headers = (cani?.getRow(1).values as unknown[]).filter((value) => value !== undefined)
    expect(headers).toContain('Cartella foto')
    const cell = cani?.getRow(2).getCell(headers.indexOf('Cartella foto') + 1)
    const raw = cell?.value
    const text = raw && typeof raw === 'object' && 'text' in raw ? raw.text : cell?.text
    const href = raw && typeof raw === 'object' && 'hyperlink' in raw ? raw.hyperlink : cell?.hyperlink
    expect(text).not.toBe('Apri cartella')
    expect(raw === null || raw === '').toBe(true)
    expect(href ?? '').toBe('')
  })

  it('un registro vuoto si apre', async () => {
    const empty = dati()
    empty.dogs = {}
    empty.appointments = {}
    empty.services = {}
    empty.files = {}
    const workbook = await book(await registroXlsx(empty, { now: NOW }))
    expect(workbook.getWorksheet('Cani')?.getRow(1).getCell(1).value).toBe('Codice')
    expect(workbook.getWorksheet('Incassi mensili')?.getRow(1).getCell(1).value).toBe('Mese')
  })
})
