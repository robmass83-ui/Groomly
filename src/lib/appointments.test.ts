import { describe, expect, it } from 'vitest'
import type { Appointment, Dog, Service } from '../types/models'
import {
  chipOpenDay,
  canComplete,
  chipSource,
  formatBookedWhen,
  formatDuration,
  isOverdue,
  localDayKey,
  orarioProposto,
  nextAppointment,
  appointmentEnd,
  nextCloseDue,
  overlapLabel,
  parseAppointmentStatus,
  parseCancelReason,
  parseDayParam,
  prepareAppointmentWrite,
  quoteServices,
  rangesOverlap,
  repeatChoice,
  sameClockWeeksLater,
  shiftWeeks,
  visibleServiceNames,
} from './appointments'

function at(y: number, m: number, d: number, hh: number, mm: number): Date {
  return new Date(y, m - 1, d, hh, mm, 0, 0)
}

function item(
  partial: Pick<Appointment, 'id' | 'dogId' | 'start'> & { minutes?: number; status?: Appointment['status'] },
): Appointment {
  return {
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: partial.minutes ?? 60, price: 20 }],
    createdAt: partial.start,
    updatedAt: partial.start,
    status: 'programmato',
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
  it('la fine delega l’arrotondamento dei minuti', () => {
    expect(appointmentEnd(at(2026, 10, 3, 9, 0), [{ durationMin: 70 }])).toEqual(at(2026, 10, 3, 10, 10))
    expect(appointmentEnd(at(2026, 10, 3, 9, 0), [{ durationMin: 40 }, { durationMin: 32 }])).toEqual(at(2026, 10, 3, 10, 10))
    expect(appointmentEnd(at(2026, 10, 3, 9, 0), [{ durationMin: 40 }, { durationMin: 33 }])).toEqual(at(2026, 10, 3, 10, 15))
  })

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

  it('assignee filtra la sovrapposizione e senza filtro tiene entrambi i cani', () => {
    const start = at(2026, 10, 3, 9, 0)
    const end = at(2026, 10, 3, 10, 0)
    const dogName = (dogId: string) => (dogId === 'luna' ? 'Luna' : dogId === 'rex' ? 'Rex' : 'Nero')
    const luna = { ...item({ id: 'a', dogId: 'luna', start }), assigneeUid: 'a' }
    const rex = { ...item({ id: 'b', dogId: 'rex', start }), assigneeUid: 'b' }
    const nero = item({ id: 'o', dogId: 'nero', start })
    const pair = [luna, rex]
    expect(overlapLabel(pair, dogName, start, end, undefined, { ownerUid: 'owner', assigneeUid: 'a' })).toBe('Si sovrappone a Luna')
    expect(overlapLabel(pair, dogName, start, end, undefined)).toBe('Si sovrappone a Luna, Rex')
    const withOwner = [luna, rex, nero]
    expect(overlapLabel(withOwner, dogName, start, end, undefined, { ownerUid: 'owner', assigneeUid: 'owner' })).toBe('Si sovrappone a Nero')
    expect(overlapLabel(withOwner, dogName, start, end, undefined, { ownerUid: 'owner', assigneeUid: 'a' })).toBe('Si sovrappone a Luna')
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

  it('un completato ancora davanti non è il prossimo, e senza aperti il chip prende lo start più grande', () => {
    const now = at(2026, 10, 3, 12, 0)
    const done = item({ id: 'done', dogId: 'bobi', start: at(2026, 10, 17, 9, 0), status: 'completato' })
    const older = item({ id: 'old', dogId: 'bobi', start: at(2026, 10, 1, 9, 0), status: 'completato' })
    const open = item({ id: 'open', dogId: 'bobi', start: at(2026, 10, 20, 9, 0) })
    expect(nextAppointment([done], 'bobi', now)).toBeNull()
    expect(nextAppointment([done, open], 'bobi', now)?.id).toBe('open')
    expect(chipSource([done, open], 'bobi', now)?.id).toBe('open')
    expect(chipSource([done, older], 'bobi', now)?.id).toBe('done')
    const same = at(2026, 10, 1, 9, 0)
    expect(chipSource([
      item({ id: 'b', dogId: 'bobi', start: same, status: 'completato' }),
      item({ id: 'a', dogId: 'bobi', start: same, status: 'completato' }),
    ], 'bobi', now)?.id).toBe('a')
  })
})

