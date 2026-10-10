import { describe, expect, it } from 'vitest'
import type { Appointment, Dog } from '../types/models'
import { SIZES } from '../theme/sizes'
import {
  blockTone,
  daySummary,
  gridBounds,
  daySwipe,
  monthCellFace,
  offHourCounts,
  openingScroll,
  parseVista,
  placeAppointments,
  shiftCalendar,
  snapQuarter,
  weekDays,
} from './calendarView'

function dog(id: string, temperament: Dog['temperament']): Dog {
  return { id, temperament } as Dog
}

function visit(dogId: string, minutes: number): Appointment {
  return {
    id: `${dogId}-${minutes}`,
    dogId,
    start: new Date(2026, 9, 5, 9, 0, 0, 0),
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: minutes, price: 1 }],
    status: 'programmato',
    createdAt: new Date(2026, 9, 5, 9, 0, 0, 0),
    updatedAt: new Date(2026, 9, 5, 9, 0, 0, 0),
  }
}

describe('blockTone', () => {
  it('preferisce il mensile, poi bagno e taglio, poi dermatologico o antiparassitario', () => {
    expect(blockTone('mensile', ['bagno_taglio'])).toBe('warn')
    expect(blockTone('occasionale', ['bagno_taglio'])).toBe('sen')
    expect(blockTone('occasionale', ['dermatologico'])).toBe('tea')
    expect(blockTone('occasionale', ['antiparassitario'])).toBe('tea')
    expect(blockTone('occasionale', ['bagno'])).toBe('pri')
    expect(blockTone('occasionale', ['bagno-taglio'])).toBe('pri')
  })
})

describe('parseVista', () => {
  it('torna giorno se il valore non è uno dei tre', () => {
    expect(parseVista('no')).toBe('giorno')
    expect(parseVista(null)).toBe('giorno')
    expect(parseVista('settimana')).toBe('settimana')
    expect(parseVista('mese')).toBe('mese')
  })
})

describe('snapQuarter', () => {
  it('aggancia ai quarti d’ora e resta fra le 08:00 e le 19:00', () => {
    expect(snapQuarter(new Date(2026, 9, 5, 10, 7))).toEqual(new Date(2026, 9, 5, 10, 0))
    expect(snapQuarter(new Date(2026, 9, 5, 10, 8))).toEqual(new Date(2026, 9, 5, 10, 15))
    expect(snapQuarter(new Date(2026, 9, 5, 20, 0))).toEqual(new Date(2026, 9, 5, 19, 0))
    expect(snapQuarter(new Date(2026, 9, 5, 7, 30))).toEqual(new Date(2026, 9, 5, 8, 0))
    expect(snapQuarter(new Date(2026, 9, 5, 7, 0))).toEqual(new Date(2026, 9, 5, 8, 0))
    expect(snapQuarter(new Date(2026, 9, 5, 19, 30))).toEqual(new Date(2026, 9, 5, 19, 0))
  })
})

describe('placeAppointments', () => {
  it('affianca 10:00, 10:30 e 11:00 da 90 minuti', () => {
    const placed = placeAppointments([
      { id: 'c', start: new Date(2026, 9, 10, 11, 0), durationMin: 90 },
      { id: 'a', start: new Date(2026, 9, 10, 10, 0), durationMin: 90 },
      { id: 'b', start: new Date(2026, 9, 10, 10, 30), durationMin: 90 },
      { id: 'd', start: new Date(2026, 9, 10, 12, 30), durationMin: 60 },
    ])
    const byId = Object.fromEntries(placed.map((item) => [item.id, item]))
    expect(new Set([byId.a.column, byId.b.column, byId.c.column]).size).toBe(3)
    expect(byId.a.columnCount).toBe(3)
    expect(byId.d.columnCount).toBe(1)
  })

  it('tiene sulla stessa colonna due appuntamenti che si toccano', () => {
    const placed = placeAppointments([
      { id: 'a', start: new Date(2026, 9, 10, 10, 0), durationMin: 60 },
      { id: 'b', start: new Date(2026, 9, 10, 11, 0), durationMin: 60 },
    ])
    const byId = Object.fromEntries(placed.map((item) => [item.id, item]))
    expect(byId.a.column).toBe(0)
    expect(byId.b.column).toBe(0)
    expect(byId.a.columnCount).toBe(1)
    expect(byId.b.columnCount).toBe(1)
  })

  it('la durata 0 conta come 15 minuti per le colonne', () => {
    const placed = placeAppointments([
      { id: 'ponte', start: new Date(2026, 9, 10, 10, 0), durationMin: 120 },
      { id: 'zero', start: new Date(2026, 9, 10, 10, 0), durationMin: 0 },
      { id: 'dentro', start: new Date(2026, 9, 10, 10, 10), durationMin: 15 },
      { id: 'quarto', start: new Date(2026, 9, 10, 10, 15), durationMin: 15 },
      { id: 'dopo', start: new Date(2026, 9, 10, 10, 30), durationMin: 15 },
    ])
    const byId = Object.fromEntries(placed.map((item) => [item.id, item]))
    expect(byId.zero.column).not.toBe(byId.dentro.column)
    expect(byId.zero.column).toBe(byId.quarto.column)
    expect(byId.zero.column).toBe(byId.dopo.column)
    expect(byId.dentro.columnCount).toBe(byId.zero.columnCount)
  })
})

