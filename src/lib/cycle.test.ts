import { describe, expect, it } from 'vitest'
import { cycleRow, dueSoon, monthBoard, monthlyStatus, recurrenceWeeksOf } from './cycle'
import type { Appointment, AppointmentStatus, Dog } from '../types/models'

const now = new Date(2026, 9, 3, 12, 0, 0, 0)

function dog(id: string, name: string, extra: Partial<Dog> = {}): Dog {
  return {
    id,
    name,
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'mensile',
    status: 'attivo',
    contact: { name: '', phone: '333' },
    searchKey: name.toLowerCase(),
    createdAt: now,
    updatedAt: now,
    ...extra,
    tags: extra.tags ?? [],
    servicePrices: extra.servicePrices ?? [],
    hiddenServiceIds: extra.hiddenServiceIds ?? [],
    customFields: extra.customFields ?? [],
    gallery: extra.gallery ?? [],
    contacts: extra.contacts ?? [],
  }
}

function visit(id: string, dogId: string, start: Date, status: AppointmentStatus = 'programmato'): Appointment {
  return {
    id,
    dogId,
    start,
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    status,
    createdAt: start,
    updatedAt: start,
  }
}

function withWeeks(target: Dog, weeks: number): Dog {
  return Object.assign(target, { recurrenceWeeks: weeks })
}

const mensile = dog('mensile', 'Mensile')

function completed(start: Date): Appointment {
  return visit(`c-${start.getTime()}`, mensile.id, start, 'completato')
}

function programmato(start: Date): Appointment {
  return visit(`p-${start.getTime()}`, mensile.id, start)
}

