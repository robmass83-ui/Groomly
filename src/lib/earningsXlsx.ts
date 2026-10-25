import { Workbook, type FillPattern } from 'exceljs'
import { frasiReport, type FrasiReport } from '../i18n/report'
import { wantsPayment, type ExportData, type ExportInclude, type ExportRow } from './earningsExport'

const MONEY = '#,##0.00'
const DATE_FMT = 'dd/mm/yyyy'

const WIDTH: Record<string, number> = {
  Data: 12,
  Ora: 8,
  Cane: 18,
  Proprietario: 22,
  Servizi: 36,
  'Durata (min)': 14,
  'Importo (€)': 14,
  Pagamento: 16,
  Stato: 22,
  'Importo mancato (€)': 20,
}

function titleFill(): FillPattern {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' }, bgColor: { argb: 'FF1F2937' } }
}

function titleFont(): { bold: true; color: { argb: string } } {
  return { bold: true, color: { argb: 'FFFFFFFF' } }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function parseDay(value: string): Date {
  const [day, month, year] = value.split('/').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function detailHeaders(include: ExportInclude, frasi: FrasiReport): string[] {
  const headers = [frasi.data, frasi.ora, frasi.cane, frasi.proprietario, frasi.servizi, frasi.durata, frasi.importo]
  if (wantsPayment(include)) headers.push(frasi.pagamento)
  headers.push(frasi.stato)
  if (include.mancati) headers.push(frasi.importoMancato)
  return headers
}

function detailValues(row: ExportRow, include: ExportInclude): Array<string | number | Date> {
  const cells: Array<string | number | Date> = [
    parseDay(row.date),
    row.time,
    row.dog,
    row.owner,
    row.services,
    row.minutes,
    row.amount,
  ]
  if (wantsPayment(include)) cells.push(row.payment)
  cells.push(row.status)
  if (include.mancati) cells.push(row.missedAmount)
  return cells
}

function moneyColumns(headers: string[], frasi: FrasiReport): Set<number> {
  const columns = new Set<number>()
  headers.forEach((header, index) => {
    if (header === frasi.importo || header === frasi.importoMancato) columns.add(index + 1)
  })
  return columns
}

export async function toXlsx(data: ExportData, include: ExportInclude): Promise<Blob> {
  const frasi = frasiReport(data.lingua ?? 'it')
  const headers = include.dettaglio ? detailHeaders(include, frasi) : []
  const tableWidth = headers.length > 0 ? headers.length : 3
  const book = new Workbook()
  const sheet = book.addWorksheet(frasi.foglio.slice(0, 31))

  sheet.mergeCells(1, 1, 1, tableWidth)
  const title = sheet.getCell(1, 1)
  title.value = frasi.titolo
  title.font = titleFont()
  title.fill = titleFill()

  sheet.getCell(2, 1).value = data.periodLabel

  let rowNumber = 3
  if (include.attivita && data.business) {
    const lines: Array<[string, string]> = [
      [frasi.attivita, data.business.name],
      [frasi.piva, data.business.vatNumber],
      [frasi.indirizzo, data.business.address],
      [frasi.telefono, data.business.phone],
    ]
    for (const [label, value] of lines) {
      sheet.getCell(rowNumber, 1).value = label
      sheet.getCell(rowNumber, 2).value = value
      rowNumber += 1
    }
  }

  if (include.dettaglio) {
    const headerRow = rowNumber
    headers.forEach((header, index) => {
      const cell = sheet.getCell(headerRow, index + 1)
      cell.value = header
      cell.font = titleFont()
      cell.fill = titleFill()
      const column = sheet.getColumn(index + 1)
      column.width = WIDTH[header] ?? 16
      if (header === frasi.servizi) column.alignment = { wrapText: true }
    })
    rowNumber += 1

    const body = include.mancati ? [...data.rows, ...data.missed] : data.rows
    const amounts = moneyColumns(headers, frasi)
    const dateColumn = headers.indexOf(frasi.data) + 1
    for (const item of body) {
      detailValues(item, include).forEach((value, index) => {
        const cell = sheet.getCell(rowNumber, index + 1)
        cell.value = value
        if (index + 1 === dateColumn) cell.numFmt = DATE_FMT
        if (amounts.has(index + 1)) cell.numFmt = MONEY
        if (headers[index] === frasi.servizi) cell.alignment = { wrapText: true }
      })
      rowNumber += 1
    }

    const lastDataRow = Math.max(headerRow, rowNumber - 1)
    const amountColumn = headers.indexOf(frasi.importo) + 1
    const totalLabelColumn = headers.indexOf(frasi.durata) + 1
    sheet.getCell(rowNumber, totalLabelColumn).value = frasi.totale
    const totalAmount = sheet.getCell(rowNumber, amountColumn)
    totalAmount.value = data.incassato
    totalAmount.numFmt = MONEY

    sheet.autoFilter = {
      from: { row: headerRow, column: 1 },
      to: { row: lastDataRow, column: headers.length },
    }
    sheet.views = [{ state: 'frozen', ySplit: headerRow }]
    rowNumber += 1
  }

  if (include.riepilogo) {
    rowNumber += 1
    ;[frasi.servizio, frasi.volte, frasi.importo].forEach((header, index) => {
      sheet.getCell(rowNumber, index + 1).value = header
    })
    rowNumber += 1
    for (const service of data.servizi) {
      sheet.getCell(rowNumber, 1).value = service.name
      sheet.getCell(rowNumber, 2).value = service.count
      const amount = sheet.getCell(rowNumber, 3)
      amount.value = service.amount
      amount.numFmt = MONEY
      rowNumber += 1
    }
    const volte = data.servizi.reduce((sum, service) => sum + service.count, 0)
    const importo = round2(data.servizi.reduce((sum, service) => sum + service.amount, 0))
    sheet.getCell(rowNumber, 1).value = frasi.totale
    sheet.getCell(rowNumber, 2).value = volte
    const serviceTotal = sheet.getCell(rowNumber, 3)
    serviceTotal.value = importo
    serviceTotal.numFmt = MONEY
    rowNumber += 2
    ;[data.gruppoTitolo === 'Mese' ? frasi.mese : frasi.settimana, frasi.app, frasi.importo].forEach((header, index) => {
      sheet.getCell(rowNumber, index + 1).value = header
    })
    rowNumber += 1
    for (const group of data.gruppi) {
      sheet.getCell(rowNumber, 1).value = group.label
      sheet.getCell(rowNumber, 2).value = group.count
      const amount = sheet.getCell(rowNumber, 3)
      amount.value = group.amount
      amount.numFmt = MONEY
      rowNumber += 1
    }
  }

  const buffer = await book.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
