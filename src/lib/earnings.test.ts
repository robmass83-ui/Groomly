import { describe, expect, it } from 'vitest'
import type { Appointment, AppointmentStatus, CancelReason, Dog, Service } from '../types/models'
import { appointmentAmount, buckets, canGoNext, classify, compare, cumulativeMonth, earnedOn, maskEuro, monthBars, niceScale, parsePeriod, periodPhase, periodRange, periodTitle, plainAmount, reportBadgeVisible, reportBounds, reportOf, reportTitle, serviceBreakdown, shiftRef, spanDelta, summarize } from './earnings'

const NOW = new Date(2026, 9, 13, 15, 5)

let seq = 0
function visit(start: Date, price: number, status: AppointmentStatus = 'programmato', extra: Partial<Appointment> = {}): Appointment {
  seq += 1
  return {
    id: `a${seq}`,
    dogId: 'd1',
    start,
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price }],
    status,
    createdAt: start,
    updatedAt: start,
    ...extra,
  }
}

function cancelled(start: Date, price: number, cancelReason?: CancelReason): Appointment {
  return visit(start, price, 'disdetto', cancelReason ? { cancelReason } : {})
}

function named(id: string, name: string): Dog {
  return { id, name } as Dog
}

const DOGS: Dog[] = ['Zeus', 'Micio', 'Iris', 'Luna', 'Otto', 'Fido', 'Rex', 'Bea', 'Ciro', 'Ada'].map((name) => named(name.toLowerCase(), name))

function at(day: number, hour: number, minute = 0): Date {
  return new Date(2026, 9, day, hour, minute)
}

function line(serviceId: string, name: string, price: number) {
  return { serviceId, name, durationMin: 30, price }
}

function seed(): Appointment[] {
  const of = (dogId: string, start: Date, price: number, status: AppointmentStatus = 'programmato', name = 'Bagno', serviceId = 'bagno') =>
    visit(start, price, status, { dogId, services: [line(serviceId, name, price)] })
  return [
    of('rex', at(12, 9), 40, 'completato'),
    of('bea', at(12, 10), 35, 'completato'),
    of('ciro', at(12, 11), 45, 'completato'),
    of('ada', at(12, 14), 25, 'completato'),
    of('zeus', at(13, 9), 55, 'completato', 'Bagno + taglio', 'bagno_taglio'),
    of('micio', at(13, 11, 30), 25, 'completato'),
    of('iris', at(13, 12, 15), 30, 'completato'),
    of('luna', at(13, 15, 30), 30),
    of('otto', at(13, 17), 35, 'programmato', 'Taglio', 'taglio'),
    of('rex', at(14, 9), 30),
    of('bea', at(14, 10), 30),
    of('ciro', at(14, 11), 30),
    of('ada', at(14, 14), 35),
    of('zeus', at(14, 16), 35),
    of('micio', at(15, 9), 30),
    of('iris', at(15, 10), 30),
    of('luna', at(15, 14), 30),
    { ...cancelled(at(15, 11), 35, 'cliente'), dogId: 'fido' },
    of('otto', at(16, 9), 30),
    of('rex', at(16, 10), 30),
    of('bea', at(16, 11), 30),
    of('ciro', at(16, 14), 30),
  ]
}

