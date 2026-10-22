import { Workbook, type FillPattern, type WorkbookView, type Worksheet } from 'exceljs'
import type { GroomlyDati } from './backupBundle'
import { costruisciRegistro, type RigaMese } from './registroModello'

export type RegistroOpzioni = { now: Date; risolviLink?: (percorsoBackup: string) => string }

const HEADER: FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3A5BA0' } }
const STRIPE: FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6ECF8' } }
const FONDI: Record<string, FillPattern> = {
  Completato: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2F4EA' } },
  Programmato: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FA' } },
  Disdetto: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCF0D8' } },
  'Non venuto': { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBE6E4' } },
}

type Cella = string | number | Date | null | { text: string; hyperlink: string }

function larghezza(sheet: Worksheet, headers: string[], rows: Cella[][]) {
  headers.forEach((header, index) => {
    const longest = rows.reduce((max, row) => {
      const cell = row[index]
      const text = cell instanceof Date ? '00/00/0000' : typeof cell === 'object' && cell ? cell.text : String(cell ?? '')
      return Math.max(max, text.length)
    }, header.length)
    sheet.getColumn(index + 1).width = Math.min(40, Math.max(10, longest + 2))
  })
}

function scriviTabella(sheet: Worksheet, name: string, headers: string[], rows: Cella[][], freezeCols: number) {
  if (rows.length === 0) {
    headers.forEach((header, index) => {
      const cell = sheet.getCell(1, index + 1)
      cell.value = header
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = HEADER
    })
  } else {
    sheet.addTable({
      name,
      ref: 'A1',
      headerRow: true,
      style: { showRowStripes: false },
      columns: headers.map((header) => ({ name: header, filterButton: true })),
      rows,
    })
    headers.forEach((_header, index) => {
      const cell = sheet.getCell(1, index + 1)
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = HEADER
    })
  }
  sheet.views = [{ state: 'frozen', ySplit: 1, xSplit: freezeCols, showGridLines: true }]
  rows.forEach((row, rowIndex) => {
    row.forEach((value, column) => {
      const cell = sheet.getCell(rowIndex + 2, column + 1)
      if (value instanceof Date) cell.numFmt = 'dd/mm/yyyy'
      if (headers[column] === 'Telefono') cell.numFmt = '@'
      if (headers[column] === 'Ultimo prezzo' || headers[column] === 'Totale speso' || headers[column] === 'Prezzo' || headers[column].startsWith('Prezzo ')) cell.numFmt = '€ #,##0.00'
      if (headers[column] === 'Tempo medio' && typeof value === 'number') cell.numFmt = '0.0'
      if (headers[column] === 'Note') cell.alignment = { wrapText: true, vertical: 'top' }
      if (rowIndex % 2 === 1 && headers[column] !== 'Stato') cell.fill = STRIPE
      if (headers[column] === 'Stato' && typeof value === 'string' && FONDI[value]) cell.fill = FONDI[value]
      if (value && typeof value === 'object' && 'hyperlink' in value) {
        cell.value = value
        cell.font = { color: { argb: 'FF3A5BA0' }, underline: true }
      }
    })
  })
  larghezza(sheet, headers, rows)
}

function link(opzioni: RegistroOpzioni, percorso: string): Cella {
  if (!opzioni.risolviLink || !percorso) return null
  return { text: 'Apri cartella', hyperlink: opzioni.risolviLink(percorso) }
}

export async function registroXlsx(dati: GroomlyDati, opzioni: RegistroOpzioni): Promise<Blob> {
  const registro = costruisciRegistro(dati, opzioni.now)
  const book = new Workbook()
  book.title = 'Registro Groomly'
  book.creator = registro.salone
  book.views = [{ activeTab: 0 } as WorkbookView]
  const conLink = Boolean(opzioni.risolviLink)

  const caniHeaders = ['Codice', 'Cane', 'Razza', 'Taglia', 'Sesso', 'Anno', 'Carattere', 'Padrone', 'Telefono', 'Appuntamenti', 'Primo', 'Ultimo', 'Prossimo', 'Ultimo servizio', 'Ultimo prezzo', 'Totale speso', 'Tempo medio', 'Note', 'Foto', 'Stato']
  if (conLink) caniHeaders.push('Cartella foto')
  const cani = book.addWorksheet('Cani')
  scriviTabella(cani, 'Cani', caniHeaders, registro.cani.map((row) => {
    const values: Cella[] = [row.codice, row.cane, row.razza, row.taglia, row.sesso, row.anno, row.carattere, row.padrone, row.telefono, row.appuntamenti, row.primo, row.ultimo, row.prossimo, row.ultimoServizio, row.ultimoPrezzo, row.totaleSpeso, row.tempoMedio, row.note, row.foto, row.stato]
    if (conLink) values.push(link(opzioni, row.percorso))
    return values
  }), 2)

  const visitaHeaders = ['Data', 'Ora', 'Codice', 'Cane', 'Razza', 'Padrone', 'Telefono', 'Servizio', 'Prezzo', 'Durata', 'Stato', 'Note', 'Foto']
  if (conLink) visitaHeaders.push('Cartella foto')
  const visite = book.addWorksheet('Appuntamenti')
  scriviTabella(visite, 'Appuntamenti', visitaHeaders, registro.visite.map((row) => {
    const values: Cella[] = [row.data, row.ora, row.codice, row.cane, row.razza, row.padrone, row.telefono, row.servizio, row.prezzo, row.durata, row.stato, row.note, row.foto]
    if (conLink) values.push(link(opzioni, row.percorso))
    return values
  }), 0)

  const clienti = book.addWorksheet('Clienti')
  scriviTabella(clienti, 'Clienti', ['Padrone', 'Telefono', 'Cani', 'Appuntamenti', 'Totale speso', 'Ultimo appuntamento'], registro.clienti.map((row) => [row.padrone, row.telefono, row.cani, row.appuntamenti, row.totaleSpeso, row.ultimo]), 0)

  const incassi = book.addWorksheet('Incassi mensili')
  const mesi: Cella[][] = registro.mesi.map((row: RigaMese) => [row.mese, row.appuntamenti, row.totale, row.media])
  scriviTabella(incassi, 'IncassiMensili', ['Mese', 'Appuntamenti', 'Totale', 'Media'], mesi, 0)
  registro.anni.forEach((row, index) => {
    const line = mesi.length + 3 + index
    ;[row.etichetta, row.appuntamenti, row.totale, row.media].forEach((value, column) => {
      const cell = incassi.getCell(line, column + 1)
      cell.value = value
      cell.font = { bold: true }
      if (column >= 2 && typeof value === 'number') cell.numFmt = '€ #,##0.00'
    })
  })

  const listino = book.addWorksheet('Listino')
  const serviziHeaders = ['Nome', 'Tipo', 'Prezzo piccola', 'Prezzo media', 'Prezzo grande', 'Durata piccola', 'Durata media', 'Durata grande', 'Attivo']
  const serviziRighe = registro.servizi.map((row) => [row.nome, row.tipo, row.prezzoPiccola, row.prezzoMedia, row.prezzoGrande, row.durataPiccola, row.durataMedia, row.durataGrande, row.attivo])
  scriviTabella(listino, 'Servizi', serviziHeaders, serviziRighe, 0)
  const start = serviziRighe.length + 3
  const razzeHeaders = ['Razza', 'Taglia', 'Voce', 'Tipo', 'Prezzo']
  if (registro.razze.length === 0) {
    razzeHeaders.forEach((header, index) => {
      const cell = listino.getCell(start, index + 1)
      cell.value = header
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = HEADER
    })
  } else {
    listino.addTable({
      name: 'Razze',
      ref: `A${start}`,
      headerRow: true,
      style: { showRowStripes: false },
      columns: razzeHeaders.map((header) => ({ name: header, filterButton: true })),
      rows: registro.razze.map((row) => [row.razza, row.taglia, row.voce, row.tipo, row.prezzo]),
    })
    razzeHeaders.forEach((_header, index) => {
      const cell = listino.getCell(start, index + 1)
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = HEADER
    })
  }

  const info = book.addWorksheet('Info')
  const voci: Array<[string, string | number]> = [
    ['Salone', registro.salone],
    ['Creato il', registro.creatoIl],
    ['Versione app', registro.versione],
    ['Cani', registro.conteggi.cani],
    ['Clienti', registro.conteggi.clienti],
    ['Appuntamenti', registro.conteggi.appuntamenti],
    ['Foto', registro.conteggi.foto],
    ['File di listino', registro.conteggi.fileListino],
    ['Cartelle', 'La colonna delle cartelle foto arriva con il backup completo.'],
    ['Legenda', 'Completato verde, Programmato grigio, Disdetto ambra, Non venuto rosso'],
  ]
  voci.forEach(([label, value], index) => {
    info.getCell(index + 1, 1).value = label
    info.getCell(index + 1, 1).font = { bold: true }
    info.getCell(index + 1, 2).value = value
  })
  info.getColumn(1).width = 22
  info.getColumn(2).width = 72

  const buffer = await book.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
