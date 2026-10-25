import { describe, expect, it } from 'vitest'
import type { Appointment, Dog, Service } from '../types/models'
import { buildExportData, exportFileName, exportRange, filePrefix, ownerName, toCsv, type ExportData } from './earningsExport'

function dog(id: string, name: string, owner: string, phone = '333'): Dog {
  return { id, name, contact: { name: owner, phone }, contacts: [{ id: 'c', name: owner, role: 'Proprietaria', phone, isPrimary: true }] } as Dog
}

function visit(id: string, start: Date, price: number, extra: Partial<Appointment> = {}): Appointment {
  return {
    id,
    dogId: 'zeus',
    start,
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price }],
    status: 'completato',
    createdAt: start,
    updatedAt: start,
    ...extra,
  }
}

const dogs = [dog('zeus', 'Zeus', 'Laura'), dog('fido', 'Fido', 'Mario', '349000')]
const services = [{ id: 'bagno', name: 'Bagno', iconKey: 'bagno' } as Service]
const business = { salonName: '', name: 'I Pelosetti', vatNumber: '123', phone: '06', address: 'Via Roma', taxCode: '' }
const include = { riepilogo: true, dettaglio: true, attivita: true, mancati: true }

describe('earningsExport', () => {
  it('il proprietario non è il telefono e il range si accorcia a 24 mesi', () => {
    expect(ownerName(dogs[0])).toBe('Laura')
    expect(ownerName({ contact: { name: 'Ada', phone: '111' } } as Dog)).toBe('Ada')
    const range = exportRange('intervallo', new Date(2026, 0, 1), { from: '2024-01-01', to: '2026-06-01' })
    expect(range.clipped).toBe(true)
    expect(range.to).toEqual(new Date(2026, 0, 1))
    expect(exportRange('mese', new Date(2026, 8, 18)).from).toEqual(new Date(2026, 8, 1))
    expect(exportFileName('mese', new Date(2026, 8, 1), new Date(2026, 9, 1), 'pdf')).toBe('Groomly_Incassi_2026-09.pdf')
    expect(exportFileName('anno', new Date(2026, 0, 1), new Date(2027, 0, 1), 'csv')).toBe('Groomly_Incassi_2026.csv')
  })

  it('il CSV separa POS, contanti, N/A e non indicato e lascia fuori il telefono e la nota', () => {
    const now = new Date(2026, 9, 17, 9, 40)
    const items = [
      visit('a', new Date(2026, 8, 2, 9, 30), 40, { paymentMethod: 'pos', adjustmentNote: 'Nodi' }),
      visit('b', new Date(2026, 8, 3, 11), 25, { dogId: 'fido', paymentMethod: 'contanti' }),
      visit('c', new Date(2026, 8, 4, 12), 0, { total: 0, paymentMethod: 'na' }),
      visit('d', new Date(2026, 8, 5, 15), 80, {}),
      visit('e', new Date(2026, 8, 6, 10), 35, { dogId: 'fido', status: 'disdetto', cancelReason: 'cliente' }),
      visit('f', new Date(2026, 8, 7, 10), 99, { status: 'disdetto', cancelReason: 'salone' }),
    ]
    const range = exportRange('mese', new Date(2026, 8, 1))
    const data = buildExportData(items, dogs, services, business, range, include, 'mese', now)
    expect(data.incassato).toBe(145)
    expect(data.daChiudere).toBe(0)
    expect(data.pagamenti.pos.importo).toBe(40)
    expect(data.missed).toHaveLength(1)
    const csv = toCsv(data, include)
    expect(csv.startsWith('\uFEFFAttività;I Pelosetti\r\n')).toBe(true)
    expect(csv).toContain('P. IVA;123\r\n')
    expect(csv).toContain('Periodo;01/09/2026 - 30/09/2026')
    expect(csv).toContain('Data;Ora;Cane;Proprietario;Servizi;Durata (min);Importo (€);Pagamento;Stato;Importo mancato (€)')
    expect(csv).toContain('02/09/2026;09:30;Zeus;Laura;Bagno;30;40,00;POS;completato;0,00')
    expect(csv).toContain('03/09/2026;11:00;Fido;Mario;Bagno;30;25,00;Contanti;completato;0,00')
    expect(csv).toContain('04/09/2026;12:00;Zeus;Laura;Bagno;30;0,00;N/A;completato;0,00')
    expect(csv).toContain('05/09/2026;15:00;Zeus;Laura;Bagno;30;80,00;Non indicato;completato;0,00')
    expect(csv).toContain('06/09/2026;10:00;Fido;Mario;Bagno;30;0,00;;disdetto dal cliente;35,00')
    expect(csv).toContain(';;;;;Totale;145,00;;;')
    expect(csv).not.toContain('349000')
    expect(csv).not.toContain('Nodi')
    expect(csv).not.toContain('99,00')
    expect(csv).not.toContain('Via Roma')
  })

  it('mette tra virgolette un servizio che contiene virgolette o un punto e virgola', () => {
    const data: ExportData = {
      title: 'Riepilogo incassi · Settembre 2026',
      periodLabel: '01/09/2026 - 30/09/2026',
      business: null,
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
      servizi: [],
      gruppi: [],
      gruppoTitolo: 'Settimana',
      rows: [{
        date: '02/09/2026',
        time: '09:30',
        dog: 'Zeus',
        owner: 'Laura',
        services: 'nodi "fitti"',
        minutes: 30,
        amount: 40,
        payment: 'POS',
        status: 'completato',
        missedAmount: 0,
      }],
      missed: [],
      daChiudere: 0,
      generatedAt: new Date(2026, 9, 17, 9, 40),
    }
    const quoted = toCsv(data, { riepilogo: false, dettaglio: true, attivita: false, mancati: false })
    expect(quoted).toContain('"nodi ""fitti"""')
    const semicolon = toCsv({ ...data, rows: [{ ...data.rows[0], services: 'Bagno; taglio' }] }, { riepilogo: false, dettaglio: true, attivita: false, mancati: false })
    expect(semicolon).toContain('"Bagno; taglio"')
  })

  it('il nome file usa la ragione sociale e omette il pagamento se è spento', () => {
    expect(filePrefix('I Pelosetti')).toBe('I_Pelosetti')
    expect(filePrefix('  A/B: C  ')).toBe('AB_C')
    expect(filePrefix('   ')).toBe('Groomly')
    expect(filePrefix(undefined)).toBe('Groomly')
    expect(exportFileName('mese', new Date(2026, 8, 1), new Date(2026, 9, 1), 'pdf', 'I Pelosetti')).toBe('I_Pelosetti_Incassi_2026-09.pdf')
    expect(exportFileName('mese', new Date(2026, 8, 1), new Date(2026, 9, 1), 'pdf')).toBe('Groomly_Incassi_2026-09.pdf')
    const now = new Date(2026, 9, 17, 9, 40)
    const items = [
      visit('a', new Date(2026, 8, 2, 9, 30), 40, { paymentMethod: 'pos' }),
      visit('b', new Date(2026, 8, 3, 11), 25, { dogId: 'fido', paymentMethod: 'contanti' }),
      visit('e', new Date(2026, 8, 6, 10), 35, { dogId: 'fido', status: 'disdetto', cancelReason: 'cliente' }),
    ]
    const data = buildExportData(items, dogs, services, business, exportRange('mese', new Date(2026, 8, 1)), include, 'mese', now)
    const hidden = toCsv(data, { ...include, pagamento: false })
    expect(hidden).not.toContain('Pagamento')
    expect(hidden).not.toContain('POS')
    expect(hidden).not.toContain('Contanti')
    expect(hidden).toContain('Data;Ora;Cane;Proprietario;Servizi;Durata (min);Importo (€);Stato;Importo mancato (€)')
    expect(hidden).toContain('02/09/2026;09:30;Zeus;Laura;Bagno;30;40,00;completato;0,00')
    expect(hidden).toContain('03/09/2026;11:00;Fido;Mario;Bagno;30;25,00;completato;0,00')
    expect(hidden).toContain('06/09/2026;10:00;Fido;Mario;Bagno;30;0,00;disdetto dal cliente;35,00')
    expect(hidden).toContain(';;;;;Totale;65,00;;')
    expect(toCsv(data, include)).toContain('Pagamento')
    expect(toCsv(data, include)).toContain('02/09/2026;09:30;Zeus;Laura;Bagno;30;40,00;POS;completato;0,00')
    expect(toCsv(data, include)).toContain(';;;;;Totale;65,00;;;')
  })

  it('il report in inglese non usa le intestazioni italiane', () => {
    const now = new Date(2026, 9, 17, 9, 40)
    const dogs = [dog('zeus', 'Zeus', 'Laura')]
    const services = [{ id: 'bagno', name: 'Bagno' } as Service]
    const business = { salonName: 'Bauci', name: 'Bauci', vatNumber: '', taxCode: '', phone: '', address: '' }
    const include = { riepilogo: true, dettaglio: true, attivita: true, mancati: false, pagamento: true }
    const data = buildExportData(
      [visit('a', new Date(2026, 8, 2, 9, 30), 40, { paymentMethod: 'contanti' })],
      dogs,
      services,
      business,
      exportRange('mese', new Date(2026, 8, 1)),
      include,
      'mese',
      now,
      'en',
    )
    expect(data.title.startsWith('Earnings summary')).toBe(true)
    expect(data.title).not.toContain('Riepilogo')
    const csv = toCsv(data, include)
    expect(csv).toContain('Date;Time;Dog;Owner;Services')
    expect(csv).not.toContain('Cane')
    expect(csv).toContain('Cash')
    expect(exportFileName('mese', new Date(2026, 8, 1), new Date(2026, 9, 1), 'pdf', '', 'en')).toBe('Groomly_Earnings_2026-09.pdf')
  })
})