describe('gridBounds', () => {
  it('mostra per intero le 07:00 e le 18:45 più due ore', () => {
    expect(gridBounds([
      { start: new Date(2026, 9, 10, 7, 0), end: new Date(2026, 9, 10, 8, 0) },
      { start: new Date(2026, 9, 10, 18, 45), end: new Date(2026, 9, 10, 20, 45) },
    ])).toEqual({ startHour: 7, endHour: 21 })
  })

  it('senza fasce resta fra le 08:00 e le 19:00', () => {
    expect(gridBounds([])).toEqual({ startHour: 8, endHour: 19 })
  })

  it('un inizio alle 07:15 parte dalle 07:00', () => {
    expect(gridBounds([
      { start: new Date(2026, 9, 10, 7, 15), end: new Date(2026, 9, 10, 8, 0) },
    ])).toEqual({ startHour: 7, endHour: 19 })
  })

  it('una fine alle 20:00 resta sulle 20 e una alle 20:45 arriva alle 21', () => {
    expect(gridBounds([
      { start: new Date(2026, 9, 10, 18, 0), end: new Date(2026, 9, 10, 20, 0) },
    ])).toEqual({ startHour: 8, endHour: 20 })
    expect(gridBounds([
      { start: new Date(2026, 9, 10, 19, 0), end: new Date(2026, 9, 10, 20, 45) },
    ])).toEqual({ startHour: 8, endHour: 21 })
  })
})

describe('openingScroll', () => {
  it('un giorno che non è oggi parte dalle 08:00', () => {
    expect(openingScroll({
      isToday: false,
      now: new Date(2026, 9, 10, 15, 0),
      startHour: 7,
      endHour: 21,
      hourHeight: 50,
      viewportHeight: 400,
    })).toBe(50)
  })

  it('oggi tiene la linea a un terzo e non esce dalla griglia', () => {
    const base = {
      isToday: true,
      startHour: 8,
      endHour: 19,
      hourHeight: 50,
      viewportHeight: 300,
    }
    expect(openingScroll({ ...base, now: new Date(2026, 9, 10, 7, 30) })).toBe(0)
    expect(openingScroll({ ...base, now: new Date(2026, 9, 10, 8, 0) })).toBe(0)
    expect(openingScroll({ ...base, now: new Date(2026, 9, 10, 12, 0) })).toBe(100)
    expect(openingScroll({ ...base, now: new Date(2026, 9, 10, 18, 0) })).toBe(250)
    expect(openingScroll({ ...base, now: new Date(2026, 9, 10, 20, 0) })).toBe(250)
    expect(openingScroll({
      isToday: true,
      now: new Date(2026, 9, 10, 9, 48),
      startHour: 8,
      endHour: 10,
      hourHeight: 50,
      viewportHeight: 150,
    })).toBe(0)
  })

  it('un altro giorno non scorre prima di zero né oltre il fondo', () => {
    expect(openingScroll({
      isToday: false,
      now: new Date(2026, 9, 10, 15, 0),
      startHour: 10,
      endHour: 19,
      hourHeight: 50,
      viewportHeight: 400,
    })).toBe(0)
    expect(openingScroll({
      isToday: false,
      now: new Date(2026, 9, 10, 15, 0),
      startHour: 7,
      endHour: 8,
      hourHeight: 50,
      viewportHeight: 40,
    })).toBe(10)
  })
})

