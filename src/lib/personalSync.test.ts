import { describe, expect, it } from 'vitest'
import type { Appointment } from '../types/models'
import { appointmentMatchedByDeletedDog, appointmentRemovedWithDog, mergePersonalAppointments } from './personalSync'

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

describe('un cane eliminato non sceglie un personale', () => {
  it('non abbina un personale al cane, e abbina una visita con quel dogId', () => {
    expect(appointmentMatchedByDeletedDog({ kind: 'personale', dogId: 'dog-1' }, ['dog-1'])).toBe(false)
    expect(appointmentMatchedByDeletedDog({ dogId: 'dog-1' }, ['dog-1'])).toBe(true)
    expect(appointmentMatchedByDeletedDog({ dogId: 'dog-2' }, ['dog-1'])).toBe(false)
    expect(appointmentMatchedByDeletedDog({ dogId: '' }, [''])).toBe(false)
  })

  it('removeDog non cancella un personale anche se l’id è già nella pietra', () => {
    expect(appointmentRemovedWithDog('p1', { kind: 'personale', dogId: 'dog-1' }, 'dog-1', ['p1'])).toBe(false)
    expect(appointmentRemovedWithDog('v1', { dogId: 'dog-1' }, 'dog-1', [])).toBe(true)
    expect(appointmentRemovedWithDog('v2', { dogId: 'dog-2' }, 'dog-1', ['v2'])).toBe(true)
    expect(appointmentRemovedWithDog('v3', { dogId: 'dog-2' }, 'dog-1', [])).toBe(false)
  })
})
