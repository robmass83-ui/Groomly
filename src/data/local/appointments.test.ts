// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logout } from './auth'
import { createDog, updateDog } from './dogs'
import { ensureServiceSeed, updateService } from './services'
import { AppError } from '../errors'
import { createAppointment, completeAppointment, deleteAppointment, listAppointments, updateAppointment } from './appointments'
import { storageKeys } from './storage'
import type { AppointmentWrite, DogWrite } from '../../types/models'

function dog(name: string): DogWrite {
  return {
    name,
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: '', phone: '333' },
  }
}

function write(partial: Partial<AppointmentWrite> = {}): AppointmentWrite {
  return {
    dogId: 'dog-1',
    start: new Date(2026, 9, 3, 9, 0, 0, 0),
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    ...partial,
  }
}

describe('appointments', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('salva le righe copiate e non le ricalcola se cambiano listino o taglia', () => {
    const created = createAppointment('uid-1', write())
    const raw = localStorage.getItem(storageKeys.appointments('uid-1'))
    const stored = JSON.parse(raw!)[created.id]
    expect(stored.services[0]).toEqual({ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 })
    expect(typeof stored.start).toBe('string')
    expect(stored.status).toBe('programmato')
    expect(stored.end).toBeUndefined()
    const listed = listAppointments('uid-1')
    expect(listed[0].start).toBeInstanceOf(Date)
    expect(listed[0].start).toEqual(created.start)
    expect(listed[0].status).toBe('programmato')
    const seeded = ensureServiceSeed('uid-1')
    const bagno = seeded.find((service) => service.id === 'bagno')!
    updateService('uid-1', bagno.id, { durationMin: { piccola: 99, media: 99, grande: 99 }, price: { piccola: 1, media: 1, grande: 1 } })
    const rex = createDog('uid-1', dog('Rex'))
    updateDog('uid-1', rex.id, { ...dog('Rex'), size: 'grande' })
    expect(listAppointments('uid-1')[0].services[0].durationMin).toBe(30)
    expect(listAppointments('uid-1')[0].services[0].price).toBe(20)
    logout()
    expect(localStorage.getItem(storageKeys.session)).toBeNull()
    expect(localStorage.getItem(storageKeys.appointments('uid-1'))).toContain('Bagno')
  })

  it('ordina per inizio e poi per id', () => {
    const later = createAppointment('uid-1', write({ start: new Date(2026, 9, 3, 11, 0, 0, 0) }))
    const earlier = createAppointment('uid-1', write({ start: new Date(2026, 9, 3, 9, 0, 0, 0) }))
    expect(listAppointments('uid-1').map((item) => item.id)).toEqual([earlier.id, later.id])
  })

  it('un id assente non scrive e la cancellazione toglie solo una voce', () => {
    const created = createAppointment('uid-1', write())
    const other = createAppointment('uid-1', write({ start: new Date(2026, 9, 4, 9, 0, 0, 0) }))
    const before = localStorage.getItem(storageKeys.appointments('uid-1'))
    expect(() => updateAppointment('uid-1', 'manca', write())).toThrowError(expect.objectContaining({ code: 'appointment_missing' }))
    expect(() => deleteAppointment('uid-1', 'manca')).toThrowError(expect.objectContaining({ code: 'appointment_missing' }))
    expect(localStorage.getItem(storageKeys.appointments('uid-1'))).toBe(before)
    deleteAppointment('uid-1', created.id)
    expect(listAppointments('uid-1').map((item) => item.id)).toEqual([other.id])
  })

  it('se setItem lancia resta l’appuntamento precedente', () => {
    const created = createAppointment('uid-1', write())
    const before = localStorage.getItem(storageKeys.appointments('uid-1'))
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => updateAppointment('uid-1', created.id, write({ services: [{ serviceId: 'bagno', name: 'Altro', durationMin: 10, price: 1 }] }))).toThrowError(expect.objectContaining({ code: 'storage_write' }))
    vi.restoreAllMocks()
    expect(localStorage.getItem(storageKeys.appointments('uid-1'))).toBe(before)
    expect(listAppointments('uid-1')[0].services[0].name).toBe('Bagno')
  })

  it('legge uno stato assente o sconosciuto come programmato e non riscrive', () => {
    const start = new Date(2026, 9, 17, 9, 0, 0, 0).toISOString()
    const line = { serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 99 }
    localStorage.setItem(storageKeys.appointments('uid-1'), JSON.stringify({
      a: { id: 'a', dogId: 'dog-1', start, services: [line], createdAt: start, updatedAt: start },
      b: { id: 'b', dogId: 'dog-1', start, services: [line], createdAt: start, updatedAt: start, status: 'chiuso' },
    }))
    const before = localStorage.getItem(storageKeys.appointments('uid-1'))
    const listed = listAppointments('uid-1')
    expect(listed.find((item) => item.id === 'a')?.status).toBe('programmato')
    expect(listed.find((item) => item.id === 'b')?.status).toBe('programmato')
    expect(localStorage.getItem(storageKeys.appointments('uid-1'))).toBe(before)
  })

  it('completato tiene righe e inizio, e la modifica non riapre', () => {
    const created = createAppointment('uid-1', write({
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 99 }],
    }))
    const done = completeAppointment('uid-1', created.id)
    expect(done.status).toBe('completato')
    expect(done.start).toEqual(created.start)
    expect(done.services).toEqual(created.services)
    expect(done.createdAt).toEqual(created.createdAt)
    const nextStart = new Date(2026, 9, 3, 11, 0, 0, 0)
    const updated = updateAppointment('uid-1', created.id, write({ start: nextStart, services: created.services }))
    expect(updated.status).toBe('completato')
    expect(updated.start).toEqual(nextStart)
    expect(updated.services[0].price).toBe(99)
    expect(JSON.parse(localStorage.getItem(storageKeys.appointments('uid-1'))!)[created.id].status).toBe('completato')
  })

  it('completare un id assente fallisce come le altre scritture assenti', () => {
    expect(() => completeAppointment('uid-1', 'assente')).toThrow(AppError)
    try {
      completeAppointment('uid-1', 'assente')
    } catch (caught) {
      expect(caught).toBeInstanceOf(AppError)
      expect((caught as AppError).code).toBe('appointment_missing')
    }
  })
})