describe('earnings base', () => {
  it('il total manuale vince sulla somma dei servizi', () => {
    expect(appointmentAmount(visit(NOW, 30))).toBe(30)
    expect(appointmentAmount(visit(NOW, 30, 'completato', { total: 45 }))).toBe(45)
    expect(appointmentAmount(visit(NOW, 30, 'completato', { total: 0 }))).toBe(0)
  })

  it('classifica secondo stato, motivo e giorno', () => {
    expect(classify(visit(new Date(2026, 9, 13, 9), 55, 'completato'), NOW)).toBe('incassato')
    expect(classify(visit(new Date(2026, 9, 13, 15, 30), 30), NOW)).toBe('previsto')
    expect(classify(visit(new Date(2026, 9, 13, 10), 30), NOW)).toBe('previsto')
    expect(classify(visit(new Date(2026, 9, 12, 10), 30), NOW)).toBe('da_chiudere')
    expect(classify(visit(new Date(2026, 9, 12, 10), 30, 'non_venuto'), NOW)).toBe('perso')
    expect(classify(cancelled(new Date(2026, 9, 15, 11), 35, 'cliente'), NOW)).toBe('perso')
    expect(classify(cancelled(new Date(2026, 9, 15, 11), 35, 'salone'), NOW)).toBe('escluso')
    expect(classify(cancelled(new Date(2026, 9, 15, 11), 35, 'deceduto'), NOW)).toBe('escluso')
    expect(classify(cancelled(new Date(2026, 9, 15, 11), 35), NOW)).toBe('escluso')
    expect(classify(visit(new Date(2026, 9, 13, 9), 0, 'completato', { kind: 'personale' }), NOW)).toBe('escluso')
  })

  it('periodRange: giorno, settimana da lunedì, mese; to escluso', () => {
    expect(periodRange('giorno', NOW)).toEqual({ from: new Date(2026, 9, 13), to: new Date(2026, 9, 14) })
    expect(periodRange('settimana', NOW)).toEqual({ from: new Date(2026, 9, 12), to: new Date(2026, 9, 19) })
    expect(periodRange('mese', NOW)).toEqual({ from: new Date(2026, 9, 1), to: new Date(2026, 10, 1) })
    expect(periodRange('settimana', new Date(2026, 8, 30))).toEqual({ from: new Date(2026, 8, 28), to: new Date(2026, 9, 5) })
  })

  it('periodPhase distingue passato, in corso e futuro', () => {
    expect(periodPhase(periodRange('settimana', NOW), NOW)).toBe('in_corso')
    expect(periodPhase(periodRange('settimana', new Date(2026, 9, 5)), NOW)).toBe('passato')
    expect(periodPhase(periodRange('giorno', new Date(2026, 9, 14)), NOW)).toBe('futuro')
  })

  it('shiftRef sposta di un giorno, una settimana, un mese', () => {
    expect(shiftRef('giorno', NOW, 1)).toEqual(new Date(2026, 9, 14))
    expect(shiftRef('settimana', NOW, -1)).toEqual(new Date(2026, 9, 6))
    expect(shiftRef('mese', NOW, 1)).toEqual(new Date(2026, 10, 13))
  })

  it('canGoNext si ferma oltre 4 settimane da oggi', () => {
    expect(canGoNext('settimana', new Date(2026, 10, 2), NOW)).toBe(true)
    expect(canGoNext('settimana', new Date(2026, 10, 9), NOW)).toBe(false)
    expect(canGoNext('mese', NOW, NOW)).toBe(true)
    expect(canGoNext('mese', new Date(2026, 10, 1), NOW)).toBe(false)
    expect(canGoNext('giorno', new Date(2026, 10, 9), NOW)).toBe(true)
    expect(canGoNext('giorno', new Date(2026, 10, 10), NOW)).toBe(false)
  })

  it('parsePeriod accetta i tre periodi e altrimenti dà settimana', () => {
    expect(parsePeriod('giorno')).toBe('giorno')
    expect(parsePeriod('mese')).toBe('mese')
    expect(parsePeriod('settimana')).toBe('settimana')
    expect(parsePeriod(null)).toBe('settimana')
    expect(parsePeriod('anno')).toBe('settimana')
  })

  it('niceScale sceglie un passo con al massimo 4 righe', () => {
    expect(niceScale(175)).toEqual({ step: 50, max: 200 })
    expect(niceScale(60)).toEqual({ step: 25, max: 75 })
    expect(niceScale(845)).toEqual({ step: 250, max: 1000 })
    expect(niceScale(100)).toEqual({ step: 25, max: 100 })
    expect(niceScale(0)).toEqual({ step: 25, max: 100 })
    expect(niceScale(30000)).toEqual({ step: 10000, max: 30000 })
  })

  it('maskEuro nasconde e plainAmount scrive il numero senza simbolo', () => {
    expect(maskEuro(110, false)).toBe('€ 110')
    expect(maskEuro(110, true)).toBe('•••')
    expect(plainAmount(145)).toBe('145')
    expect(plainAmount(37.5)).toBe('38')
  })
})

