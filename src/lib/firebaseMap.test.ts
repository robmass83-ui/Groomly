import { describe, expect, it } from 'vitest'
import { blankSettings, type SettingsMain } from '../data/local/settings'
import type { Appointment, Dog } from '../types/models'
import { appointmentFromDoc, appointmentToDoc, dateToMillis, dogFromDoc, dogToDoc, millisToDate, settingsFromDoc, settingsToDoc, storagePaths } from './firebaseMap'

describe('firebaseMap', () => {
  it('un prezzo assente resta assente e non diventa zero', () => {
    const loaded = dogFromDoc('d1', {
      hiddenServiceIds: ['bagno'],
      servicePrices: [{ serviceId: 'bagno' }],
    })
    expect(loaded.hiddenServiceIds).toEqual(['bagno'])
    expect(loaded.servicePrices).toEqual([{ serviceId: 'bagno' }])
    const doc = dogToDoc(loaded)
    const row = (doc.servicePrices as { serviceId: string; price?: number; durationMin?: number }[])[0]
    expect(row).toEqual({ serviceId: 'bagno' })
    expect(row.price).toBeUndefined()
    expect(row.durationMin).toBeUndefined()
  })

  it('mappa i percorsi storage e i millisecondi', () => {
    expect(storagePaths('u').profile('d')).toBe('salon/dogs/d/profile.jpg')
    expect(storagePaths('u').gallery('d', 'p')).toBe('salon/dogs/d/gallery/p.jpg')
    expect(storagePaths('u').work('a', 'p', 'prima')).toBe('salon/appointments/a/prima-p.jpg')
    expect(storagePaths('u').price('file-id')).toBe('salon/pricelist/file-id')
    expect(storagePaths('u').backup('2026-10-09')).toBe('users/u/backups/2026-10-09.json')
    expect(millisToDate(dateToMillis(new Date(2026, 9, 3, 12))).toISOString()).toBe(new Date(2026, 9, 3, 12).toISOString())
  })

  it('settingsToDoc omette snapshot, passwordHash e i dataUrl del listino', () => {
    const settings = {
      ...blankSettings('dark', '2026-10-09T00:00:00.000Z'),
      passwordHash: 'secret',
      backup: { autoDaily: true, lastAt: '2026-10-08T00:00:00.000Z', snapshot: { dogs: { a: { photo: 'data:image/jpeg;base64,QQ==' } } } },
      priceList: price('now', 'data:application/pdf;base64,QQ=='),
      priceListHistory: [price('old', 'https://files.example/old.pdf'), price('bin', 'data:application/pdf;base64,Qg==')],
    } as SettingsMain
    const doc = settingsToDoc(settings)
    expect(doc.passwordHash).toBeUndefined()
    expect(doc.backup).toEqual({ autoDaily: true, lastAt: '2026-10-08T00:00:00.000Z' })
    expect(doc.priceList).toMatchObject({ id: 'now', fileName: 'listino.pdf' })
    expect((doc.priceList as { dataUrl?: string }).dataUrl).toBeUndefined()
    expect(doc.priceListHistory).toEqual([
      expect.objectContaining({ id: 'old', dataUrl: 'https://files.example/old.pdf' }),
      expect.objectContaining({ id: 'bin' }),
    ])
    expect((doc.priceListHistory as { dataUrl?: string }[])[1].dataUrl).toBeUndefined()
    expect(JSON.stringify(doc)).not.toContain('data:')
    expect(doc.theme).toBeUndefined()
  })

  it('settingsFromDoc non riporta snapshot né passwordHash', () => {
    const settings = settingsFromDoc({
      theme: 'dark',
      updatedAt: '2026-10-09T00:00:00.000Z',
      passwordHash: 'secret',
      backup: { autoDaily: true, snapshot: { dogs: { a: 1 } } },
    })
    expect(settings.theme).toBe('dark')
    expect(settings.backup.autoDaily).toBe(true)
    expect(settings.backup.snapshot).toBeUndefined()
    expect('passwordHash' in settings).toBe(false)
  })

  it('appointmentFromDoc legge i quattro stati e il motivo, e il resto è programmato', () => {
    const base = { dogId: 'd1', start: 1, services: [], createdAt: 1, updatedAt: 1 }
    for (const status of ['programmato', 'completato', 'disdetto', 'non_venuto']) {
      expect(appointmentFromDoc('a1', { ...base, status }).status).toBe(status)
    }
    expect(appointmentFromDoc('a1', { ...base, status: 'cancellato' }).status).toBe('programmato')
    expect(appointmentFromDoc('a1', base).status).toBe('programmato')
    expect(appointmentFromDoc('a1', { ...base, status: 'disdetto', cancelReason: 'cliente' }).cancelReason).toBe('cliente')
    expect(appointmentFromDoc('a1', { ...base, status: 'disdetto', cancelReason: 'salone' }).cancelReason).toBe('salone')
    expect(appointmentFromDoc('a1', { ...base, status: 'disdetto', cancelReason: 'x' }).cancelReason).toBeUndefined()
    expect(appointmentFromDoc('a1', { ...base, status: 'programmato', cancelReason: 'cliente' }).cancelReason).toBeUndefined()
  })

  it('appointmentToDoc scrive lo stato e il motivo solo se ci sono', () => {
    const plain = appointmentToDoc(appointment({ status: 'non_venuto' }))
    expect(plain.status).toBe('non_venuto')
    expect('cancelReason' in plain).toBe(false)
    const cancelled = appointmentToDoc(appointment({ status: 'disdetto', cancelReason: 'salone' }))
    expect(cancelled).toMatchObject({ status: 'disdetto', cancelReason: 'salone' })
  })

  it('dogToDoc e appointmentToDoc tengono le foto, anche quelle appena scattate, e gli URL remoti', () => {
    const dogDoc = dogToDoc(dog({
      photo: 'data:image/jpeg;base64,QQ==',
      gallery: [
        { id: 'g1', photo: 'data:image/jpeg;base64,Qg==', takenAt: new Date(2026, 9, 9, 12) },
        { id: 'g2', photo: 'https://files.example/g2.jpg', takenAt: new Date(2026, 9, 9, 12) },
      ],
    }))
    expect(dogDoc.photo).toBe('data:image/jpeg;base64,QQ==')
    expect(dogDoc.gallery).toEqual([
      { id: 'g1', photo: 'data:image/jpeg;base64,Qg==', takenAt: dateToMillis(new Date(2026, 9, 9, 12)) },
      { id: 'g2', photo: 'https://files.example/g2.jpg', takenAt: dateToMillis(new Date(2026, 9, 9, 12)) },
    ])

    const appointmentDoc = appointmentToDoc(appointment({
      photos: [
        { id: 'p1', photo: 'data:image/jpeg;base64,Qw==', kind: 'prima' },
        { id: 'p2', photo: 'https://files.example/p2.jpg', kind: 'dopo' },
      ],
    }))
    expect(appointmentDoc.photos).toEqual([
      { id: 'p1', photo: 'data:image/jpeg;base64,Qw==', kind: 'prima' },
      { id: 'p2', photo: 'https://files.example/p2.jpg', kind: 'dopo' },
    ])
  })

  it('cycleAnchor e coveredDue viaggiano in millisecondi e un valore rotto si ignora', () => {
    const covered = new Date(2026, 0, 29, 9, 30, 0, 0)
    const doc = appointmentToDoc(appointment({ cycleAnchor: 'ritmo', coveredDue: covered }))
    expect(doc.cycleAnchor).toBe('ritmo')
    expect(doc.coveredDue).toBe(dateToMillis(covered))
    const loaded = appointmentFromDoc('a1', doc)
    expect(loaded.cycleAnchor).toBe('ritmo')
    expect(loaded.coveredDue).toEqual(covered)
    expect(appointmentFromDoc('a1', { ...doc, cycleAnchor: 'boh', coveredDue: 'nope' }).cycleAnchor).toBeUndefined()
    expect(appointmentFromDoc('a1', { ...doc, cycleAnchor: 'boh', coveredDue: 'nope' }).coveredDue).toBeUndefined()
    expect(appointmentToDoc(appointment()).cycleAnchor).toBeUndefined()
    expect(appointmentToDoc(appointment()).coveredDue).toBeUndefined()
  })
})

function price(id: string, dataUrl: string) {
  return { id, fileName: 'listino.pdf', mime: 'application/pdf', byteSize: 2, uploadedAt: '2026-10-09T00:00:00.000Z', dataUrl }
}

function dog(partial: Partial<Dog>): Dog {
  const now = new Date(2026, 9, 9, 12)
  return {
    id: 'd1',
    name: 'Bobi',
    species: 'cane',
    breed: 'Labrador',
    ageCategory: 'adulto',
    size: 'media',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: 'Lea', phone: '333' },
    contacts: [{ id: 'primary', name: 'Lea', role: 'Proprietaria', phone: '333', isPrimary: true }],
    tags: [],
    servicePrices: [],
    hiddenServiceIds: [],
    customFields: [],
    gallery: [],
    status: 'attivo',
    searchKey: 'bobi',
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

function appointment(partial: Partial<Appointment> = {}): Appointment {
  const now = new Date(2026, 9, 9, 12)
  return {
    id: 'a1',
    dogId: 'd1',
    start: now,
    services: [],
    status: 'programmato',
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}
