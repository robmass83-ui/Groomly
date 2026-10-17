import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExportData } from './earningsExport'

const { texts, lines, draws, tables, jsPDF, autoTable } = vi.hoisted(() => {
  const texts: string[] = []
  const lines: unknown[][] = []
  const draws: number[][] = []
  const tables: unknown[] = []

  class JsPdfMock {
    lastAutoTable?: { finalY: number }
    internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } }

    text(value: string | string[]) {
      texts.push(Array.isArray(value) ? value.join('\n') : String(value))
    }

    line(...args: unknown[]) {
      lines.push(args)
    }

    splitTextToSize(value: string) {
      return [value]
    }

    getNumberOfPages() {
      return 2
    }

    setPage() {}

    setFont() {}

    setFontSize() {}

    setDrawColor(...channels: number[]) {
      draws.push(channels)
    }

    setLineWidth() {}

    setTextColor() {}

    output(kind: string) {
      return kind === 'blob' ? new Blob(['%PDF']) : ''
    }
  }

  function autoTable(doc: JsPdfMock, options: { startY?: number }) {
    tables.push(options)
    doc.lastAutoTable = { finalY: (options.startY ?? 20) + 24 }
  }

  return { texts, lines, draws, tables, jsPDF: JsPdfMock, autoTable }
})

vi.mock('jspdf', () => ({ jsPDF }))
vi.mock('jspdf-autotable', () => ({ default: autoTable, autoTable }))

import { toPdf } from './earningsPdf'

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

describe('toPdf', () => {
  beforeEach(() => {
    texts.length = 0
    lines.length = 0
    draws.length = 0
    tables.length = 0
  })

  it('scrive titolo, pagamento, totale, piè di pagina e non il telefono del cliente', () => {
    const data = exportFixture()
    const blob = toPdf(data, { riepilogo: true, dettaglio: true, attivita: true, mancati: true })
    expect(blob).toBeInstanceOf(Blob)
    const written = texts.join('\n')
    expect(written).toContain('Riepilogo incassi · Settembre 2026')
    expect(written).toContain('P. IVA 123')
    expect(written).toContain('non è una fattura')
    expect(written).toContain('Pagina 1 di 2')
    expect(written).toContain('Pagina 2 di 2')
    expect(written).toContain('17/10/2026')
    expect(written).toContain('09:40')
    expect(written).not.toContain('349')
    expect(lines.length).toBeGreaterThan(0)
    expect(draws).toContainEqual([58, 91, 160])
    const flat = JSON.stringify(tables)
    expect(flat).toContain('Pagamento')
    expect(flat).toContain('POS')
    expect(flat).toContain('Non inclusi nel totale')
  })

  it('con pagamento spento non scrive POS né la colonna Pagamento', () => {
    const data = exportFixture()
    data.gruppoTitolo = 'Mese'
    toPdf(data, { riepilogo: true, dettaglio: true, attivita: true, mancati: true })
    const openStart = (tables[0] as { startY: number }).startY
    expect(texts.join('\n')).toContain('POS')
    expect(JSON.stringify(tables)).toContain('Pagamento')

    texts.length = 0
    lines.length = 0
    draws.length = 0
    tables.length = 0
    toPdf(data, { riepilogo: true, dettaglio: true, attivita: true, mancati: true, pagamento: false })
    const written = texts.join('\n')
    expect(written).not.toContain('POS')
    expect(written).toContain('Riepilogo incassi · Settembre 2026')
    expect(written).toContain('Generato con Groomly')
    const flat = JSON.stringify(tables)
    expect(flat).not.toContain('Pagamento')
    expect(flat).not.toContain('POS')
    expect(flat).toContain('Non inclusi nel totale')
    expect((tables[0] as { startY: number }).startY).toBe(openStart - 8)

    const detail = tables.find((table) => JSON.stringify((table as { head?: unknown }).head ?? '').includes('"Cane"')) as {
      head: string[][]
      body: unknown[][]
    }
    expect(detail.head).toEqual([['Data', 'Ora', 'Cane', 'Proprietario', 'Servizi', 'Importo']])
    const subtotal = detail.body.find((row) => JSON.stringify(row).includes('Subtotale'))
    const total = detail.body[detail.body.length - 1]
    expect(subtotal).toHaveLength(2)
    expect(total).toHaveLength(2)
    expect(JSON.stringify(total)).toContain('Totale periodo')
    expect(JSON.stringify(total)).toContain('40,00 €')

    const missed = tables.find((table) => JSON.stringify(table).includes('Importo non incassato')) as { head: string[][] }
    expect(missed.head).toEqual([['Data', 'Cane', 'Proprietario', 'Motivo', 'Importo non incassato']])
  })

  it('scrive Offerti (N/A) con il conteggio quando gli omaggi sono più di zero', () => {
    const data = exportFixture()
    data.pagamenti.offerti = 2
    toPdf(data, { riepilogo: false, dettaglio: false, attivita: false, mancati: false })
    expect(texts.join('\n')).toContain('Offerti (N/A) 2')
  })
})
