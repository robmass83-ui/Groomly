import { describe, expect, it } from 'vitest'
import { contaClienti, type GroomlyDati } from './backupBundle'
import { appointmentAmount, classify } from './earnings'
import { costruisciRegistro } from './registroModello'
import type { Appointment } from '../types/models'

const NOW = new Date('2026-10-23T12:00:00.000Z')
const VISITA = '2026-10-22T21:30:00.000Z'

function dati(extra: Partial<GroomlyDati> = {}): GroomlyDati {
  return {
    versioneFormato: 1,
    dogs: {},
    appointments: {},
    services: {},
    settings: { business: { salonName: 'Pelosetti' } },
    closures: {},
    files: {},
    deletedDogs: { ids: [], appointmentIds: [] },
    codiciCane: { next: 1, cartella: 'cani', byId: {} },
    fotoMancanti: [],
    ...extra,
  }
}

function cane(id: string, phone: string, name = 'Fido') {
  return {
    id,
    name,
    breed: 'Barboncino',
    size: 'piccola',
    sex: 'M',
    birthYear: 2019,
    temperament: 'bravo',
    contact: { name: 'Ada', phone },
    contacts: [{ id: 'c', name: 'Ada', role: '', phone, isPrimary: true }],
    photo: 'file:f1',
    gallery: [{ id: 'g', photo: 'file:f2', takenAt: VISITA }],
    status: 'attivo',
    criticalNote: 'Allergico',
    notes: 'Lame 4',
  }
}

describe('costruisciRegistro', () => {
  it('mette il giorno di Roma, il codice e il telefono testo', () => {
    const base = dati({
      dogs: { d1: cane('d1', '0333') },
      appointments: {
        a1: {
          id: 'a1', dogId: 'd1', start: VISITA, status: 'completato',
          services: [{ serviceId: 's', name: 'Bagno', durationMin: 30, price: 10 }],
          actualDurationMin: 40,
          photos: [{ id: 'p', photo: 'file:f1', kind: 'prima' }],
        },
        personale: { id: 'personale', kind: 'personale', title: 'Dentista', start: VISITA },
      },
      codiciCane: { next: 2, cartella: 'cani', byId: { d1: 'C0001' } },
      files: { f1: { id: 'f1', kind: 'foto', owner: 'dog:d1', name: 'profilo.webp', mime: 'image/webp', byteSize: 1, chunkCount: 1, createdAt: VISITA, createdBy: 'u', estensione: '.webp', percorsoBackup: 'cani/C0001/profilo.webp', esito: 'ok' } },
    })
    const registro = costruisciRegistro(base, NOW)
    expect(registro.cani).toHaveLength(1)
    expect(registro.cani[0]).toMatchObject({
      codice: 'C0001', cane: 'Fido', telefono: '0333', padrone: 'Ada',
      anno: 2019, foto: 3, stato: 'Attivo', ultimoServizio: 'Bagno',
      ultimoPrezzo: 10, totaleSpeso: 10, tempoMedio: 40, note: 'Allergico\nLame 4',
      percorso: 'cani/C0001/profilo.webp',
    })
    expect(registro.cani[0].primo?.getUTCFullYear()).toBe(2026)
    expect(registro.cani[0].primo?.getUTCMonth()).toBe(9)
    expect(registro.cani[0].primo?.getUTCDate()).toBe(22)
    expect(registro.cani[0].primo?.getUTCHours()).toBe(0)
    expect(registro.visite.map((row) => row.cane)).toEqual(['Fido'])
    expect(registro.visite[0].ora).toBe('23:30')
    expect(registro.visite[0].prezzo).toBe(10)
    expect(registro.clienti).toHaveLength(contaClienti(base.dogs))
    expect(registro.mesi.map((row) => row.mese)).toEqual(['ott 2026'])
    expect(registro.mesi[0].totale).toBe(10)
    expect(registro.anni[0]).toMatchObject({ etichetta: 'Totale 2026', totale: 10, appuntamenti: 1 })
  })

  it('unisce due cani con lo stesso telefono e segna la lapide', () => {
    const base = dati({
      dogs: {
        d1: cane('d1', '333 111', 'Fido'),
        d2: { ...cane('d2', '333111', 'Luna'), photo: '', gallery: [] },
      },
      deletedDogs: { ids: ['d1'], appointmentIds: [] },
      codiciCane: { next: 3, cartella: 'cani', byId: { d1: 'C0001', d2: 'C0002' } },
    })
    const registro = costruisciRegistro(base, NOW)
    expect(registro.cani.map((row) => row.stato)).toEqual(['Nascosto', 'Attivo'])
    expect(registro.clienti).toHaveLength(1)
    expect(registro.clienti[0].cani).toBe('C0001 Fido, C0002 Luna')
    expect(registro.clienti[0].padrone).toBe('Ada')
    expect(registro.clienti[0].telefono).toBe('333 111')
  })

  it('il totale del mese è la somma di classify incassato', () => {
    const base = dati({
      dogs: { d1: cane('d1', '1') },
      appointments: {
        fatto: { id: 'fatto', dogId: 'd1', start: VISITA, status: 'completato', services: [{ serviceId: 's', name: 'Bagno', durationMin: 30, price: 12 }] },
        perso: { id: 'perso', dogId: 'd1', start: VISITA, status: 'non_venuto', services: [{ serviceId: 's', name: 'Bagno', durationMin: 30, price: 99 }] },
      },
      codiciCane: { next: 2, cartella: 'cani', byId: { d1: 'C0001' } },
    })
    const registro = costruisciRegistro(base, NOW)
    const visite = Object.values(base.appointments).map((raw) => {
      const row = raw as { id: string; dogId: string; start: string; status: Appointment['status']; services: Appointment['services'] }
      return { id: row.id, dogId: row.dogId, start: new Date(row.start), services: row.services, status: row.status, createdAt: new Date(row.start), updatedAt: new Date(row.start) } as Appointment
    })
    const atteso = visite.filter((item) => classify(item, NOW) === 'incassato').reduce((sum, item) => sum + appointmentAmount(item), 0)
    expect(registro.mesi[0].totale).toBe(atteso)
    expect(registro.mesi[0].appuntamenti).toBe(1)
  })

  it('trecento cani e duemila visite stanno sotto i dieci secondi', () => {
    const dogs: GroomlyDati['dogs'] = {}
    const appointments: GroomlyDati['appointments'] = {}
    const byId: Record<string, string> = {}
    for (let index = 0; index < 300; index += 1) {
      const id = `d${index}`
      dogs[id] = cane(id, String(1000 + index), `Cane ${index}`)
      byId[id] = `C${String(index + 1).padStart(4, '0')}`
    }
    for (let index = 0; index < 2000; index += 1) {
      appointments[`a${index}`] = {
        id: `a${index}`, dogId: `d${index % 300}`, start: VISITA, status: 'completato',
        services: [{ serviceId: 's', name: 'Bagno', durationMin: 30, price: 10 }],
      }
    }
    const started = Date.now()
    const registro = costruisciRegistro(dati({ dogs, appointments, codiciCane: { next: 301, cartella: 'cani', byId } }), NOW)
    expect(Date.now() - started).toBeLessThan(10_000)
    expect(registro.cani).toHaveLength(300)
    expect(registro.visite).toHaveLength(2000)
  })
})