describe('earnings barre e confronto', () => {
  it('giorno: una barra per ora con appuntamenti, in ordine', () => {
    const list = buckets(seed(), DOGS, 'giorno', NOW, NOW)
    expect(list.map((b) => b.label)).toEqual(['9', '11', '12', '15', '17'])
    expect(list[0]).toMatchObject({ key: '2026-10-13T09', title: 'Ore 9 · Zeus', incassato: 55, previsto: 0, isToday: false })
    expect(list[3]).toMatchObject({ incassato: 0, previsto: 30 })
  })

  it('giorno: più cani nella stessa ora', () => {
    const items = [visit(at(13, 9), 20, 'completato', { dogId: 'zeus' }), visit(at(13, 9, 30), 20, 'completato', { dogId: 'luna' })]
    expect(buckets(items, DOGS, 'giorno', NOW, NOW)[0].title).toBe('Ore 9 · 2 appuntamenti')
  })

  it('settimana: Lun–Sab sempre, oggi evidenziato, previsto impilato', () => {
    const list = buckets(seed(), DOGS, 'settimana', NOW, NOW)
    expect(list.map((b) => b.label)).toEqual(['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'])
    expect(list.map((b) => b.sublabel)).toEqual(['12', '13', '14', '15', '16', '17'])
    expect(list[1]).toMatchObject({ key: '2026-10-13', title: 'Martedì 13 · oggi', incassato: 110, previsto: 65, isToday: true })
    expect(list[2]).toMatchObject({ title: 'Mercoledì 14', incassato: 0, previsto: 160 })
    expect(list[3]).toMatchObject({ previsto: 90 })
  })

  it('settimana: la domenica compare solo se ha appuntamenti', () => {
    const list = buckets([...seed(), visit(at(18, 10), 20)], DOGS, 'settimana', NOW, NOW)
    expect(list.map((b) => b.label)).toEqual(['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'])
  })

  it('mese: settimane tagliate ai confini del mese', () => {
    const list = buckets(seed(), DOGS, 'mese', NOW, NOW)
    expect(list.map((b) => b.label)).toEqual(['1–4', '5–11', '12–18', '19–25', '26–31'])
    expect(list.map((b) => b.sublabel)).toEqual(['sett. 1', 'sett. 2', 'sett. 3', 'sett. 4', 'sett. 5'])
    expect(list[2]).toMatchObject({ key: '2026-10-12_2026-10-18', title: '12 – 18 ottobre', incassato: 255, previsto: 435, isToday: true })
  })

  it('mese che inizia di domenica: il primo pezzo è un giorno solo', () => {
    const list = buckets([], DOGS, 'mese', new Date(2026, 10, 10), NOW)
    expect(list.map((b) => b.label)).toEqual(['1', '2–8', '9–15', '16–22', '23–29', '30'])
    expect(list[0].title).toBe('1 novembre')
  })

  it('periodTitle per giorno, settimana, settimana a cavallo e mese', () => {
    expect(periodTitle('giorno', NOW, NOW)).toBe('Oggi · mar 13 ottobre')
    expect(periodTitle('giorno', at(14, 0), NOW)).toBe('Mer 14 ottobre')
    expect(periodTitle('settimana', NOW, NOW)).toBe('12 – 18 ottobre')
    expect(periodTitle('settimana', new Date(2026, 8, 30), NOW)).toBe('28 set – 4 ott')
    expect(periodTitle('mese', NOW, NOW)).toBe('Ottobre 2026')
  })

  it('compare: a parità di avanzamento nel periodo in corso', () => {
    const items = [
      visit(at(5, 10), 100, 'completato'),
      visit(at(6, 9), 40, 'completato'),
      visit(at(6, 16), 100, 'completato'),
      visit(at(12, 10), 60, 'completato'),
      visit(at(13, 9), 60, 'completato'),
    ]
    expect(compare(items, 'giorno', NOW, NOW)).toEqual({ delta: 50, etichetta: 'vs mar scorso' })
    expect(compare(items, 'settimana', NOW, NOW)).toEqual({ delta: -14, etichetta: 'vs sett. scorsa' })
  })

  it('compare: periodo passato contro il precedente intero; precedente a zero = null', () => {
    const items = [
      visit(new Date(2026, 8, 29, 10), 70, 'completato'),
      visit(at(5, 10), 100, 'completato'),
      visit(at(6, 9), 40, 'completato'),
      visit(at(6, 16), 100, 'completato'),
    ]
    expect(compare(items, 'settimana', at(5, 0), NOW)).toEqual({ delta: 243, etichetta: 'vs sett. scorsa' })
    expect(compare(items, 'settimana', new Date(2026, 8, 29), NOW).delta).toBeNull()
    expect(compare(items, 'mese', NOW, NOW).etichetta).toBe('vs settembre')
    expect(compare(items, 'giorno', at(14, 0), NOW).delta).toBeNull()
  })

  it('compare: la domenica è «scorsa»', () => {
    expect(compare([], 'giorno', at(18, 0), NOW).etichetta).toBe('vs dom scorsa')
  })
})

