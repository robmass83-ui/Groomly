import { describe, expect, it } from 'vitest'
import type { Appointment, AppointmentStatus, Dog } from '../types/models'
import { backupStatusLabel } from './backupDoc'
import { monthBars, periodTitle, reportOf, summarize } from './earnings'
import { statoDrive } from './statoDrive'

// Martedì 3 novembre 2026, nel pomeriggio.
const NOW = new Date(2026, 10, 3, 15, 0)

let seq = 0
function visit(start: Date, price: number, status: AppointmentStatus = 'completato'): Appointment {
  seq += 1
  return {
    id: `a${seq}`,
    dogId: 'd1',
    start,
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price }],
    status,
    createdAt: start,
    updatedAt: start,
  }
}

const DOGS = [{ id: 'd1', name: 'Fido' } as Dog]
const VISITE = [
  visit(new Date(2026, 10, 2, 10), 40),
  visit(new Date(2026, 10, 3, 9), 30),
  visit(new Date(2026, 10, 3, 9, 30), 20),
  visit(new Date(2026, 10, 4, 11), 50, 'programmato'),
  visit(new Date(2026, 9, 20, 10), 35, 'non_venuto'),
]

describe('incassi nella lingua dell’app', () => {
  it('in italiano il testo resta quello di sempre', () => {
    expect(periodTitle('giorno', NOW, NOW, 'it')).toBe('Oggi · mar 3 novembre')
    expect(periodTitle('mese', NOW, NOW, 'it')).toBe('Novembre 2026')
    const settimana = summarize(VISITE, DOGS, [], 'settimana', NOW, NOW, 'it')
    expect(settimana.buckets[0]).toMatchObject({ label: 'Lun', title: 'Lunedì 2' })
    expect(settimana.buckets[1].title).toBe('Martedì 3 · oggi')
    expect(settimana.elenco.titolo).toBe('Per giorno')
    expect(settimana.elenco.righe[1]).toMatchObject({ title: 'Martedì 3', detail: '2 completati' })
    const giorno = summarize(VISITE, DOGS, [], 'giorno', NOW, NOW, 'it')
    expect(giorno.elenco.titolo).toBe('Appuntamenti di oggi')
    expect(giorno.buckets[0].title).toBe('Ore 9 · 2 appuntamenti')
    expect(summarize(VISITE, DOGS, [], 'mese', NOW, NOW, 'it').buckets[0].sublabel).toBe('sett. 1')
  })

  it('in inglese giorni, mesi ed elenchi sono in inglese', () => {
    expect(periodTitle('giorno', NOW, NOW, 'en')).toBe('Today · Tue 3 November')
    expect(periodTitle('settimana', NOW, NOW, 'en')).toBe('2 – 8 November')
    const settimana = summarize(VISITE, DOGS, [], 'settimana', NOW, NOW, 'en')
    expect(settimana.buckets[0]).toMatchObject({ label: 'Mon', title: 'Monday 2' })
    expect(settimana.buckets[1].title).toBe('Tuesday 3 · today')
    expect(settimana.elenco.titolo).toBe('By day')
    expect(settimana.elenco.righe[1]).toMatchObject({ title: 'Tuesday 3', detail: '2 completed' })
    const giorno = summarize(VISITE, DOGS, [], 'giorno', NOW, NOW, 'en')
    expect(giorno.elenco.titolo).toBe('Today’s appointments')
    expect(giorno.buckets[0].title).toBe('9:00 · 2 appointments')
    expect(summarize(VISITE, DOGS, [], 'mese', NOW, NOW, 'en').buckets[0].sublabel).toBe('wk 1')
    expect(reportOf(VISITE, DOGS, [], 'mese_scorso', NOW, undefined, 'en').mancati[0].when).toBe('Tue 20 Oct')
    expect(monthBars(VISITE, new Date(2026, 9, 1), new Date(2026, 11, 1), NOW, 'en').map((bar) => bar.title)).toEqual(['October 2026', 'November 2026'])
  })

  it('in spagnolo giorni e mesi sono in spagnolo', () => {
    const settimana = summarize(VISITE, DOGS, [], 'settimana', NOW, NOW, 'es')
    expect(settimana.buckets[0].title).toBe('Lunes 2')
    expect(settimana.elenco.titolo).toBe('Por día')
    expect(periodTitle('settimana', NOW, NOW, 'es')).toBe('2 – 8 noviembre')
    expect(periodTitle('mese', NOW, NOW, 'es')).toBe('Noviembre 2026')
  })

  it('lo stato del backup segue la lingua', () => {
    const ieri = new Date(2026, 10, 2, 22, 0).toISOString()
    expect(backupStatusLabel(ieri, NOW, 'it')).toBe('2 nov 2026')
    expect(backupStatusLabel(ieri, NOW, 'en')).toBe('2 Nov 2026')
    expect(backupStatusLabel(undefined, NOW, 'en')).toBe('Never run')
    expect(statoDrive({ ultimo: ieri, errore: true, now: NOW, lingua: 'es' })?.testo).toBe('Error')
  })
})
