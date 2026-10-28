import { Workbook } from 'exceljs'
import { jsPDF } from 'jspdf'

export type RigaExcel = {
  stato: string
  categoria: string
  testo: string
  volte: number
  email: string
  salone: string
  data: string
}

export type BloccoPdf = {
  stato: string
  testo: string
  persone: string[]
}

export function nomeFileSuggerimenti(quando: Date, estensione: 'pdf' | 'xlsx'): string {
  const anno = quando.getFullYear()
  const mese = String(quando.getMonth() + 1).padStart(2, '0')
  const giorno = String(quando.getDate()).padStart(2, '0')
  return `Groomly_Suggerimenti_${anno}-${mese}-${giorno}.${estensione}`
}

export function pdfSuggerimenti(titolo: string, blocchi: readonly BloccoPdf[]): Blob {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: false })
  const larghezza = doc.internal.pageSize.getWidth() - 80
  const altezza = doc.internal.pageSize.getHeight()
  let y = 48

  function spazio(bisogno: number) {
    if (y + bisogno > altezza - 40) {
      doc.addPage()
      y = 48
    }
  }

  function scrivi(testo: string, size: number, grassetto: boolean) {
    doc.setFont('helvetica', grassetto ? 'bold' : 'normal')
    doc.setFontSize(size)
    const linee = doc.splitTextToSize(testo, larghezza) as string[]
    for (const linea of linee) {
      spazio(size + 4)
      doc.text(linea, 40, y)
      y += size + 4
    }
  }

  scrivi(titolo, 16, true)
  y += 6
  let stato = ''
  for (const blocco of blocchi) {
    if (blocco.stato !== stato) {
      stato = blocco.stato
      y += 10
      scrivi(stato, 13, true)
    }
    scrivi(blocco.testo, 11, false)
    for (const persona of blocco.persone) scrivi(persona, 10, false)
    y += 6
  }
  const output = doc.output('arraybuffer') as ArrayBuffer
  return new Blob([output], { type: 'application/pdf' })
}

export async function xlsxSuggerimenti(intestazioni: readonly string[], righe: readonly RigaExcel[]): Promise<Blob> {
  const book = new Workbook()
  const sheet = book.addWorksheet('Suggerimenti')
  sheet.addRow([...intestazioni])
  sheet.getRow(1).font = { bold: true }
  for (const riga of righe) {
    sheet.addRow([riga.stato, riga.categoria, riga.testo, riga.volte, riga.email, riga.salone, riga.data])
  }
  sheet.getColumn(3).width = 48
  sheet.getColumn(3).alignment = { wrapText: true, vertical: 'top' }
  const buffer = await book.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
