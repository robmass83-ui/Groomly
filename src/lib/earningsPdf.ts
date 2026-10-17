import { jsPDF } from 'jspdf'
import autoTable, { type CellInput, type RowInput, type UserOptions } from 'jspdf-autotable'
import type { ExportData, ExportInclude } from './earningsExport'

const MARGIN = 14

type PdfDoc = jsPDF & { lastAutoTable?: { finalY?: number } }

function euro(amount: number): string {
  const formatted = new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return `${formatted} €`
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function monthOf(date: string): string {
  return date.slice(3, 10)
}

function bold(content: string): CellInput {
  return { content, styles: { fontStyle: 'bold' } }
}

function paymentLine(data: ExportData): string {
  const parts = [
    `POS ${euro(data.pagamenti.pos.importo)}`,
    `Contanti ${euro(data.pagamenti.contanti.importo)}`,
  ]
  if (data.pagamenti.nonIndicato.count > 0) parts.push(`Non indicato ${euro(data.pagamenti.nonIndicato.importo)}`)
  if (data.pagamenti.offerti > 0) parts.push(`Offerti (N/A) ${data.pagamenti.offerti}`)
  return parts.join(' · ')
}

function detailBody(data: ExportData): RowInput[] {
  const body: RowInput[] = []
  if (data.gruppoTitolo === 'Mese') {
    let month = ''
    let sum = 0
    const flush = () => {
      body.push([
        { content: `Subtotale ${month}`, colSpan: 5, styles: { fontStyle: 'bold' } },
        bold(euro(round2(sum))),
        '',
      ])
    }
    for (const row of data.rows) {
      const key = monthOf(row.date)
      if (month && key !== month) {
        flush()
        sum = 0
      }
      month = key
      sum += row.amount
      body.push([row.date, row.time, row.dog, row.owner, row.services, euro(row.amount), row.payment])
    }
    if (month) flush()
  } else {
    for (const row of data.rows) {
      body.push([row.date, row.time, row.dog, row.owner, row.services, euro(row.amount), row.payment])
    }
  }
  body.push([
    { content: 'Totale periodo', colSpan: 5, styles: { fontStyle: 'bold' } },
    bold(euro(data.incassato)),
    '',
  ])
  return body
}

function serviceBody(data: ExportData): RowInput[] {
  const rows: RowInput[] = data.servizi.map((service) => [service.name, String(service.count), euro(service.amount)])
  const count = data.servizi.reduce((sum, service) => sum + service.count, 0)
  const amount = round2(data.servizi.reduce((sum, service) => sum + service.amount, 0))
  rows.push([bold('Totale'), bold(String(count)), bold(euro(amount))])
  return rows
}

function groupBody(data: ExportData): RowInput[] {
  const rows: RowInput[] = data.gruppi.map((group) => [group.label, String(group.count), euro(group.amount)])
  if (data.gruppoTitolo !== 'Mese') return rows
  const count = data.gruppi.reduce((sum, group) => sum + group.count, 0)
  const amount = round2(data.gruppi.reduce((sum, group) => sum + group.amount, 0))
  rows.push([bold('Totale'), bold(String(count)), bold(euro(amount))])
  return rows
}

function tableOptions(startY: number, extra: UserOptions): UserOptions {
  return {
    startY,
    margin: { top: MARGIN, right: MARGIN, bottom: 18, left: MARGIN },
    theme: 'striped',
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.4, overflow: 'linebreak' },
    headStyles: { fillColor: [31, 41, 55], textColor: 255, fontStyle: 'bold' },
    showHead: 'everyPage',
    ...extra,
  }
}

function drawTable(doc: PdfDoc, options: UserOptions): number {
  autoTable(doc, options)
  const start = typeof options.startY === 'number' ? options.startY : MARGIN
  return (doc.lastAutoTable?.finalY ?? start) + 6
}

function footerStamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  const day = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  return `Generato con Groomly il ${day} alle ${time} · documento riepilogativo, non è una fattura`
}

function heading(doc: PdfDoc, text: string, x: number, y: number) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(text, x, y)
}

