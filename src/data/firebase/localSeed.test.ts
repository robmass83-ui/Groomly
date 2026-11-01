// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../errors'
import { listAppointments } from '../local/appointments'
import { createDog, updateDog } from '../local/dogs'
import { storageKeys } from '../local/storage'
import type { Appointment, DogWrite } from '../../types/models'
import type { Service } from '../../types/models'
import { appointmentsToLocalMap, servicesToLocalMap, withLocalKey } from './localSeed'

function service(id: string, iconKey?: Service['iconKey']): Service {
  const now = new Date('2026-10-24T08:00:00.000Z')
  const row: Service = {
    id,
    name: id,
    kind: 'principale',
    durationMin: { piccola: 30, media: 40, grande: 50 },
    price: { piccola: 10, media: 12, grande: 15 },
    order: 0,
    active: true,
    createdAt: now,
    updatedAt: now,
  }
  if (iconKey) row.iconKey = iconKey
  return row
}

function write(partial: Partial<DogWrite> & Pick<DogWrite, 'name'>): DogWrite {
  return {
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: '', phone: '333' },
    ...partial,
  }
}

describe('withLocalKey', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('valida in memoria e non scrive la chiave groomly.users', () => {
    const key = storageKeys.dogs('uid-cloud')
    const spy = vi.spyOn(localStorage, 'setItem')
    const dog = withLocalKey(key, {}, () => createDog('uid-cloud', write({ name: 'Nube' })))
    expect(dog.name).toBe('Nube')
    expect(localStorage.getItem(key)).toBeNull()
    expect(spy).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('groomly.migrate')).toBeNull()
    expect(() => withLocalKey(key, {}, () => updateDog('uid-cloud', 'missing', write({ name: 'Nube' })))).toThrow(AppError)
    expect(localStorage.getItem(key)).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('servicesToLocalMap', () => {
  it('non scrive iconKey quando il servizio non ha un’icona', () => {
    const stored = servicesToLocalMap([service('stripping'), service('bagno', 'bagno')])
    expect(stored.stripping).not.toHaveProperty('iconKey')
    expect(stored.bagno).toMatchObject({ iconKey: 'bagno' })
  })
})

type VisitaCompleta = Required<Omit<Appointment, 'title' | 'plannedEnd'>>

function visitaCompleta(): VisitaCompleta {
  return {
    id: 'a1',
    dogId: 'd1',
    start: new Date('2026-10-30T09:00:00.000Z'),
    services: [{ serviceId: 's1', name: 'Bagno', durationMin: 40, price: 35 }],
    status: 'disdetto',
    cancelReason: 'cliente',
    createdAt: new Date('2026-10-01T08:00:00.000Z'),
    updatedAt: new Date('2026-10-30T10:00:00.000Z'),
    end: new Date('2026-10-30T09:40:00.000Z'),
    chiusoIl: new Date('2026-10-30T09:45:00.000Z'),
    total: 35,
    actualDurationMin: 40,
    adjustmentNote: 'sconto fedeltà',
    paymentMethod: 'contanti',
    tools: ['forbici'],
    products: ['shampoo'],
    cutStyle: 'taglio corto',
    photos: [{ id: 'p1', photo: 'data:image/jpeg;base64,AAA', kind: 'prima' }],
    removedPhotoIds: ['p0'],
    seriesId: 'serie-1',
    cycleAnchor: 'visita',
    coveredDue: new Date('2026-11-20T09:00:00.000Z'),
    kind: 'pelosetto',
    extraNotes: [{ id: 'n1', text: 'attenzione alle orecchie', createdAt: new Date('2026-10-30T09:50:00.000Z') }],
    assigneeUid: 'collab-1',
    provvisorio: true,
    scadeIl: '2026-11-02',
    richiestaId: 'rich-1',
    ospiteNome: 'Ospite',
  }
}

function viaCopiaLocale(items: Appointment[]): Appointment[] {
  localStorage.setItem(storageKeys.appointments('u'), JSON.stringify(appointmentsToLocalMap(items)))
  return listAppointments('u')
}

describe('appointmentsToLocalMap', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('una visita con tutti i campi torna identica dalla copia locale', () => {
    const fixture = visitaCompleta()
    expect(viaCopiaLocale([fixture])[0]).toEqual(fixture)
  })

  it('una visita completata con assegnatario torna identica', () => {
    const fixture: Appointment = { ...visitaCompleta(), status: 'completato' }
    delete fixture.cancelReason
    expect(viaCopiaLocale([fixture])[0]).toEqual(fixture)
  })

  it('un impegno personale assegnato torna identico', () => {
    const now = new Date('2026-10-30T08:00:00.000Z')
    const fixture: Appointment = {
      id: 'p1',
      kind: 'personale',
      title: 'Dentista',
      dogId: '',
      start: new Date('2026-10-31T14:00:00.000Z'),
      plannedEnd: new Date('2026-10-31T15:00:00.000Z'),
      services: [],
      status: 'programmato',
      assigneeUid: 'collab-1',
      tools: [],
      products: [],
      photos: [],
      createdAt: now,
      updatedAt: now,
    }
    expect(viaCopiaLocale([fixture])[0]).toEqual(fixture)
  })

  it('una visita senza kind resta senza kind', () => {
    const fixture: Appointment = { ...visitaCompleta(), status: 'programmato' }
    delete fixture.kind
    expect(viaCopiaLocale([fixture])[0]).not.toHaveProperty('kind')
  })

  it('chiusura: assigneeUid, chiusoIl e kind non si perdono', () => {
    const fixture: Appointment = { ...visitaCompleta(), status: 'completato' }
    expect(appointmentsToLocalMap([fixture]).a1).toMatchObject({
      assigneeUid: 'collab-1',
      chiusoIl: fixture.chiusoIl?.toISOString(),
      kind: 'pelosetto',
    })
  })
})
