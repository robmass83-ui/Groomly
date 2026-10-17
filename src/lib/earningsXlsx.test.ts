import { describe, expect, it } from 'vitest'
import type { ExportData } from './earningsExport'
import { toXlsx } from './earningsXlsx'

function exportFixture(): ExportData {
  return {
    title: 'Riepilogo incassi · Settembre 2026',
    periodLabel: '01/09/2026 - 30/09/2026',
    business: { name: 'I Pelosetti', vatNumber: '123', phone: '06 555', address: 'Via Roma 1' },
    incassato: 40,
    appuntamenti: 1,
    giorni: 1,
    media: 40,
    pagamenti: {
      pos: { importo: 40, count: 1 },
      contanti: { importo: 0, count: 0 },
      nonIndicato: { importo: 0, count: 0 },
      offerti: 0,
    },
    servizi: [{ key: 'bagno', name: 'Bagno', count: 1, amount: 40 }],
    gruppi: [{ label: '1–7', count: 1, amount: 40 }],
    gruppoTitolo: 'Settimana',
    rows: [{
      date: '02/09/2026',
      time: '09:30',
      dog: 'Zeus',
      owner: 'Laura',
      services: 'Bagno',
      minutes: 30,
      amount: 40,
      payment: 'POS',
      status: 'completato',
      missedAmount: 0,
    }],
    missed: [{
      date: '06/09/2026',
      time: '10:00',
      dog: 'Fido',
      owner: 'Mario',
      services: 'Bagno',
      minutes: 30,
      amount: 0,
      payment: '',
      status: 'disdetto dal cliente',
      missedAmount: 35,
    }],
    daChiudere: 0,
    generatedAt: new Date(2026, 9, 17, 9, 40),
  }
}

type WorkbookModule = typeof import('exceljs')

async function readSheet(blob: Blob) {
  const excel = await import('exceljs') as WorkbookModule & { default?: WorkbookModule }
  const ExcelJS = excel.default ?? excel
  const book = new ExcelJS.Workbook()
  await book.xlsx.load(await blob.arrayBuffer())
  return book.worksheets[0]
}

function argb(fill: { fgColor?: { argb?: string } } | undefined): string | undefined {
  return fill && 'fgColor' in fill ? fill.fgColor?.argb : undefined
}

function filterBounds(filter: unknown): { from: number; to: number } {
  if (typeof filter === 'string') {
    const match = /[A-Z]+(\d+):[A-Z]+(\d+)/.exec(filter)
    if (!match) throw new Error(`filtro illeggibile: ${filter}`)
    return { from: Number(match[1]), to: Number(match[2]) }
  }
  if (filter && typeof filter === 'object' && 'from' in filter && 'to' in filter) {
    const range = filter as { from: { row: number }; to: { row: number } }
    return { from: range.from.row, to: range.to.row }
  }
  throw new Error('manca il filtro')
}

function headerRowNumber(sheet: { rowCount: number; getRow: (n: number) => { getCell: (n: number) => { value: unknown } } }): number {
  for (let row = 1; row <= sheet.rowCount; row += 1) {
    if (sheet.getRow(row).getCell(1).value === 'Data') return row
  }
  throw new Error('manca la riga Data')
}

function columnOf(sheet: { getRow: (n: number) => { getCell: (n: number) => { value: unknown } } }, row: number, label: string): number {
  for (let column = 1; column <= 12; column += 1) {
    if (sheet.getRow(row).getCell(column).value === label) return column
  }
  throw new Error(`manca la colonna ${label}`)
}

describe('toXlsx', () => {
  it('formatta titolo, intestazioni, filtro e numeri', async () => {
    const data = exportFixture()
    const blob = await toXlsx(data, { riepilogo: true, dettaglio: true, attivita: true, mancati: false, pagamento: true })
    const sheet = await readSheet(blob)

    expect(sheet.workbook.worksheets).toHaveLength(1)
    expect(sheet.name).toBe('Riepilogo incassi')
    expect(sheet.getCell('A1').value).toBe('Riepilogo incassi')
    expect(sheet.getCell('A1').font?.bold).toBe(true)
    expect(argb(sheet.getCell('A1').fill as { fgColor?: { argb?: string } })).toBe('FF1F2937')
    expect(sheet.getCell('A2').value).toBe(data.periodLabel)

    const header = headerRowNumber(sheet)
    const headerCell = sheet.getRow(header).getCell(1)
    expect(headerCell.font?.bold).toBe(true)
    expect(headerCell.font?.color?.argb).toBe('FFFFFFFF')
    expect(argb(headerCell.fill as { fgColor?: { argb?: string } })).toBe('FF1F2937')
    expect(columnOf(sheet, header, 'Pagamento')).toBeGreaterThan(0)

    const importo = columnOf(sheet, header, 'Importo (€)')
    const dataRow = sheet.getRow(header + 1)
    const date = dataRow.getCell(1).value
    expect(date).toBeInstanceOf(Date)
    expect((date as Date).getFullYear()).toBe(2026)
    expect((date as Date).getMonth()).toBe(8)
    expect((date as Date).getDate()).toBe(2)
    expect(dataRow.getCell(2).value).toBe('09:30')
    expect(dataRow.getCell(importo).value).toBe(40)
    expect(typeof dataRow.getCell(importo).value).toBe('number')
    expect(dataRow.getCell(columnOf(sheet, header, 'Durata (min)')).value).toBe(30)

    const lastData = header + data.rows.length
    const bounds = filterBounds(sheet.autoFilter)
    expect(bounds.from).toBe(header)
    expect(bounds.to).toBe(lastData)
    const total = sheet.getRow(lastData + 1)
    expect(total.getCell(columnOf(sheet, header, 'Durata (min)')).value).toBe('Totale')
    expect(total.getCell(importo).value).toBe(data.incassato)
    expect(typeof total.getCell(importo).value).toBe('number')
    expect(bounds.to).toBeLessThan(lastData + 1)

    const frozen = sheet.views[0] as { state?: string; ySplit?: number }
    expect(frozen?.state).toBe('frozen')
    expect(Number(frozen?.ySplit)).toBe(header)

    let serviceHeader = 0
    for (let row = lastData + 1; row <= sheet.rowCount; row += 1) {
      if (sheet.getRow(row).getCell(1).value === 'Servizio') serviceHeader = row
    }
    expect(serviceHeader).toBeGreaterThan(lastData + 1)
    const serviceTotal = sheet.getRow(serviceHeader + 1 + data.servizi.length)
    expect(serviceTotal.getCell(1).value).toBe('Totale')
    expect(serviceTotal.getCell(2).value).toBe(1)
    expect(serviceTotal.getCell(3).value).toBe(40)
    expect(typeof serviceTotal.getCell(3).value).toBe('number')
    expect(sheet.getRow(serviceTotal.number + 2).getCell(1).value).toBe('Settimana')
    expect(bounds.to).toBeLessThan(serviceHeader)

    const hidden = await readSheet(await toXlsx(data, { riepilogo: true, dettaglio: true, attivita: true, mancati: false, pagamento: false }))
    const hiddenHeader = headerRowNumber(hidden)
    for (let column = 1; column <= 12; column += 1) {
      expect(hidden.getRow(hiddenHeader).getCell(column).value).not.toBe('Pagamento')
    }
  })
})
