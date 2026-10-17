import { Workbook, type FillPattern } from 'exceljs'
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

function detailHeaders(include: ExportInclude): string[] {
  const headers = ['Data', 'Ora', 'Cane', 'Proprietario', 'Servizi', 'Durata (min)', 'Importo (€)']
  if (wantsPayment(include)) headers.push('Pagamento')
  headers.push('Stato')
  if (include.mancati) headers.push('Importo mancato (€)')
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

function moneyColumns(headers: string[]): Set<number> {
  const columns = new Set<number>()
  headers.forEach((header, index) => {
    if (header === 'Importo (€)' || header === 'Importo mancato (€)') columns.add(index + 1)
  })
  return columns
}

export async function toXlsx(data: ExportData, include: ExportInclude): Promise<Blob> {
  const headers = include.dettaglio ? detailHeaders(include) : []
  const tableWidth = headers.length > 0 ? headers.length : 3
  const book = new Workbook()
  const sheet = book.addWorksheet('Riepilogo incassi')

  sheet.mergeCells(1, 1, 1, tableWidth)
  const title = sheet.getCell(1, 1)
  title.value = 'Riepilogo incassi'
  title.font = titleFont()
  title.fill = titleFill()

  sheet.getCell(2, 1).value = data.periodLabel

  let rowNumber = 3
  if (include.attivita && data.business) {
    const lines: Array<[string, string]> = [
      ['Attività', data.business.name],
      ['P. IVA', data.business.vatNumber],
      ['Indirizzo', data.business.address],
      ['Telefono', data.business.phone],
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
      column.width = WIDTH[header]
      if (header === 'Servizi') column.alignment = { wrapText: true }
    })
    rowNumber += 1

    const body = include.mancati ? [...data.rows, ...data.missed] : data.rows
    const amounts = moneyColumns(headers)
    const dateColumn = headers.indexOf('Data') + 1
    for (const item of body) {
      detailValues(item, include).forEach((value, index) => {
        const cell = sheet.getCell(rowNumber, index + 1)
        cell.value = value
        if (index + 1 === dateColumn) cell.numFmt = DATE_FMT
        if (amounts.has(index + 1)) cell.numFmt = MONEY
        if (headers[index] === 'Servizi') cell.alignment = { wrapText: true }
      })
      rowNumber += 1
    }

    const lastDataRow = Math.max(headerRow, rowNumber - 1)
    const amountColumn = headers.indexOf('Importo (€)') + 1
    const totalLabelColumn = headers.indexOf('Durata (min)') + 1
    sheet.getCell(rowNumber, totalLabelColumn).value = 'Totale'
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
    ;['Servizio', 'Volte', 'Importo (€)'].forEach((header, index) => {
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
    sheet.getCell(rowNumber, 1).value = 'Totale'
    sheet.getCell(rowNumber, 2).value = volte
    const serviceTotal = sheet.getCell(rowNumber, 3)
    serviceTotal.value = importo
    serviceTotal.numFmt = MONEY
    rowNumber += 2
    ;[data.gruppoTitolo, 'App.', 'Importo (€)'].forEach((header, index) => {
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