export function toPdf(data: ExportData, include: ExportInclude): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' }) as PdfDoc
  const width = doc.internal.pageSize.getWidth()
  const height = doc.internal.pageSize.getHeight()
  let y = 18

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  const titleWidth = Math.max(width - MARGIN * 2 - (data.business ? 70 : 0), 40)
  const titleLines = doc.splitTextToSize(data.title, titleWidth) as string[]
  doc.text(titleLines, MARGIN, y)
  const periodY = y + Math.max(titleLines.length, 1) * 6.4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(`${data.periodLabel} · solo appuntamenti completati`, MARGIN, periodY)
  let blockBottom = periodY

  if (data.business) {
    const right = width - MARGIN
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text(data.business.name, right, y, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.text(`P. IVA ${data.business.vatNumber}`, right, y + 4.2, { align: 'right' })
    doc.text(data.business.address, right, y + 8.4, { align: 'right' })
    doc.text(data.business.phone, right, y + 12.6, { align: 'right' })
    blockBottom = Math.max(blockBottom, y + 12.6)
  }

  y = blockBottom + 3.2
  doc.setDrawColor(58, 91, 160)
  doc.setLineWidth((1.5 * 25.4) / 72)
  doc.line(MARGIN, y, width - MARGIN, y)
  doc.setDrawColor(0)

  y += 6
  const boxes: [string, string][] = [
    ['Totale incassato', euro(data.incassato)],
    ['Appuntamenti', String(data.appuntamenti)],
    ['Giorni lavorati', String(data.giorni)],
    ['Media per appuntamento', data.media == null ? '—' : euro(data.media)],
  ]
  const boxWidth = (width - MARGIN * 2) / boxes.length
  boxes.forEach(([label, value], index) => {
    const x = MARGIN + index * boxWidth
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(label, x, y)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(value, x, y + 5)
  })

  y += 11
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(paymentLine(data), MARGIN, y)
  y += 8

  if (include.riepilogo) {
    const gap = 4
    const half = (width - MARGIN * 2 - gap) / 2
    if (data.gruppoTitolo === 'Settimana') {
      heading(doc, 'Per servizio', MARGIN, y)
      heading(doc, 'Per settimana', MARGIN + half + gap, y)
      y += 4
      autoTable(doc, tableOptions(y, {
        head: [['Servizio', 'Volte', 'Importo']],
        body: serviceBody(data),
        tableWidth: half,
        margin: { top: MARGIN, left: MARGIN, right: width - MARGIN - half, bottom: 18 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      }))
      const serviceEnd = doc.lastAutoTable?.finalY ?? y
      autoTable(doc, tableOptions(y, {
        head: [[data.gruppoTitolo, 'App.', 'Importo']],
        body: groupBody(data),
        tableWidth: half,
        margin: { top: MARGIN, left: MARGIN + half + gap, right: MARGIN, bottom: 18 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      }))
      y = Math.max(serviceEnd, doc.lastAutoTable?.finalY ?? y) + 8
    } else {
      heading(doc, 'Per servizio', MARGIN, y)
      y += 4
      y = drawTable(doc, tableOptions(y, {
        head: [['Servizio', 'Volte', 'Importo']],
        body: serviceBody(data),
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      }))
      y += 2
      heading(doc, 'Per mese', MARGIN, y)
      y += 4
      y = drawTable(doc, tableOptions(y, {
        head: [[data.gruppoTitolo, 'App.', 'Importo']],
        body: groupBody(data),
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      }))
      y += 2
    }
  }

  if (include.dettaglio) {
    heading(doc, 'Dettaglio', MARGIN, y)
    y += 4
    y = drawTable(doc, tableOptions(y, {
      head: [['Data', 'Ora', 'Cane', 'Proprietario', 'Servizi', 'Importo', 'Pagamento']],
      body: detailBody(data),
      showHead: 'everyPage',
      columnStyles: { 5: { halign: 'right' } },
    }))
    y += 2
  }

  if (include.mancati && data.missed.length > 0) {
    heading(doc, 'Mancati incassi', MARGIN, y)
    y += 4
    drawTable(doc, tableOptions(y, {
      head: [['Data', 'Cane', 'Proprietario', 'Motivo', 'Importo non incassato']],
      body: data.missed.map((row) => [row.date, row.dog, row.owner, row.status, euro(row.missedAmount)]),
      foot: [[{ content: 'Non inclusi nel totale', colSpan: 5, styles: { fontStyle: 'italic', halign: 'left', textColor: 60 } }]],
      footStyles: { fillColor: false, textColor: 60, fontStyle: 'italic' },
      showFoot: 'lastPage',
      columnStyles: { 4: { halign: 'right' } },
    }))
  }

  const pages = doc.getNumberOfPages()
  const stamp = footerStamp(data.generatedAt)
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(stamp, MARGIN, height - 8)
    doc.text(`Pagina ${page} di ${pages}`, width - MARGIN, height - 8, { align: 'right' })
  }

  return doc.output('blob')
}