describe('cycle', () => {
  it('senza il campo usa 4 settimane e un numero esplicito resta quello', () => {
    expect(recurrenceWeeksOf(dog('rex', 'Rex'))).toBe(4)
    expect(recurrenceWeeksOf(withWeeks(dog('luna', 'Luna'), 6))).toBe(6)
  })

  it('un mensile con ultimo completato il 5 settembre è da fissare il 3 ottobre', () => {
    const luna = dog('luna', 'Luna')
    const completed = visit('done', 'luna', new Date(2026, 8, 5, 9, 30, 0, 0), 'completato')
    const row = cycleRow(luna, [completed, visit('other', 'kira', new Date(2026, 8, 1, 9, 0, 0, 0), 'completato')], now)
    expect(row?.dog).toBe(luna)
    expect(row?.state).toBe('da_fissare')
    expect(row?.due).toEqual(new Date(2026, 9, 3, 9, 30, 0, 0))
    expect(row?.lastCompleted?.id).toBe('done')
    expect(row?.booked).toBeNull()
  })

  it('lo stesso cane con un programmato il 10 ottobre è fissato', () => {
    const luna = dog('luna', 'Luna')
    const completed = visit('done', 'luna', new Date(2026, 8, 5, 9, 30, 0, 0), 'completato')
    const booked = visit('next', 'luna', new Date(2026, 9, 10, 11, 0, 0, 0))
    const row = cycleRow(luna, [completed, booked], now)
    expect(row?.state).toBe('fissato')
    expect(row?.booked?.id).toBe('next')
    expect(row?.due).toEqual(new Date(2026, 9, 3, 9, 30, 0, 0))
  })

  it('un programmato il 17 ottobre alle 09:00 fissa anche oltre i vecchi 14 giorni', () => {
    const rex = dog('rex', 'Rex')
    const late = cycleRow(rex, [visit('late', 'rex', new Date(2026, 9, 17, 9, 0, 0, 0))], now)
    expect(late?.due).toEqual(new Date(2026, 9, 3, 0, 0, 0, 0))
    expect(late?.state).toBe('fissato')
    expect(late?.booked?.id).toBe('late')
  })

  it('un programmato il 20 novembre è fissato in ritardo e non entra nel banner', () => {
    const luna = dog('luna', 'Luna')
    const completed = visit('done', 'luna', new Date(2026, 8, 5, 9, 30, 0, 0), 'completato')
    const far = visit('far', 'luna', new Date(2026, 10, 20, 9, 0, 0, 0))
    const row = cycleRow(luna, [completed, far], now)
    expect(row?.state).toBe('fissato')
    expect(row?.booked?.id).toBe('far')
    expect(monthlyStatus(luna, [completed, far], now, 7)?.group).toBe('fissato')
    expect(monthlyStatus(luna, [completed, far], now, 7)?.late).toBe(true)
    expect(dueSoon([luna], [completed, far], now, 7)).toEqual([])
  })

  it('un programmato passato non è l’ultimo trattamento', () => {
    const luna = dog('luna', 'Luna')
    const completed = visit('done', 'luna', new Date(2026, 7, 1, 9, 0, 0, 0), 'completato')
    const past = visit('past', 'luna', new Date(2026, 8, 5, 9, 30, 0, 0))
    const row = cycleRow(luna, [completed, past], now)
    expect(row?.lastCompleted?.id).toBe('done')
    expect(row?.due).toEqual(new Date(2026, 7, 29, 9, 0, 0, 0))
    expect(row?.state).toBe('da_fissare')
    expect(row?.booked).toBeNull()
  })

  it('un mensile senza completati ha due il 3 ottobre ed è da fissare', () => {
    const row = cycleRow(dog('rex', 'Rex'), [], now)
    expect(row?.due).toEqual(new Date(2026, 9, 3, 0, 0, 0, 0))
    expect(row?.lastCompleted).toBeNull()
    expect(row?.booked).toBeNull()
    expect(row?.state).toBe('da_fissare')
  })

  it('6 settimane spostano la scadenza e tra due programmati prende lo start minore', () => {
    const luna = withWeeks(dog('luna', 'Luna'), 6)
    const completed = visit('done', 'luna', new Date(2026, 8, 5, 9, 30, 0, 0), 'completato')
    const later = visit('b', 'luna', new Date(2026, 9, 12, 9, 0, 0, 0))
    const sooner = visit('a', 'luna', new Date(2026, 9, 10, 9, 0, 0, 0))
    const row = cycleRow(luna, [completed, later, sooner], now)
    expect(row?.due).toEqual(new Date(2026, 9, 17, 9, 30, 0, 0))
    expect(row?.state).toBe('fissato')
    expect(row?.booked?.id).toBe('a')
  })

  it('cycleRow è null se il cane non è attivo o non è mensile', () => {
    expect(cycleRow(dog('a', 'Archivio', { status: 'deceduto' }), [], now)).toBeNull()
    expect(cycleRow(dog('b', 'Pausa', { status: 'non_in_cura' }), [], now)).toBeNull()
    expect(cycleRow(dog('c', 'Otto', { clientType: 'occasionale' }), [], now)).toBeNull()
  })

  it('monthBoard del mese corrente tiene le scadenze del mese e i da fissare arretrati', () => {
    const rex = dog('rex', 'Rex')
    const mia = dog('mia', 'Mia')
    const anna = dog('anna', 'Anna')
    const bea = dog('bea', 'Bea')
    const zoe = dog('zoe', 'Zoe')
    const ciro = withWeeks(dog('ciro', 'Ciro'), 8)
    const rows = monthBoard(
      [zoe, ciro, anna, rex, bea, mia],
      [
        visit('mia-done', 'mia', new Date(2026, 8, 5, 9, 30, 0, 0), 'completato'),
        visit('mia-next', 'mia', new Date(2026, 9, 8, 9, 0, 0, 0)),
        visit('anna-done', 'anna', new Date(2026, 8, 5, 9, 30, 0, 0), 'completato'),
        visit('anna-next', 'anna', new Date(2026, 9, 10, 11, 0, 0, 0)),
        visit('bea-done', 'bea', new Date(2026, 7, 1, 9, 0, 0, 0), 'completato'),
        visit('zoe-done', 'zoe', new Date(2026, 8, 22, 9, 0, 0, 0), 'completato'),
        visit('ciro-done', 'ciro', new Date(2026, 8, 12, 9, 0, 0, 0), 'completato'),
      ],
      now,
      now,
    )
    expect(rows.daFissare.map((row) => row.dog.name)).toEqual(['Bea', 'Rex', 'Zoe'])
    expect(rows.fissati.map((row) => row.booked?.id)).toEqual(['mia-next', 'anna-next'])
  })

  it('un mese diverso da oggi non ripesca i da fissare dei mesi prima', () => {
    const bea = dog('bea', 'Bea')
    const ciro = withWeeks(dog('ciro', 'Ciro'), 8)
    const rows = monthBoard(
      [bea, ciro],
      [
        visit('bea-done', 'bea', new Date(2026, 7, 1, 9, 0, 0, 0), 'completato'),
        visit('ciro-done', 'ciro', new Date(2026, 8, 12, 9, 0, 0, 0), 'completato'),
      ],
      new Date(2026, 10, 1, 12, 0, 0, 0),
      now,
    )
    expect(rows.daFissare.map((row) => row.dog.id)).toEqual(['ciro'])
    expect(rows.fissati).toEqual([])
  })

  it('dueSoon con 7 giorni include la scadenza di oggi e un arretrato, non il 20 ottobre', () => {
    const rex = dog('rex', 'Rex')
    const bea = dog('bea', 'Bea')
    const zoe = dog('zoe', 'Zoe')
    const anna = dog('anna', 'Anna')
    const rows = dueSoon(
      [zoe, anna, bea, rex],
      [
        visit('rex-done', 'rex', new Date(2026, 8, 5, 12, 0, 0, 0), 'completato'),
        visit('bea-done', 'bea', new Date(2026, 7, 1, 9, 0, 0, 0), 'completato'),
        visit('zoe-done', 'zoe', new Date(2026, 8, 22, 9, 0, 0, 0), 'completato'),
        visit('anna-done', 'anna', new Date(2026, 8, 5, 9, 30, 0, 0), 'completato'),
        visit('anna-next', 'anna', new Date(2026, 9, 10, 11, 0, 0, 0)),
      ],
      now,
      7,
    )
    expect(rows.map((row) => row.dog.name)).toEqual(['Bea', 'Rex'])
    expect(monthlyStatus(zoe, [
      visit('zoe-done', 'zoe', new Date(2026, 8, 22, 9, 0, 0, 0), 'completato'),
    ], now, 7)).toBeNull()
  })
})

