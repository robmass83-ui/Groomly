import { Workbook, type FillPattern, type WorkbookView, type Worksheet } from 'exceljs'
import { righeFoglio, type AltriDati } from './altriDati'
import type { GroomlyDati } from './backupBundle'
import { costruisciRegistro, type RigaMese } from './registroModello'
import { frase } from '../i18n/frase'
import type { Chiave } from '../i18n/t'

function testi(...chiavi: Chiave[]): string[] {
  return chiavi.map((chiave) => frase(chiave))
}

export type RegistroOpzioni = { now: Date; risolviLink?: (percorsoBackup: string) => string; altri?: AltriDati }

const HEADER: FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3A5BA0' } }
const STRIPE: FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6ECF8' } }
function fondi(): Record<string, FillPattern> {
  return {
    [frase('regCompletato')]: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2F4EA' } },
    [frase('regProgrammato')]: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FA' } },
    [frase('regDisdetto')]: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCF0D8' } },
    [frase('regNonVenuto')]: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBE6E4' } },
  }
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
  const coloreStato = fondi()
  const prezzi = new Set([frase('regUltimoPrezzo'), frase('regTotaleSpeso'), frase('regPrezzo'), frase('regPrezzoPiccola'), frase('regPrezzoMedia'), frase('regPrezzoGrande')])
  const stato = frase('regStato')
  const note = frase('regNote')
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
      if (headers[column] === frase('regTelefono')) cell.numFmt = '@'
      if (prezzi.has(headers[column])) cell.numFmt = '€ #,##0.00'
      if (headers[column] === frase('regTempoMedio') && typeof value === 'number') cell.numFmt = '0.0'
      if (headers[column] === note) cell.alignment = { wrapText: true, vertical: 'top' }
      if (rowIndex % 2 === 1 && headers[column] !== stato) cell.fill = STRIPE
      if (headers[column] === stato && typeof value === 'string' && coloreStato[value]) cell.fill = coloreStato[value]
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
  const href = opzioni.risolviLink(percorso)
  if (!href) return null
  return { text: frase('regApriCartella'), hyperlink: href }
}

