import { describe, expect, it } from 'vitest'
import type { Appointment } from '../types/models'
import { mergePersonalAppointments } from './personalSync'

function personal(id: string, updatedAt: Date, start = new Date(2026, 9, 21, 18, 0)): Appointment {
  return {
    id,
    kind: 'personale',
    title: id,
    dogId: '',
    start,
    services: [],
    status: 'programmato',
    createdAt: new Date(2026, 9, 1),
    updatedAt,
  }
}

function visit(id: string): Appointment {
  return {
    id,
    dogId: 'dog-1',
    start: new Date(2026, 9, 21, 9, 0),
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    status: 'programmato',
    createdAt: new Date(2026, 9, 1),
    updatedAt: new Date(2026, 9, 1),
  }
}

describe('mergePersonalAppointments', () => {
  const older = new Date(2026, 9, 1, 8, 0)
  const newer = new Date(2026, 9, 2, 8, 0)

  it('tiene un personale assente dallo snapshot e ignora le visite', () => {
    const monday = personal('p-lun', older, new Date(2026, 9, 20, 18, 0))
    const tuesday = personal('p-mar', older, new Date(2026, 9, 21, 18, 0))
    const merged = mergePersonalAppointments([monday, tuesday, visit('v1')], [monday, visit('v2')], [])
    expect(merged.map((item) => item.id)).toEqual(['p-lun', 'p-mar'])
  })

  it('toglie un id cancellato anche se lo snapshot lo contiene ancora', () => {
    const monday = personal('p-lun', older, new Date(2026, 9, 20, 18, 0))
    const tuesday = personal('p-mar', older, new Date(2026, 9, 21, 18, 0))
    const merged = mergePersonalAppointments([monday, tuesday], [monday, tuesday], ['p-lun'])
    expect(merged.map((item) => item.id)).toEqual(['p-mar'])
  })

  it('con lo stesso id tiene updatedAt più nuovo e, a parità, incoming', () => {
    const local = personal('p1', newer)
    const stale = personal('p1', older)
    stale.title = 'Vecchio'
    local.title = 'Nuovo'
    expect(mergePersonalAppointments([local], [stale], [])[0]?.title).toBe('Nuovo')

    const sameTime = personal('p1', older)
    sameTime.title = 'Cloud'
    const previous = personal('p1', older)
    previous.title = 'Telefono'
    expect(mergePersonalAppointments([previous], [sameTime], [])[0]?.title).toBe('Cloud')
  })

  it('ignora un id vuoto', () => {
    const blank = personal('', older)
    expect(mergePersonalAppointments([blank], [blank], [])).toEqual([])
  })
})