function service(id: string, name: string, kind: 'principale' | 'extra', iconKey?: Service['iconKey']): Service {
  return { id, name, kind, iconKey, durationMin: { piccola: 30, media: 30, grande: 30 }, price: { piccola: 0, media: 0, grande: 0 }, order: 0, active: true, createdAt: NOW, updatedAt: NOW }
}

const SERVICES: Service[] = [
  service('bagno', 'Bagno', 'principale', 'bagno'),
  service('bagno_taglio', 'Bagno + taglio', 'principale', 'bagno_taglio'),
  service('taglio', 'Taglio', 'principale', 'taglio'),
  service('unghie', 'Unghie', 'extra'),
]

describe('earnings riepilogo', () => {
  it('giorno 13: i numeri del §11', () => {
    const s = summarize(seed(), DOGS, SERVICES, 'giorno', NOW, NOW)
    expect(s.titolo).toBe('Oggi · mar 13 ottobre')
    expect(s.phase).toBe('in_corso')
    expect(s.totali).toEqual({ incassato: 110, previsto: 65, persi: 0 })
    expect([s.completati, s.totaliAppuntamenti, s.mediaACane, s.mediaBarre]).toEqual([3, 5, 37, 37])
    expect(s.scala).toEqual({ step: 25, max: 75 })
    expect(s.selezione).toBe('2026-10-13T12')
    expect(s.elenco.titolo).toBe('Appuntamenti di oggi')
    expect(s.elenco.righe).toHaveLength(5)
    expect(s.elenco.righe[0]).toMatchObject({ kind: 'appuntamento', time: '09:00', dogName: 'Zeus', services: 'Bagno + taglio', state: 'completato', amount: 55, bucketKey: '2026-10-13T09' })
    expect(s.elenco.righe[4]).toMatchObject({ dogName: 'Otto', state: 'previsto', amount: 35 })
  })

  it('settimana 12–18: i numeri del §11', () => {
    const s = summarize(seed(), DOGS, SERVICES, 'settimana', NOW, NOW)
    expect(s.titolo).toBe('12 – 18 ottobre')
    expect(s.totali).toEqual({ incassato: 255, previsto: 435, persi: 35 })
    expect([s.completati, s.totaliAppuntamenti, s.mediaACane, s.mediaBarre]).toEqual([7, 21, 36, 128])
    expect(s.scala).toEqual({ step: 50, max: 200 })
    expect(s.selezione).toBe('2026-10-13')
    expect(s.elenco.titolo).toBe('Per giorno')
    expect(s.elenco.righe.map((r) => (r.kind === 'giorno' ? [r.title, r.detail, r.amount, r.muted] : null))).toEqual([
      ['Lunedì 12', '4 completati', 145, false],
      ['Martedì 13', '3 completati · 2 previsti', 110, false],
      ['Mercoledì 14', '5 previsti', 160, true],
      ['Giovedì 15', '3 previsti', 90, true],
      ['Venerdì 16', '4 previsti', 120, true],
    ])
    expect(s.persi).toEqual([expect.objectContaining({ dogName: 'Fido', when: 'gio 15 ott', reason: 'disdetto dal cliente', amount: 35 })])
  })

  it('mese: per servizio con ripartizione proporzionale ed Extra', () => {
    const extra = [
      visit(at(2, 10), 50, 'completato', { dogId: 'rex' }),
      visit(at(6, 10), 30, 'completato', { dogId: 'bea', total: 50, services: [line('bagno', 'Bagno', 30), line('unghie', 'Unghie', 10)] }),
      visit(at(20, 10), 40),
    ]
    const s = summarize([...seed(), ...extra], DOGS, SERVICES, 'mese', NOW, NOW)
    expect(s.titolo).toBe('Ottobre 2026')
    expect(s.totali).toEqual({ incassato: 355, previsto: 475, persi: 35 })
    expect(s.buckets.map((b) => b.incassato)).toEqual([50, 50, 255, 0, 0])
    expect(s.selezione).toBe('2026-10-12_2026-10-18')
    expect(s.elenco.titolo).toBe('Per servizio')
    expect(s.elenco.righe).toEqual([
      { kind: 'servizio', key: 'bagno', name: 'Bagno', iconKey: 'bagno', count: 8, amount: 287.5 },
      { kind: 'servizio', key: 'bagno_taglio', name: 'Bagno + taglio', iconKey: 'bagno_taglio', count: 1, amount: 55 },
      { kind: 'servizio', key: 'extra', name: 'Extra', iconKey: undefined, count: 1, amount: 12.5 },
    ])
  })

  it('un programmato di ieri va in daChiudere e non in previsto', () => {
    const s = summarize([visit(at(12, 10), 30)], DOGS, SERVICES, 'settimana', NOW, NOW)
    expect(s.daChiudere).toEqual({ count: 1, importo: 30 })
    expect(s.totali.previsto).toBe(0)
  })

  it('il disdetto dal salone non entra nei persi né nell’elenco', () => {
    const s = summarize([cancelled(at(13, 10), 35, 'salone')], DOGS, SERVICES, 'giorno', NOW, NOW)
    expect(s.totali.persi).toBe(0)
    expect(s.elenco.righe).toEqual([])
  })

  it('periodo vuoto: niente barre, media e selezione', () => {
    const s = summarize([], DOGS, SERVICES, 'giorno', NOW, NOW)
    expect(s.buckets).toEqual([])
    expect([s.mediaACane, s.mediaBarre, s.selezione]).toEqual([null, null, null])
    expect(s.scala).toEqual({ step: 25, max: 100 })
    expect(summarize([], DOGS, SERVICES, 'settimana', NOW, NOW).buckets).toEqual([])
    expect(summarize([cancelled(at(13, 10), 35, 'cliente')], DOGS, SERVICES, 'mese', NOW, NOW).buckets).toEqual([])
  })

  it('periodo passato: seleziona la barra con più incasso', () => {
    const s = summarize(seed(), DOGS, SERVICES, 'giorno', at(12, 0), NOW)
    expect(s.phase).toBe('passato')
    expect(s.selezione).toBe('2026-10-12T11')
  })

  it('earnedOn somma solo i completati di quel giorno', () => {
    expect(earnedOn(seed(), NOW, NOW)).toBe(110)
    expect(earnedOn(seed(), at(14, 0), NOW)).toBe(0)
  })

  it('divide i completati del giorno fra POS, contanti, non indicato e offerti', () => {
    const items = [
      visit(at(13, 9), 40, 'completato', { paymentMethod: 'pos' }),
      visit(at(13, 10), 25, 'completato', { paymentMethod: 'contanti' }),
      visit(at(13, 11), 15, 'completato'),
      visit(at(13, 12), 0, 'completato', { total: 0, paymentMethod: 'na' }),
      visit(at(13, 13), 80, 'programmato', { paymentMethod: 'pos' }),
    ]
    const s = summarize(items, DOGS, SERVICES, 'giorno', NOW, NOW)
    expect(s.pagamenti).toEqual({
      pos: { importo: 40, count: 1 },
      contanti: { importo: 25, count: 1 },
      nonIndicato: { importo: 15, count: 1 },
      offerti: 1,
    })
    expect(s.pagamenti.pos.importo + s.pagamenti.contanti.importo + s.pagamenti.nonIndicato.importo).toBe(s.totali.incassato)
  })
})