export async function registroXlsx(dati: GroomlyDati, opzioni: RegistroOpzioni): Promise<Blob> {
  const registro = costruisciRegistro(dati, opzioni.now)
  const book = new Workbook()
  book.title = frase('regTitolo')
  book.creator = registro.salone
  book.views = [{ activeTab: 0 } as WorkbookView]
  const conLink = Boolean(opzioni.risolviLink)

  const caniHeaders = testi('regCodice', 'regCane', 'regRazza', 'regTaglia', 'regSesso', 'regAnno', 'regCarattere', 'regPadrone', 'regTelefono', 'regAppuntamenti', 'regPrimo', 'regUltimo', 'regProssimo', 'regUltimoServizio', 'regUltimoPrezzo', 'regTotaleSpeso', 'regTempoMedio', 'regNote', 'regFoto', 'regStato')
  if (conLink) caniHeaders.push(frase('regCartellaFoto'))
  const cani = book.addWorksheet(frase('regCani'))
  scriviTabella(cani, 'TabCani', caniHeaders, registro.cani.map((row) => {
    const values: Cella[] = [row.codice, row.cane, row.razza, row.taglia, row.sesso, row.anno, row.carattere, row.padrone, row.telefono, row.appuntamenti, row.primo, row.ultimo, row.prossimo, row.ultimoServizio, row.ultimoPrezzo, row.totaleSpeso, row.tempoMedio, row.note, row.foto, row.stato]
    if (conLink) values.push(link(opzioni, row.percorso))
    return values
  }), 2)

  const visitaHeaders = testi('regData', 'regOra', 'regCodice', 'regCane', 'regRazza', 'regPadrone', 'regTelefono', 'regServizio', 'regPrezzo', 'regDurata', 'regStato', 'regNote', 'regFoto')
  if (conLink) visitaHeaders.push(frase('regCartellaFoto'))
  const visite = book.addWorksheet(frase('regAppuntamenti'))
  scriviTabella(visite, 'TabVisite', visitaHeaders, registro.visite.map((row) => {
    const values: Cella[] = [row.data, row.ora, row.codice, row.cane, row.razza, row.padrone, row.telefono, row.servizio, row.prezzo, row.durata, row.stato, row.note, row.foto]
    if (conLink) values.push(link(opzioni, row.percorso))
    return values
  }), 0)

  const clienti = book.addWorksheet(frase('regClienti'))
  scriviTabella(clienti, 'TabClienti', testi('regPadrone', 'regTelefono', 'regCani', 'regAppuntamenti', 'regTotaleSpeso', 'regUltimoAppuntamento'), registro.clienti.map((row) => [row.padrone, row.telefono, row.cani, row.appuntamenti, row.totaleSpeso, row.ultimo]), 0)

  const incassi = book.addWorksheet(frase('regIncassiMensili'))
  const mesi: Cella[][] = registro.mesi.map((row: RigaMese) => [row.mese, row.appuntamenti, row.totale, row.media])
  scriviTabella(incassi, 'TabMesi', testi('regMese', 'regAppuntamenti', 'regTotale', 'regMedia'), mesi, 0)
  registro.anni.forEach((row, index) => {
    const line = mesi.length + 3 + index
    ;[row.etichetta, row.appuntamenti, row.totale, row.media].forEach((value, column) => {
      const cell = incassi.getCell(line, column + 1)
      cell.value = value
      cell.font = { bold: true }
      if (column >= 2 && typeof value === 'number') cell.numFmt = '€ #,##0.00'
    })
  })

  const listino = book.addWorksheet(frase('regListino'))
  const serviziHeaders = testi('regNome', 'regTipo', 'regPrezzoPiccola', 'regPrezzoMedia', 'regPrezzoGrande', 'regDurataPiccola', 'regDurataMedia', 'regDurataGrande', 'regAttivo')
  const serviziRighe = registro.servizi.map((row) => [row.nome, row.tipo, row.prezzoPiccola, row.prezzoMedia, row.prezzoGrande, row.durataPiccola, row.durataMedia, row.durataGrande, row.attivo])
  scriviTabella(listino, 'TabServizi', serviziHeaders, serviziRighe, 0)
  const start = serviziRighe.length + 3
  const razzeHeaders = testi('regRazza', 'regTaglia', 'regVoce', 'regTipo', 'regPrezzo')
  if (registro.razze.length === 0) {
    razzeHeaders.forEach((header, index) => {
      const cell = listino.getCell(start, index + 1)
      cell.value = header
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = HEADER
    })
  } else {
    listino.addTable({
      name: 'TabRazze',
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

  if (opzioni.altri) {
    const fogli: Array<[string, Record<string, unknown>]> = [
      [frase('regRichieste'), opzioni.altri.richieste],
      [frase('regAttesa'), opzioni.altri.attesa],
      [frase('regEmail'), opzioni.altri.coda],
    ]
    for (const [titolo, voci] of fogli) {
      const { colonne, righe } = righeFoglio(voci)
      const foglio = book.addWorksheet(titolo)
      foglio.addRow(colonne).font = { bold: true }
      foglio.addRows(righe)
    }
  }

  const info = book.addWorksheet(frase('regInfo'))
  const voci: Array<[string, string | number]> = [
    [frase('regSalone'), registro.salone],
    [frase('regCreatoIl'), registro.creatoIl],
    [frase('regVersioneApp'), registro.versione],
    [frase('regCani'), registro.conteggi.cani],
    [frase('regClienti'), registro.conteggi.clienti],
    [frase('regAppuntamenti'), registro.conteggi.appuntamenti],
    [frase('regFoto'), registro.conteggi.foto],
    [frase('regFileListino'), registro.conteggi.fileListino],
    [frase('regCartelle'), frase('regCartelleNota')],
    [frase('regLegenda'), frase('regLegendaColori', { completato: frase('regCompletato'), programmato: frase('regProgrammato'), disdetto: frase('regDisdetto'), assente: frase('regNonVenuto') })],
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
