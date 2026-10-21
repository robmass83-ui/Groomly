// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logout } from './auth'
import { createDog, updateDog } from './dogs'
import { ensureServiceSeed, updateService } from './services'
import { AppError } from '../errors'
import { createAppointment, completeAppointment, deleteAppointment, listAppointments, photosPatch, saveClose, setAppointmentStatus, updateAppointment } from './appointments'
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

  it('legge un personale senza cane, servizi e stato e scarta un titolo vuoto', () => {
    const start = new Date(2026, 9, 21, 18, 0, 0, 0).toISOString()
    const plannedEnd = new Date(2026, 9, 21, 19, 0, 0, 0).toISOString()
    const created = new Date(2026, 9, 1, 0, 0, 0, 0).toISOString()
    localStorage.setItem(storageKeys.appointments('uid-1'), JSON.stringify({
      p1: { id: 'p1', kind: 'personale', title: 'Dentista', start, plannedEnd, createdAt: created, updatedAt: created },
      bad: { id: 'bad', kind: 'personale', title: '  ', start, createdAt: created, updatedAt: created },
    }))
    const listed = listAppointments('uid-1')
    expect(listed.map((item) => item.id)).toEqual(['p1'])
    expect(listed[0]).toMatchObject({ kind: 'personale', title: 'Dentista', dogId: '', services: [] })
    expect(listed[0].plannedEnd?.getHours()).toBe(19)
    expect(listed[0].status).toBe('programmato')
    const stored = JSON.parse(localStorage.getItem(storageKeys.appointments('uid-1'))!) as Record<string, Record<string, unknown>>
    expect(stored.p1.dogId).toBeUndefined()
    expect(stored.p1.status).toBeUndefined()
    expect(stored.p1.services).toBeUndefined()
    expect(stored.bad.title).toBe('  ')
  })

  it('riscrivere un personale non gli aggiunge cane, servizi o stato', () => {
    const start = new Date(2026, 9, 21, 18, 0, 0, 0).toISOString()
    const plannedEnd = new Date(2026, 9, 21, 19, 0, 0, 0).toISOString()
    const created = new Date(2026, 9, 1, 0, 0, 0, 0).toISOString()
    localStorage.setItem(storageKeys.appointments('uid-1'), JSON.stringify({
      p1: { id: 'p1', kind: 'personale', title: 'Dentista', start, plannedEnd, createdAt: created, updatedAt: created },
    }))
    setAppointmentStatus('uid-1', 'p1', 'programmato')
    const stored = JSON.parse(localStorage.getItem(storageKeys.appointments('uid-1'))!) as Record<string, Record<string, unknown>>
    expect(stored.p1.kind).toBe('personale')
    expect(stored.p1.title).toBe('Dentista')
    expect(stored.p1.plannedEnd).toBe(plannedEnd)
    expect(stored.p1.dogId).toBeUndefined()
    expect(stored.p1.services).toBeUndefined()
    expect(stored.p1.status).toBeUndefined()
  })

  it('legge uno stato assente come programmato senza riscriverlo, e uno sconosciuto lo corregge', () => {
    const start = new Date(2026, 9, 17, 9, 0, 0, 0).toISOString()
    const line = { serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 99 }
    localStorage.setItem(storageKeys.appointments('uid-1'), JSON.stringify({
      a: { id: 'a', dogId: 'dog-1', start, services: [line], createdAt: start, updatedAt: start },
      b: { id: 'b', dogId: 'dog-1', start, services: [line], createdAt: start, updatedAt: start, status: 'chiuso' },
    }))
    const listed = listAppointments('uid-1')
    expect(listed.find((item) => item.id === 'a')?.status).toBe('programmato')
    expect(listed.find((item) => item.id === 'b')?.status).toBe('programmato')
    const stored = JSON.parse(localStorage.getItem(storageKeys.appointments('uid-1'))!)
    expect(stored.a.status).toBeUndefined()
    expect(stored.b.status).toBe('programmato')
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

  it('legge total se c’è e non riscrive la scheda che non lo ha', () => {
    const start = new Date(2026, 9, 17, 9, 0, 0, 0).toISOString()
    const line = { serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 99 }
    localStorage.setItem(storageKeys.appointments('uid-1'), JSON.stringify({
      a: { id: 'a', dogId: 'dog-1', start, services: [line], createdAt: start, updatedAt: start, status: 'completato' },
      b: { id: 'b', dogId: 'dog-1', start, services: [line], createdAt: start, updatedAt: start, status: 'completato', total: 40 },
    }))
    const before = localStorage.getItem(storageKeys.appointments('uid-1'))
    const listed = listAppointments('uid-1')
    expect(listed.find((item) => item.id === 'a')?.total).toBeUndefined()
    expect(listed.find((item) => item.id === 'b')?.total).toBe(40)
    expect(localStorage.getItem(storageKeys.appointments('uid-1'))).toBe(before)
  })

  it('senza i campi nuovi legge liste vuote e non riscrive il json', () => {
    const start = new Date(2026, 9, 3, 9, 0, 0, 0).toISOString()
    const end = new Date(2026, 9, 3, 10, 10, 0, 0).toISOString()
    const line = { serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }
    localStorage.setItem(storageKeys.appointments('uid-1'), JSON.stringify({
      a: { id: 'a', dogId: 'dog-1', start, services: [line], createdAt: start, updatedAt: start },
      b: {
        id: 'b',
        dogId: 'dog-1',
        start,
        services: [line],
        createdAt: start,
        updatedAt: start,
        end,
        total: 40,
        tools: ['spazzola'],
        products: ['shampoo'],
        cutStyle: 'orso',
        actualDurationMin: 70,
        photos: [{ id: 'p', photo: 'data', kind: 'prima' }],
        seriesId: 'serie-1',
      },
    }))
    const before = localStorage.getItem(storageKeys.appointments('uid-1'))
    const listed = listAppointments('uid-1')
    const plain = listed.find((item) => item.id === 'a')!
    expect(plain.tools).toEqual([])
    expect(plain.products).toEqual([])
    expect(plain.photos).toEqual([])
    expect(plain.end).toBeUndefined()
    expect(plain.total).toBeUndefined()
    expect(plain.cutStyle).toBeUndefined()
    expect(plain.actualDurationMin).toBeUndefined()
    expect(plain.seriesId).toBeUndefined()
    const full = listed.find((item) => item.id === 'b')!
    expect(full.end).toEqual(new Date(end))
    expect(full.total).toBe(40)
    expect(full.tools).toEqual(['spazzola'])
    expect(full.products).toEqual(['shampoo'])
    expect(full.cutStyle).toBe('orso')
    expect(full.actualDurationMin).toBe(70)
    expect(full.photos).toEqual([{ id: 'p', photo: 'data', kind: 'prima' }])
    expect(full.seriesId).toBe('serie-1')
    expect(localStorage.getItem(storageKeys.appointments('uid-1'))).toBe(before)
  })

  it('createAppointment accetta seriesId opzionale', () => {
    const created = createAppointment('uid-1', write({ seriesId: 'serie-1' }))
    expect(created.seriesId).toBe('serie-1')
    const stored = JSON.parse(localStorage.getItem(storageKeys.appointments('uid-1'))!)[created.id]
    expect(stored.seriesId).toBe('serie-1')
    expect(stored.tools).toBeUndefined()
    expect(listAppointments('uid-1').find((item) => item.id === created.id)?.seriesId).toBe('serie-1')
    const updated = updateAppointment('uid-1', created.id, write({ start: new Date(2026, 9, 3, 11, 0, 0, 0) }))
    expect(updated.seriesId).toBe('serie-1')
    expect(JSON.parse(localStorage.getItem(storageKeys.appointments('uid-1'))!)[created.id].seriesId).toBe('serie-1')
    const plain = createAppointment('uid-1', write())
    expect(plain.seriesId).toBeUndefined()
    expect(JSON.parse(localStorage.getItem(storageKeys.appointments('uid-1'))!)[plain.id].seriesId).toBeUndefined()
  })

  it('cycleAnchor e coveredDue fanno il giro e un update senza i campi li toglie', () => {
    const covered = new Date(2026, 0, 29, 9, 30, 0, 0)
    const created = createAppointment('uid-1', write({
      cycleAnchor: 'ritmo',
      coveredDue: covered,
    }))
    expect(created.cycleAnchor).toBe('ritmo')
    expect(created.coveredDue).toEqual(covered)
    const stored = JSON.parse(localStorage.getItem(storageKeys.appointments('uid-1'))!)[created.id]
    expect(stored.cycleAnchor).toBe('ritmo')
    expect(stored.coveredDue).toBe(covered.toISOString())
    expect(listAppointments('uid-1').find((item) => item.id === created.id)?.coveredDue).toEqual(covered)

    localStorage.setItem(storageKeys.appointments('uid-1'), JSON.stringify({
      [created.id]: { ...stored, cycleAnchor: 'boh', coveredDue: 'nope' },
    }))
    const broken = listAppointments('uid-1').find((item) => item.id === created.id)
    expect(broken?.cycleAnchor).toBeUndefined()
    expect(broken?.coveredDue).toBeUndefined()

    const again = createAppointment('uid-1', write({ cycleAnchor: 'visita', coveredDue: covered }))
    const cleared = updateAppointment('uid-1', again.id, write())
    expect(cleared.cycleAnchor).toBeUndefined()
    expect(cleared.coveredDue).toBeUndefined()
    const raw = JSON.parse(localStorage.getItem(storageKeys.appointments('uid-1'))!)[again.id]
    expect(raw.cycleAnchor).toBeUndefined()
    expect(raw.coveredDue).toBeUndefined()
  })

  it('legge i quattro stati e corregge uno sconosciuto in programmato', () => {
    const start = new Date(2026, 9, 17, 9, 0, 0, 0).toISOString()
    const line = { serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 99 }
    const base = { dogId: 'dog-1', start, services: [line], createdAt: start, updatedAt: start }
    localStorage.setItem(storageKeys.appointments('uid-1'), JSON.stringify({
      a: { ...base, id: 'a', status: 'programmato' },
      b: { ...base, id: 'b', status: 'completato' },
      c: { ...base, id: 'c', status: 'disdetto', cancelReason: 'salone' },
      d: { ...base, id: 'd', status: 'non_venuto' },
      e: { ...base, id: 'e', status: 'annullato' },
      f: { ...base, id: 'f', status: 'non_venuto', cancelReason: 'cliente' },
      g: { ...base, id: 'g', status: 'disdetto', cancelReason: 'boh' },
    }))
    const byId = Object.fromEntries(listAppointments('uid-1').map((item) => [item.id, item]))
    expect(byId.a.status).toBe('programmato')
    expect(byId.b.status).toBe('completato')
    expect(byId.c.status).toBe('disdetto')
    expect(byId.c.cancelReason).toBe('salone')
    expect(byId.d.status).toBe('non_venuto')
    expect(byId.e.status).toBe('programmato')
    expect(byId.f.cancelReason).toBeUndefined()
    expect(byId.g.status).toBe('disdetto')
    expect(byId.g.cancelReason).toBeUndefined()
  })

  it('setAppointmentStatus scrive disdetto con il motivo, non venuto senza, e programmato toglie il motivo', () => {
    const created = createAppointment('uid-1', write())
    const cancelled = setAppointmentStatus('uid-1', created.id, 'disdetto', 'cliente')
    expect(cancelled.status).toBe('disdetto')
    expect(cancelled.cancelReason).toBe('cliente')
    expect(cancelled.start).toEqual(created.start)
    expect(cancelled.services).toEqual(created.services)
    const stored = () => JSON.parse(localStorage.getItem(storageKeys.appointments('uid-1'))!)[created.id]
    expect(stored()).toMatchObject({ status: 'disdetto', cancelReason: 'cliente' })
    const edited = updateAppointment('uid-1', created.id, write({ start: new Date(2026, 9, 3, 11, 0, 0, 0) }))
    expect(edited.status).toBe('disdetto')
    expect(edited.cancelReason).toBe('cliente')
    const absent = setAppointmentStatus('uid-1', created.id, 'non_venuto')
    expect(absent.status).toBe('non_venuto')
    expect(absent.cancelReason).toBeUndefined()
    expect(stored().cancelReason).toBeUndefined()
    setAppointmentStatus('uid-1', created.id, 'disdetto', 'salone')
    const restored = setAppointmentStatus('uid-1', created.id, 'programmato')
    expect(restored.status).toBe('programmato')
    expect(restored.cancelReason).toBeUndefined()
    expect(stored().status).toBe('programmato')
    expect(stored().cancelReason).toBeUndefined()
    expect(listAppointments('uid-1')).toHaveLength(1)
  })

  it('cambiare stato a un id assente fallisce senza scrivere', () => {
    const before = localStorage.getItem(storageKeys.appointments('uid-1'))
    expect(() => setAppointmentStatus('uid-1', 'assente', 'disdetto', 'cliente')).toThrowError(expect.objectContaining({ code: 'appointment_missing' }))
    expect(localStorage.getItem(storageKeys.appointments('uid-1'))).toBe(before)
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

  it('photosPatch segna solo la foto sostituita indicata e updateAppointment la tiene', () => {
    const created = createAppointment('uid-1', write())
    const previous = { ...created, photos: [{ id: 'p1', photo: 'file:a', kind: 'prima' as const }] }
    expect(photosPatch(previous, [], [])).toEqual({ photos: [] })
    const patch = photosPatch(previous, [{ id: 'p2', photo: 'file:b', kind: 'prima' }], ['p1'])
    expect(patch.removedPhotoIds).toEqual(['p1'])
    const map = JSON.parse(localStorage.getItem(storageKeys.appointments('uid-1'))!) as Record<string, Record<string, unknown>>
    map[created.id] = { ...map[created.id], ...patch }
    localStorage.setItem(storageKeys.appointments('uid-1'), JSON.stringify(map))
    const updated = updateAppointment('uid-1', created.id, write())
    expect(updated.removedPhotoIds).toEqual(['p1'])
    expect(listAppointments('uid-1')[0].removedPhotoIds).toEqual(['p1'])
  })

  it('saveClose scrive cifra, minuti e nota in una volta senza toccare le righe', () => {
    const created = createAppointment('uid-1', write({
      services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 60, price: 50 }],
    }))
    const setItem = vi.spyOn(localStorage, 'setItem')
    const done = saveClose('uid-1', created.id, { total: 70, actualDurationMin: 120, adjustmentNote: 'Pieno di nodi' }, true)
    expect(setItem).toHaveBeenCalledTimes(1)
    setItem.mockRestore()
    expect(done.services[0].price).toBe(50)
    expect(done.start).toEqual(created.start)
    expect(done.status).toBe('completato')
    expect(done.total).toBe(70)
    expect(done.actualDurationMin).toBe(120)
    expect(done.adjustmentNote).toBe('Pieno di nodi')
    const stored = JSON.parse(localStorage.getItem(storageKeys.appointments('uid-1'))!)[created.id]
    expect(stored.adjustmentNote).toBe('Pieno di nodi')
    expect(stored.services[0].price).toBe(50)

    const same = updateAppointment('uid-1', created.id, write({ services: created.services }))
    expect(same.adjustmentNote).toBe('Pieno di nodi')
    expect(listAppointments('uid-1')[0].adjustmentNote).toBe('Pieno di nodi')

    const cleared = saveClose('uid-1', created.id, { total: null, actualDurationMin: 60, adjustmentNote: null }, false)
    expect(cleared.total).toBeUndefined()
    expect(cleared.adjustmentNote).toBeUndefined()
    expect(cleared.actualDurationMin).toBe(60)
    expect(cleared.status).toBe('completato')
    const after = JSON.parse(localStorage.getItem(storageKeys.appointments('uid-1'))!)[created.id]
    expect('total' in after).toBe(false)
    expect('adjustmentNote' in after).toBe(false)
    expect(after.status).toBe('completato')
  })

  it('saveClose scrive il metodo e null lo toglie, un valore estraneo non si legge', () => {
    const created = createAppointment('uid-1', { dogId: 'd1', start: new Date(2026, 9, 3, 9, 0, 0, 0), services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 60, price: 50 }] })
    const paid = saveClose('uid-1', created.id, { total: null, actualDurationMin: 60, adjustmentNote: null, paymentMethod: 'pos' }, true)
    expect(paid.paymentMethod).toBe('pos')
    expect(JSON.parse(localStorage.getItem(storageKeys.appointments('uid-1'))!)[created.id].paymentMethod).toBe('pos')
    const cash = saveClose('uid-1', created.id, { total: 70, actualDurationMin: 90, adjustmentNote: 'Nodi', paymentMethod: 'contanti' }, false)
    expect(cash.paymentMethod).toBe('contanti')
    expect(cash.status).toBe('completato')
    const cleared = saveClose('uid-1', created.id, { total: null, actualDurationMin: 60, adjustmentNote: null, paymentMethod: null }, false)
    expect(cleared.paymentMethod).toBeUndefined()
    const map = JSON.parse(localStorage.getItem(storageKeys.appointments('uid-1'))!) as Record<string, { paymentMethod?: string }>
    map[created.id].paymentMethod = 'bonifico'
    localStorage.setItem(storageKeys.appointments('uid-1'), JSON.stringify(map))
    expect(listAppointments('uid-1')[0].paymentMethod).toBeUndefined()
  })

  it('updateAppointment tiene il metodo di pagamento dopo saveClose', () => {
    const created = createAppointment('uid-1', write())
    saveClose('uid-1', created.id, { total: null, actualDurationMin: 60, adjustmentNote: null, paymentMethod: 'pos' }, true)
    const nextStart = new Date(2026, 9, 3, 11, 0, 0, 0)
    const updated = updateAppointment('uid-1', created.id, write({ start: nextStart, services: created.services }))
    expect(updated.paymentMethod).toBe('pos')
    expect(JSON.parse(localStorage.getItem(storageKeys.appointments('uid-1'))!)[created.id].paymentMethod).toBe('pos')
  })

  it('saveClose con complete false tiene lo stato programmato e un id assente fallisce', () => {
    const created = createAppointment('uid-1', write())
    const saved = saveClose('uid-1', created.id, { total: 30, actualDurationMin: 45, adjustmentNote: '  ' }, false)
    expect(saved.status).toBe('programmato')
    expect(saved.adjustmentNote).toBeUndefined()
    expect(() => saveClose('uid-1', 'assente', { total: null, actualDurationMin: 10, adjustmentNote: null }, true)).toThrow(AppError)
  })
})