describe('prepareAppointmentWrite', () => {
  it('prepara le righe per la taglia e tiene il cane archiviato già legato', () => {
    const dog: Dog = {
      id: 'bobi', name: 'Bobi', species: 'cane', breed: '', ageCategory: 'adulto',
      size: 'piccola', temperament: 'bravo', clientType: 'occasionale',
      contact: { name: '', phone: '333' }, status: 'attivo', searchKey: 'bobi',
      tags: [], servicePrices: [], hiddenServiceIds: [], customFields: [], gallery: [], contacts: [],
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

describe('ripetizione, stati e Completato', () => {
  it('repeatChoice: spento un solo appuntamento, acceso due, il tipo cambia solo con makeMonthly', () => {
    expect(repeatChoice({ repeat: false, makeMonthly: false, weeks: 4, dogClientType: 'occasionale' })).toEqual({ count: 1, nextClientType: 'occasionale', weeks: 4 })
    expect(repeatChoice({ repeat: true, makeMonthly: false, weeks: 4, dogClientType: 'occasionale' })).toEqual({ count: 2, nextClientType: 'occasionale', weeks: 4 })
    expect(repeatChoice({ repeat: true, makeMonthly: true, weeks: 6, dogClientType: 'occasionale' })).toEqual({ count: 2, nextClientType: 'mensile', weeks: 6 })
    expect(repeatChoice({ repeat: false, makeMonthly: true, weeks: 3, dogClientType: 'occasionale' })).toEqual({ count: 1, nextClientType: 'mensile', weeks: 3 })
    expect(repeatChoice({ repeat: true, makeMonthly: false, weeks: 2, dogClientType: 'mensile' })).toEqual({ count: 2, nextClientType: 'mensile', weeks: 2 })
    expect(repeatChoice({ repeat: false, makeMonthly: false, weeks: 2, dogClientType: 'mensile' })).toEqual({ count: 1, nextClientType: 'mensile', weeks: 2 })
    expect(repeatChoice({ repeat: true, makeMonthly: false, weeks: 0, dogClientType: 'occasionale' }).weeks).toBe(4)
    expect(repeatChoice({ repeat: true, makeMonthly: false, weeks: 2.5, dogClientType: 'occasionale' }).weeks).toBe(4)
  })

  it('il secondo appuntamento è N settimane dopo, alla stessa ora', () => {
    expect(sameClockWeeksLater(at(2026, 10, 15, 10, 0), 4)).toEqual(new Date(2026, 10, 12, 10, 0, 0, 0))
    expect(sameClockWeeksLater(at(2026, 10, 15, 10, 0), 6)).toEqual(new Date(2026, 10, 26, 10, 0, 0, 0))
    expect(sameClockWeeksLater(at(2026, 10, 20, 10, 0), 2)).toEqual(new Date(2026, 10, 3, 10, 0, 0, 0))
  })

  it('i quattro stati sono noti, il resto resta programmato', () => {
    for (const status of ['programmato', 'completato', 'disdetto', 'non_venuto']) expect(parseAppointmentStatus(status)).toBe(status)
    for (const bad of ['chiuso', 'cancellato', '', undefined, null, 3]) expect(parseAppointmentStatus(bad)).toBe('programmato')
    expect(parseCancelReason('cliente')).toBe('cliente')
    expect(parseCancelReason('salone')).toBe('salone')
    expect(parseCancelReason('deceduto')).toBe('deceduto')
    expect(parseCancelReason('altro')).toBeUndefined()
    expect(parseCancelReason(undefined)).toBeUndefined()
  })

  it('Completato oggi a qualsiasi ora e nei giorni passati, non da domani', () => {
    const now = at(2026, 10, 3, 12, 0)
    expect(canComplete(at(2026, 10, 3, 8, 0), now)).toBe(true)
    expect(canComplete(at(2026, 10, 3, 18, 30), now)).toBe(true)
    expect(canComplete(at(2026, 9, 5, 9, 0), now)).toBe(true)
    expect(canComplete(at(2026, 10, 4, 0, 0), now)).toBe(false)
    expect(canComplete(at(2026, 10, 4, 9, 0), now)).toBe(false)
  })

  it('da chiudere scatta un’ora dopo la fine in calendario', () => {
    const open = item({ id: 'a', dogId: 'luna', start: at(2026, 10, 3, 12, 0), minutes: 60 })
    expect(appointmentEnd(open.start, open.services)).toEqual(at(2026, 10, 3, 13, 0))
    expect(isOverdue(open, at(2026, 10, 3, 13, 59))).toBe(false)
    expect(isOverdue(open, at(2026, 10, 3, 14, 0))).toBe(true)
    expect(isOverdue(item({ id: 'b', dogId: 'luna', start: at(2026, 10, 2, 23, 0), minutes: 60 }), at(2026, 10, 3, 0, 30))).toBe(false)
    expect(isOverdue(item({ id: 'c', dogId: 'luna', start: at(2026, 10, 2, 23, 0), minutes: 60 }), at(2026, 10, 3, 1, 0))).toBe(true)
    const rounded = item({ id: 'd', dogId: 'luna', start: at(2026, 10, 3, 9, 0), minutes: 70 })
    expect(isOverdue(rounded, at(2026, 10, 3, 11, 9))).toBe(false)
    expect(isOverdue(rounded, at(2026, 10, 3, 11, 10))).toBe(true)
    for (const status of ['completato', 'disdetto', 'non_venuto'] as const) {
      expect(isOverdue(item({ id: status, dogId: 'luna', start: at(2026, 10, 2, 9, 0), status }), at(2026, 10, 3, 12, 0))).toBe(false)
    }
    const later = item({ id: 'e', dogId: 'luna', start: at(2026, 10, 3, 15, 0), minutes: 60 })
    expect(nextCloseDue([open, later], at(2026, 10, 3, 13, 0))).toBe(at(2026, 10, 3, 14, 0).getTime())
    expect(nextCloseDue([open], at(2026, 10, 3, 14, 0))).toBeNull()
  })

  it('un disdetto o un non venuto non è il prossimo appuntamento', () => {
    const now = at(2026, 10, 3, 12, 0)
    const cancelled = item({ id: 'c', dogId: 'bobi', start: at(2026, 10, 10, 9, 0), status: 'disdetto' })
    const absent = item({ id: 'n', dogId: 'bobi', start: at(2026, 10, 11, 9, 0), status: 'non_venuto' })
    const open = item({ id: 'o', dogId: 'bobi', start: at(2026, 10, 20, 9, 0) })
    expect(nextAppointment([cancelled, absent], 'bobi', now)).toBeNull()
    expect(nextAppointment([cancelled, absent, open], 'bobi', now)?.id).toBe('o')
  })

  it('alle 18 propone il quarto d’ora corrente e prima delle 9 resta sulle 09:00', () => {
    expect(orarioProposto(at(2026, 10, 3, 18, 0))).toBe('18:00')
    expect(orarioProposto(at(2026, 10, 3, 18, 7))).toBe('18:15')
    expect(orarioProposto(at(2026, 10, 3, 7, 30))).toBe('09:00')
    expect(orarioProposto(at(2026, 10, 3, 19, 30))).toBe('09:00')
  })
})
