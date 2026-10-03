import { describe, expect, it } from 'vitest'
import type { Appointment, Dog, Service } from '../types/models'
import {
  chipOpenDay,
  chipSource,
  formatBookedWhen,
  formatDuration,
  localDayKey,
  nextAppointment,
  overlapLabel,
  parseDayParam,
  prepareAppointmentWrite,
  quoteServices,
  rangesOverlap,
  shiftWeeks,
  visibleServiceNames,
} from './appointments'

function at(y: number, m: number, d: number, hh: number, mm: number): Date {
  return new Date(y, m - 1, d, hh, mm, 0, 0)
}

function item(partial: Pick<Appointment, 'id' | 'dogId' | 'start'> & { minutes?: number }): Appointment {
  return {
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: partial.minutes ?? 60, price: 20 }],
    createdAt: partial.start,
    updatedAt: partial.start,
    ...partial,
  }
}

const bagno: Service = {
  id: 'bagno', name: 'Bagno', kind: 'principale', order: 0, active: true,
  durationMin: { piccola: 30, media: 45, grande: 60 },
  price: { piccola: 20, media: 28, grande: 38 },
  createdAt: at(2026, 10, 1, 9, 0),
  updatedAt: at(2026, 10, 1, 9, 0),
}

describe('appuntamenti puri', () => {
  it('formatta durata, prezzo copiato e la data del toast', () => {
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(60)).toBe('1h')
    expect(formatDuration(75)).toBe('1h 15')
    expect(formatDuration(120)).toBe('2h')
    expect(formatBookedWhen(at(2026, 10, 29, 9, 30))).toBe('gio 29 ott 09:30')
    expect(quoteServices([bagno], ['bagno'], 'piccola')).toEqual([
      { serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 },
    ])
    expect(quoteServices([{ ...bagno, active: false }], ['bagno'], 'piccola')).toBeNull()
    expect(quoteServices([bagno], ['manca'], 'piccola')).toBeNull()
  })

  it('non sovrappone due intervalli che si toccano e raggruppa il giorno locale', () => {
    expect(rangesOverlap(at(2026, 10, 3, 9, 0), at(2026, 10, 3, 10, 0), at(2026, 10, 3, 10, 0), at(2026, 10, 3, 11, 0))).toBe(false)
    expect(rangesOverlap(at(2026, 10, 3, 9, 0), at(2026, 10, 3, 10, 0), at(2026, 10, 3, 9, 30), at(2026, 10, 3, 10, 30))).toBe(true)
    expect(localDayKey(at(2026, 1, 3, 0, 30))).toBe('2026-01-03')
    const now = at(2026, 10, 3, 12, 0)
    expect(localDayKey(parseDayParam(null, now))).toBe('2026-10-03')
    expect(localDayKey(parseDayParam('2026-02-31', now))).toBe('2026-10-03')
    expect(localDayKey(parseDayParam('2026-10-05', now))).toBe('2026-10-05')
    const label = overlapLabel(
      [item({ id: 'a', dogId: 'manca', start: at(2026, 10, 3, 9, 0) }), item({ id: 'b', dogId: 'rex', start: at(2026, 10, 3, 9, 30) })],
      (dogId) => (dogId === 'rex' ? 'Rex' : 'Cane assente'),
      at(2026, 10, 3, 9, 15),
      at(2026, 10, 3, 10, 15),
      'self',
    )
    expect(label).toBe('Si sovrappone a Cane assente, Rex')
  })

  it('sceglie il futuro più vicino, altrimenti il passato, e sposta le settimane', () => {
    const now = at(2026, 10, 3, 12, 0)
    const items = [
      item({ id: 'past', dogId: 'bobi', start: at(2026, 10, 1, 9, 0) }),
      item({ id: 'soon', dogId: 'bobi', start: at(2026, 10, 4, 9, 30) }),
      item({ id: 'later', dogId: 'bobi', start: at(2026, 10, 20, 9, 0) }),
      item({ id: 'other', dogId: 'luna', start: at(2026, 10, 4, 8, 0) }),
    ]
    expect(chipSource(items, 'bobi', now)?.id).toBe('soon')
    expect(nextAppointment(items, 'bobi', now)?.id).toBe('soon')
    expect(chipSource(items, 'bobi', at(2026, 10, 21, 12, 0))?.id).toBe('later')
    expect(chipSource(items, 'nuovo', now)).toBeNull()
    expect(nextAppointment([items[0]], 'bobi', now)).toBeNull()
    const shifted = shiftWeeks(at(2026, 10, 29, 9, 30), 2)
    expect(formatBookedWhen(shifted)).toBe('gio 12 nov 09:30')
    expect(chipOpenDay(at(2026, 10, 3, 15, 0), 2)).toBe('2026-10-17')
    expect(visibleServiceNames(['Bagno', 'Taglio', 'Nodi'])).toEqual({ shown: ['Bagno', 'Taglio'], extra: 1 })
    expect(visibleServiceNames(['Bagno'])).toEqual({ shown: ['Bagno'], extra: 0 })
  })
})

describe('prepareAppointmentWrite', () => {
  it('prepara le righe per la taglia e tiene il cane archiviato già legato', () => {
    const dog: Dog = {
      id: 'bobi', name: 'Bobi', species: 'cane', breed: '', ageCategory: 'adulto',
      size: 'piccola', temperament: 'bravo', clientType: 'occasionale',
      contact: { name: '', phone: '333' }, status: 'attivo', searchKey: 'bobi',
      createdAt: at(2026, 10, 1, 9, 0), updatedAt: at(2026, 10, 1, 9, 0),
    }
    const values = { dogId: 'bobi', serviceIds: ['bagno'], day: '2026-10-03', time: '09:00' }
    const ready = prepareAppointmentWrite(values, [dog], [bagno], null)
    expect(ready.ok).toBe(true)
    if (ready.ok) {
      expect(ready.write.services[0]).toEqual({ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 })
      expect(ready.write.start).toEqual(at(2026, 10, 3, 9, 0))
    }
    const archived = { ...dog, status: 'deceduto' as const }
    expect(prepareAppointmentWrite(values, [archived], [bagno], null)).toEqual({ ok: false, field: 'dogId', message: 'Scegli un cane' })
    const kept = prepareAppointmentWrite(values, [archived], [bagno], item({ id: 'app', dogId: 'bobi', start: at(2026, 10, 3, 9, 0) }))
    expect(kept.ok).toBe(true)
  })
})