describe('offHourCounts', () => {
  it('conta gli inizi prima delle 8 e le fini dopo le 19', () => {
    expect(offHourCounts([
      { start: new Date(2026, 9, 10, 7, 0), end: new Date(2026, 9, 10, 8, 30) },
      { start: new Date(2026, 9, 10, 18, 0), end: new Date(2026, 9, 10, 19, 0) },
      { start: new Date(2026, 9, 10, 19, 0), end: new Date(2026, 9, 10, 20, 45) },
      { start: new Date(2026, 9, 10, 8, 0), end: new Date(2026, 9, 10, 9, 0) },
    ], 8, 19)).toEqual({ before: 1, after: 1 })
  })
})

describe('calendar hourHeight', () => {
  it('è 50', () => {
    expect(SIZES.calendar.hourHeight).toBe(50)
  })
})

describe('weekDays', () => {
  it('è il lunedì–domenica che contiene il giorno', () => {
    const days = weekDays(new Date(2026, 9, 3))
    expect(days).toHaveLength(7)
    expect(days[0].getDay()).toBe(1)
    expect(days[0].getMonth()).toBe(8)
    expect(days[0].getDate()).toBe(28)
    expect(days[6].getDay()).toBe(0)
    expect(days[6].getDate()).toBe(4)
  })
})

describe('daySummary', () => {
  it('conta i cani distinti, somma le durate e i mordaci distinti', () => {
    const dogs = [dog('rex', 'mordace'), dog('luna', 'bravo')]
    expect(daySummary(dogs, [visit('rex', 30), visit('rex', 45), visit('luna', 20)])).toEqual({
      dogs: 2,
      minutes: 95,
      mordaci: 1,
    })
    expect(daySummary(dogs, [])).toEqual({ dogs: 0, minutes: 0, mordaci: 0 })
  })
})

describe('shiftCalendar', () => {
  const day = new Date(2026, 9, 11)

  it('in giorno sposta di un giorno, in settimana di sette, in mese di un mese', () => {
    expect(shiftCalendar('giorno', day, 1).getDate()).toBe(12)
    expect(shiftCalendar('settimana', day, 1).getDate()).toBe(18)
    expect(shiftCalendar('settimana', day, -1).getDate()).toBe(4)
    const next = shiftCalendar('mese', day, 1)
    expect(next.getMonth()).toBe(10)
    expect(next.getDate()).toBe(11)
  })
})

describe('daySwipe', () => {
  it('a sinistra va avanti, a destra torna indietro, il verticale e la soglia no', () => {
    expect(daySwipe(-48, 10)).toBe(1)
    expect(daySwipe(48, 10)).toBe(-1)
    expect(daySwipe(-47, 0)).toBe(0)
    expect(daySwipe(-80, 80)).toBe(0)
    expect(daySwipe(10, 80)).toBe(0)
  })
})

describe('monthCellFace', () => {
  it('un giorno del mese con appuntamenti è verde e ha il tondo', () => {
    expect(monthCellFace({ count: 2, selected: false, today: false, inMonth: true, weekend: true })).toEqual({
      background: 'var(--ok-s)',
      color: 'var(--ok)',
      fontWeight: 800,
      badge: '2',
      badgeHalo: false,
    })
  })

  it('zero appuntamenti non ha tondo, il weekend resta surf', () => {
    expect(monthCellFace({ count: 0, selected: false, today: false, inMonth: true, weekend: true })).toEqual({
      background: 'var(--surf)',
      color: 'var(--tx)',
      fontWeight: 600,
      badge: null,
      badgeHalo: false,
    })
  })

  it('il selezionato è blu e, se ha appuntamenti, il tondo ha l’alone', () => {
    expect(monthCellFace({ count: 1, selected: true, today: true, inMonth: true, weekend: true })).toEqual({
      background: 'var(--pri-solid)',
      color: '#fff',
      fontWeight: 800,
      badge: '1',
      badgeHalo: true,
    })
  })

  it('oggi non selezionato tiene l’anello, anche col verde', () => {
    const face = monthCellFace({ count: 2, selected: false, today: true, inMonth: true, weekend: false })
    expect(face.boxShadow).toBe('inset 0 0 0 2px var(--pri)')
    expect(face.background).toBe('var(--ok-s)')
  })

  it('un giorno fuori mese tiene il tondo e il testo grigio, senza sfondo verde', () => {
    expect(monthCellFace({ count: 3, selected: false, today: false, inMonth: false, weekend: false })).toMatchObject({
      background: 'transparent',
      color: 'var(--tx3)',
      badge: '3',
      badgeHalo: false,
    })
  })
})
