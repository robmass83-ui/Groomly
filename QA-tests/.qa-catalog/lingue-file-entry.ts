// PDF ed Excel degli incassi e Registro del backup, in cinque lingue, con nomi che hanno ß, é, œ. Lo usa verify-lingue-file.mjs.
import { LINGUE, type Lingua } from '../../src/i18n/lingua'
import { buildExportData } from '../../src/lib/earningsExport'
import { toPdf } from '../../src/lib/earningsPdf'
import { toXlsx } from '../../src/lib/earningsXlsx'
import { registroXlsx } from '../../src/lib/registroXlsx'

const giorno = (d: number, h = 10) => new Date(2026, 9, d, h, 0, 0)
const riga = (serviceId: string, name: string, durationMin: number, price: number) => ({ serviceId, name, durationMin, price })
const servizio = (id: string, name: string, kind: string) => ({ id, name, kind, order: 0, active: true, durationMin: { piccola: 30, media: 45, grande: 60 }, price: { piccola: 20, media: 28, grande: 38 } })

export async function tutto(lingua: Lingua) {
  const servizi = [servizio('bagno', 'Bagno', 'principale'), servizio('nodi', 'Gestione nodi', 'extra'), servizio('spa', 'Cœur Spaß été', 'principale')]
  const cane = (id: string, name: string) => ({ id, name, species: 'cane', breed: 'Bichon Maltais', size: 'media', ageCategory: 'adulto', temperament: 'bravo', clientType: 'mensile', contact: { name: 'Jürgen Strauß', phone: '+49 151 2345678' }, contacts: [{ id: 'c', name: 'Jürgen Strauß', role: 'Proprietario', phone: '+49 151 2345678', isPrimary: true }], tags: [], servicePrices: [], hiddenServiceIds: [], customFields: [], gallery: [], status: 'attivo', createdAt: giorno(1), updatedAt: giorno(1) })
  const cani = [cane('d1', 'Größe'), cane('d2', 'Cœur')]
  const visita = (id: string, dogId: string, d: number, status: string, extra: object) => ({ id, dogId, kind: 'pelosetto', start: giorno(d), status, createdAt: giorno(1), updatedAt: giorno(1), services: [riga('bagno', 'Bagno', 45, 28), riga('nodi', 'Gestione nodi', 20, 5)], ...extra })
  const visite = [
    visita('a1', 'd1', 5, 'completato', { total: 33, paymentMethod: 'contanti', actualDurationMin: 60 }),
    visita('a2', 'd2', 12, 'completato', { total: 45.5, paymentMethod: 'pos', actualDurationMin: 50 }),
    visita('a3', 'd1', 19, 'non_venuto', {}),
    visita('a4', 'd2', 20, 'disdetto', { cancelReason: 'cliente' }),
  ]
  const business = { name: 'Maß & Cœur Été', salonName: 'Maß & Cœur Été', vatNumber: 'DE123456789', phone: '+49 30 123456', address: 'Straße des 17. Juni 1, Berlin' }
  const include = { riepilogo: true, dettaglio: true, attivita: true, mancati: true, pagamento: true }
  const dati = buildExportData(visite as never, cani as never, servizi as never, business as never, { from: giorno(1, 0), to: giorno(31, 23) }, include, 'mese', new Date(2026, 10, 2), lingua)
  const blobPdf = toPdf(dati, include)
  const blobXlsx = await toXlsx(dati, include)
  const groomly = {
    versioneFormato: 1,
    dogs: Object.fromEntries(cani.map((c) => [c.id, { ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() }])),
    appointments: Object.fromEntries(visite.map((v) => [v.id, { ...v, start: v.start.toISOString(), createdAt: v.createdAt.toISOString(), updatedAt: v.updatedAt.toISOString() }])),
    services: Object.fromEntries(servizi.map((s) => [s.id, s])),
    settings: { business },
    closures: {},
    files: {},
    deletedDogs: { ids: [], appointmentIds: [], storicoIds: [] },
    codiciCane: { next: 3, cartella: 'cani', byId: { d1: 'C0001', d2: 'C0002' } },
    fotoMancanti: [],
  }
  let registro: Uint8Array | null = null
  let errore = ''
  try { registro = new Uint8Array(await (await registroXlsx(groomly as never, { now: new Date(2026, 10, 2) })).arrayBuffer()) } catch (e) { errore = String(e) }
  return { pdf: new Uint8Array(await blobPdf.arrayBuffer()), xlsx: new Uint8Array(await blobXlsx.arrayBuffer()), registro, errore }
}
export { LINGUE }
