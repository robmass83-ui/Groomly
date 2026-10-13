import { describe, expect, it } from 'vitest'
import type { Appointment, AppointmentStatus, CancelReason } from '../types/models'
import { appointmentAmount, canGoNext, classify, maskEuro, niceScale, parsePeriod, periodPhase, periodRange, plainAmount, shiftRef } from './earnings'

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
