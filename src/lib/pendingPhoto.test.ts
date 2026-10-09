import { describe, expect, it } from 'vitest'
import { blankSettings, type PriceFile } from '../data/local/settings'
import type { Appointment, Dog } from '../types/models'
import { mergePendingAppointment, mergePendingDog, mergePendingSettings } from './pendingPhoto'

const now = new Date(2026, 9, 9, 12)

function dog(partial: Partial<Dog> = {}): Dog {
  return {
    id: 'd1',
    name: 'Bobi',
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'media',
    temperament: 'bravo',
    clientType: 'occasionale',
    contact: { name: 'Lea', phone: '333' },
    contacts: [],
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

function file(id: string, dataUrl: string): PriceFile {
  return { id, fileName: `${id}.pdf`, mime: 'application/pdf', byteSize: 2, uploadedAt: now.toISOString(), dataUrl }
}

describe('pendingPhoto', () => {
  it('tiene il dataUrl nel cane finché lo snapshot non ha l’URL remoto', () => {
    const previous = dog({
      photo: 'data:image/jpeg;base64,QQ==',
      gallery: [{ id: 'g1', photo: 'data:image/jpeg;base64,Qg==', takenAt: now }],
    })
    const stripped = dog({ gallery: [] })
    const waiting = mergePendingDog(stripped, previous)
    expect(waiting.photo).toBe('data:image/jpeg;base64,QQ==')
    expect(waiting.gallery).toEqual(previous.gallery)

    const ready = mergePendingDog(dog({
      photo: 'https://files.example/d1.jpg',
      gallery: [{ id: 'g1', photo: 'https://files.example/g1.jpg', takenAt: now }],
    }), waiting)
    expect(ready.photo).toBe('https://files.example/d1.jpg')
    expect(ready.gallery[0]?.photo).toBe('https://files.example/g1.jpg')
  })

  it('tiene le foto dataUrl dell’appuntamento finché l’upload non finisce', () => {
    const previous = appointment({ photos: [{ id: 'p1', photo: 'data:image/jpeg;base64,Qw==', kind: 'prima' }] })
    const waiting = mergePendingAppointment(appointment({ photos: [] }), previous)
    expect(waiting.photos).toEqual(previous.photos)
    const ready = mergePendingAppointment(appointment({
      photos: [{ id: 'p1', photo: 'https://files.example/p1.jpg', kind: 'prima' }],
    }), waiting)
    expect(ready.photos?.[0]?.photo).toBe('https://files.example/p1.jpg')
  })

  it('tiene il dataUrl del listino finché il documento non ha l’URL remoto', () => {
    const previous = {
      ...blankSettings('auto', now.toISOString()),
      priceList: file('now', 'data:application/pdf;base64,QQ=='),
      priceListHistory: [file('old', 'data:application/pdf;base64,Qg==')],
    }
    const incoming = {
      ...blankSettings('auto', now.toISOString()),
      priceList: { ...file('now', ''), dataUrl: '' },
      priceListHistory: [{ ...file('old', ''), dataUrl: '' }],
    }
    const waiting = mergePendingSettings(incoming, previous)
    expect(waiting.priceList?.dataUrl).toBe('data:application/pdf;base64,QQ==')
    expect(waiting.priceListHistory[0]?.dataUrl).toBe('data:application/pdf;base64,Qg==')
    const ready = mergePendingSettings({
      ...incoming,
      priceList: file('now', 'https://files.example/now.pdf'),
      priceListHistory: [file('old', 'https://files.example/old.pdf')],
    }, waiting)
    expect(ready.priceList?.dataUrl).toBe('https://files.example/now.pdf')
    expect(ready.priceListHistory[0]?.dataUrl).toBe('https://files.example/old.pdf')
  })
})
