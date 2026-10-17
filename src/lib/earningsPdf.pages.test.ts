import { describe, expect, it } from 'vitest'
import type { Appointment, Dog, Service } from '../types/models'
import { buildExportData } from './earningsExport'
import { toPdf } from './earningsPdf'

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsBinaryString(blob)
  })
}

function visit(index: number): Appointment {
  const start = new Date(2026, 8, (index % 28) + 1, 9, index % 50)
  return {
    id: `v${index}`,
    dogId: 'zeus',
    start,
    services: [{ serviceId: 'bagno', name: 'Bagno e asciugatura', durationMin: 45, price: 40 + (index % 7) }],
    status: 'completato',
    paymentMethod: index % 2 === 0 ? 'pos' : 'contanti',
    createdAt: start,
    updatedAt: start,
  }
}

describe('toPdf pagine reali', () => {
  it('ottanta visite completate arrivano alla seconda pagina', async () => {
    const now = new Date(2026, 9, 17, 9, 40)
    const dogs = [{ id: 'zeus', name: 'Zeus', contact: { name: 'Laura Bianchi', phone: '333' } } as Dog]
    const services = [{ id: 'bagno', name: 'Bagno e asciugatura' } as Service]
    const data = buildExportData(
      Array.from({ length: 80 }, (_, index) => visit(index)),
      dogs,
      services,
      { name: 'I Pelosetti', vatNumber: '12345678901', phone: '06 555', address: 'Via Roma 1' },
      { from: new Date(2026, 8, 1), to: new Date(2026, 9, 1) },
      { riepilogo: true, dettaglio: true, attivita: true, mancati: false },
      'mese',
      now,
    )
    expect(data.rows).toHaveLength(80)
    const blob = toPdf(data, { riepilogo: true, dettaglio: true, attivita: true, mancati: false })
    const text = await readBlob(blob)
    expect(text.startsWith('%PDF')).toBe(true)
    expect(text).toContain('Pagina 2 di')
  })
})