describe('report', () => {
  it('il mese coincide con summarize, N/A non è un mancato e il senza-metodo è Non indicato', () => {
    const now = new Date(2026, 9, 13, 15, 5)
    const items = [
      visit(new Date(2026, 9, 10, 9), 40, 'completato', { dogId: 'zeus', paymentMethod: 'pos', actualDurationMin: 60 }),
      visit(new Date(2026, 9, 11, 9), 25, 'completato', { dogId: 'luna', paymentMethod: 'contanti', actualDurationMin: 30 }),
      visit(new Date(2026, 9, 12, 9), 0, 'completato', { dogId: 'otto', total: 0, paymentMethod: 'na', actualDurationMin: 30 }),
      visit(new Date(2026, 9, 12, 11), 80, 'completato', { dogId: 'zeus', services: [{ serviceId: 'taglio', name: 'Taglio', durationMin: 30, price: 80 }] }),
      visit(new Date(2026, 9, 13, 16), 10, 'programmato', { paymentMethod: 'pos' }),
      visit(new Date(2026, 9, 9, 9), 35, 'disdetto', { cancelReason: 'cliente', dogId: 'fido' }),
      visit(new Date(2026, 9, 8, 9), 99, 'disdetto', { cancelReason: 'salone' }),
    ]
    const page = summarize(items, DOGS, SERVICES, 'mese', now, now)
    const report = reportOf(items, DOGS, SERVICES, 'mese', now)
    expect(report.incassato).toBe(page.totali.incassato)
    expect(report.incassato).toBe(145)
    expect(report.pagamenti).toEqual(page.pagamenti)
    expect(report.pagamenti.offerti).toBe(1)
    expect(report.pagamenti.nonIndicato).toEqual({ importo: 80, count: 1 })
    expect(report.completati).toBe(4)
    expect(report.inAgenda).toBe(1)
    expect(report.persi).toBe(35)
    expect(report.minuti).toBe(150)
    expect(report.euroAllOra).toBe(58)
    expect(report.giorni).toBe(3)
    expect(report.top[0]).toMatchObject({ dogId: 'zeus', amount: 120 })
    expect(report.mancati).toHaveLength(1)
    expect(report.daChiudere.count).toBe(0)
    expect(report.servizi.map((item) => item.name)).toEqual(['Taglio', 'Bagno'])
  })

  it('i limiti e il titolo seguono il chip', () => {
    const now = new Date(2026, 9, 13, 15, 5)
    expect(reportBounds('mese', now)).toEqual({ from: new Date(2026, 9, 1), to: new Date(2026, 10, 1) })
    expect(reportBounds('mese_scorso', now).from).toEqual(new Date(2026, 8, 1))
    expect(reportBounds('tre_mesi', now)).toEqual({ from: new Date(2026, 7, 1), to: new Date(2026, 10, 1) })
    expect(reportBounds('anno', now)).toEqual({ from: new Date(2026, 0, 1), to: new Date(2027, 0, 1) })
    expect(reportBounds('scelto', now, new Date(2026, 5, 18)).from).toEqual(new Date(2026, 5, 1))
    expect(reportTitle('mese', reportBounds('mese', now), now)).toBe('Ottobre 2026 · fino a oggi')
    expect(reportTitle('mese_scorso', reportBounds('mese_scorso', now), now)).toBe('Settembre 2026')
    expect(reportTitle('anno', reportBounds('anno', now), now)).toBe('Anno 2026 · fino a oggi')
    expect(reportTitle('tre_mesi', reportBounds('tre_mesi', now), now)).toBe('ago – ott 2026')
    expect(reportTitle('mese', reportBounds('mese', now), now, 'en')).toBe('October 2026 · to date')
    expect(reportTitle('mese', reportBounds('mese', now), now, 'es')).toBe('Octubre 2026 · hasta hoy')
    expect(reportOf([], [], [], 'mese', now, undefined, 'en').confronto.etichetta).toBe('vs September')
    expect(reportOf([], [], [], 'mese', now, undefined, 'es').confronto.etichetta).toBe('vs septiembre')
  })

  it('la linea cumulativa si ferma a oggi e il mese prima non inventa il 31', () => {
    const now = new Date(2026, 9, 13, 15, 5)
    const items = [
      visit(new Date(2026, 9, 10, 9), 40, 'completato'),
      visit(new Date(2026, 9, 12, 9), 10, 'completato'),
      visit(new Date(2026, 8, 10, 9), 5, 'completato'),
    ]
    const points = cumulativeMonth(items, now, now)
    expect(points).toHaveLength(31)
    expect(points[9]).toMatchObject({ day: 10, current: 40, previous: 5 })
    expect(points[11]).toMatchObject({ day: 12, current: 50 })
    expect(points[13].current).toBeNull()
    const march = cumulativeMonth(items, new Date(2026, 2, 1), new Date(2026, 2, 20))
    expect(march[30].previous).toBeNull()
  })

  it('le barre del trimestre tengono i mesi a zero', () => {
    const now = new Date(2026, 9, 13, 15, 5)
    const bars = monthBars([visit(new Date(2026, 9, 10, 9), 40, 'completato')], new Date(2026, 7, 1), new Date(2026, 10, 1), now)
    expect(bars.map((item) => item.label)).toEqual(['Ago', 'Set', 'Ott'])
    expect(bars[2].incassato).toBe(40)
    expect(bars[2].isToday).toBe(true)
    expect(monthBars([], new Date(2026, 7, 1), new Date(2026, 10, 1), now)).toEqual([])
  })

  it('il badge dura 14 giorni, giorno di partenza compreso', () => {
    const now = new Date(2026, 9, 17, 9)
    expect(reportBadgeVisible('2026-10-17', now)).toBe(true)
    expect(reportBadgeVisible('2026-10-04', now)).toBe(true)
    expect(reportBadgeVisible('2026-10-03', now)).toBe(false)
    expect(reportBadgeVisible('2026-10-18', now)).toBe(false)
    expect(reportBadgeVisible('no', now)).toBe(false)
    expect(reportBadgeVisible(undefined, now)).toBe(false)
  })

  it('tre mesi e anno confrontano la stessa durata subito prima', () => {
    const now = new Date(2026, 9, 13, 15, 5)
    const three = reportBounds('tre_mesi', now)
    const year = reportBounds('anno', now)
    expect(three).toEqual({ from: new Date(2026, 7, 1), to: new Date(2026, 10, 1) })
    expect(year).toEqual({ from: new Date(2026, 0, 1), to: new Date(2027, 0, 1) })
    const threeLength = three.to.getTime() - three.from.getTime()
    const yearLength = year.to.getTime() - year.from.getTime()
    const threePrev = new Date(three.from.getTime() - threeLength)
    const yearPrev = new Date(year.from.getTime() - yearLength)
    const threeCutoff = new Date(threePrev.getTime() + (now.getTime() - three.from.getTime()))
    const yearCutoff = new Date(yearPrev.getTime() + (now.getTime() - year.from.getTime()))
    expect(three.from.getTime() - threePrev.getTime()).toBe(threeLength)
    expect(year.from.getTime() - yearPrev.getTime()).toBe(yearLength)
    expect(threePrev).toEqual(new Date(2026, 3, 30, 23, 0, 0))
    expect(threeCutoff).toEqual(new Date(2026, 6, 13, 14, 5))
    expect(yearPrev).toEqual(new Date(2025, 0, 1))
    expect(yearCutoff).toEqual(new Date(2025, 9, 13, 15, 5))
    const currentThree = visit(new Date(2026, 7, 2, 9), 80, 'completato')
    const currentYear = visit(new Date(2026, 9, 2, 9), 80, 'completato')
    expect(spanDelta([visit(threePrev, 40, 'completato'), currentThree], three.from, three.to, now)).toBe(100)
    expect(spanDelta([visit(new Date(threePrev.getTime() - 1), 40, 'completato'), currentThree], three.from, three.to, now)).toBeNull()
    expect(spanDelta([visit(new Date(threeCutoff.getTime() - 1), 40, 'completato'), currentThree], three.from, three.to, now)).toBe(100)
    expect(spanDelta([visit(threeCutoff, 40, 'completato'), currentThree], three.from, three.to, now)).toBeNull()
    expect(spanDelta([visit(yearPrev, 40, 'completato'), currentYear], year.from, year.to, now)).toBe(100)
    expect(spanDelta([visit(new Date(yearPrev.getTime() - 1), 40, 'completato'), currentYear], year.from, year.to, now)).toBeNull()
    expect(spanDelta([visit(new Date(yearCutoff.getTime() - 1), 40, 'completato'), currentYear], year.from, year.to, now)).toBe(100)
    expect(spanDelta([visit(yearCutoff, 40, 'completato'), currentYear], year.from, year.to, now)).toBeNull()
    const threeReport = reportOf([visit(threePrev, 40, 'completato'), currentThree], DOGS, SERVICES, 'tre_mesi', now)
    const yearReport = reportOf([visit(yearPrev, 40, 'completato'), currentYear], DOGS, SERVICES, 'anno', now)
    expect(threeReport.confronto).toEqual({ delta: 100, etichetta: 'vs i 3 mesi prima' })
    expect(threeReport.mediaDelta).toBe(40)
    expect(yearReport.confronto).toEqual({ delta: 100, etichetta: 'vs anno scorso' })
    expect(yearReport.mediaDelta).toBe(40)
    const missed = reportOf([visit(new Date(threePrev.getTime() - 1), 40, 'completato'), currentThree], DOGS, SERVICES, 'tre_mesi', now)
    expect(missed.confronto.delta).toBeNull()
    expect(missed.mediaDelta).toBeNull()
  })

  it('con zero minuti il guadagno all’ora è nullo', () => {
    const now = new Date(2026, 9, 13, 15, 5)
    const report = reportOf([
      visit(new Date(2026, 9, 10, 9), 40, 'completato', { actualDurationMin: 0 }),
    ], DOGS, SERVICES, 'mese', now)
    expect(report.incassato).toBe(40)
    expect(report.minuti).toBe(0)
    expect(report.euroAllOra).toBeNull()
  })

  it('serviceBreakdown raggruppa gli extra e non cambia le righe del mese', () => {
    const done = [visit(new Date(2026, 9, 10, 9), 30, 'completato', { services: [
      { serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 },
      { serviceId: 'nodo', name: 'Nodo', durationMin: 10, price: 10 },
    ] })]
    const shares = serviceBreakdown(done, [...SERVICES, { id: 'nodo', name: 'Nodo', kind: 'extra' } as Service])
    expect(shares.find((item) => item.key === 'extra')).toMatchObject({ name: 'Extra', amount: 10 })
    expect(shares.find((item) => item.key === 'bagno')?.amount).toBe(20)
  })
})