describe('monthlyStatus', () => {
  const now = new Date(2026, 9, 10, 12, 0, 0, 0)

  it('un futuro oltre 14 giorni dalla scadenza è fissato in ritardo, non da fissare', () => {
    const row = monthlyStatus(mensile, [completed(new Date(2026, 8, 1, 10)), programmato(new Date(2026, 9, 24, 10))], now, 7)
    expect(row?.group).toBe('fissato')
    expect(row?.late).toBe(true)
  })

  it('senza completati è nuovo e non accende il banner', () => {
    expect(monthlyStatus(mensile, [], now, 7)?.group).toBe('nuovo')
    expect(monthlyStatus(mensile, [], now, 7)?.due).toBeNull()
    expect(monthlyStatus(mensile, [programmato(new Date(2026, 9, 20, 10))], now, 7)?.group).toBe('nuovo')
    expect(monthlyStatus(mensile, [programmato(new Date(2026, 9, 20, 10))], now, 7)?.due).toBeNull()
    expect(dueSoon([mensile], [], now, 7)).toEqual([])
    expect(dueSoon([mensile], [programmato(new Date(2026, 9, 20, 10))], now, 7)).toEqual([])
  })

  it('un programmato di ieri non fissa', () => {
    const row = monthlyStatus(mensile, [completed(new Date(2026, 8, 1, 10)), programmato(new Date(2026, 9, 9, 10))], now, 7)
    expect(row?.group).toBe('in_ritardo')
    expect(row?.booked).toBeNull()
  })

  it('la scadenza di oggi è in scadenza e il giorno dopo la finestra non conta', () => {
    const today = monthlyStatus(mensile, [completed(new Date(2026, 8, 12, 15))], now, 7)
    expect(today?.group).toBe('in_scadenza')
    expect(today?.due).toEqual(new Date(2026, 9, 10, 15))
    expect(today?.late).toBe(false)
    const edge = monthlyStatus(mensile, [completed(new Date(2026, 8, 19, 10))], now, 7)
    expect(edge?.group).toBe('in_scadenza')
    expect(edge?.due).toEqual(new Date(2026, 9, 17, 10))
    expect(monthlyStatus(mensile, [completed(new Date(2026, 8, 20, 10))], now, 7)).toBeNull()
  })

  it('un disdetto o un non venuto non fissa e non sposta la scadenza', () => {
    const missed = programmato(new Date(2026, 9, 12, 10))
    const cancelled = programmato(new Date(2026, 9, 11, 10))
    Object.assign(missed, { status: 'non_venuto' })
    Object.assign(cancelled, { status: 'disdetto' })
    const row = monthlyStatus(mensile, [completed(new Date(2026, 8, 1, 10)), missed, cancelled], now, 7)
    expect(row?.group).toBe('in_ritardo')
    expect(row?.booked).toBeNull()
    expect(row?.due).toEqual(new Date(2026, 8, 29, 10))
    expect(row?.lastCompleted?.status).toBe('completato')
  })

  it('è null se il cane non è attivo o non è mensile', () => {
    expect(monthlyStatus(dog('a', 'Archivio', { status: 'deceduto' }), [], now, 7)).toBeNull()
    expect(monthlyStatus(dog('b', 'Pausa', { status: 'non_in_cura' }), [], now, 7)).toBeNull()
    expect(monthlyStatus(dog('c', 'Otto', { clientType: 'occasionale' }), [], now, 7)).toBeNull()
  })

  it('un fissato dentro i 14 giorni non è in ritardo e non accende il banner', () => {
    const row = monthlyStatus(mensile, [completed(new Date(2026, 8, 1, 10)), programmato(new Date(2026, 9, 12, 10))], now, 7)
    expect(row?.group).toBe('fissato')
    expect(row?.late).toBe(false)
    expect(row?.booked?.start).toEqual(new Date(2026, 9, 12, 10))
    expect(dueSoon([mensile], [completed(new Date(2026, 8, 1, 10)), programmato(new Date(2026, 9, 12, 10))], now, 7)).toEqual([])
  })
})
