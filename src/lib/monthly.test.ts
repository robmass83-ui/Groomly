import { describe, expect, it } from 'vitest'
import { activeServiceIds, bannerCopy, bookHref, monthlyLists, suggestedVisit } from './monthly'
import type { Appointment, Dog, Service } from '../types/models'

const now = new Date(2026, 9, 3, 12, 0, 0, 0)

function dog(id: string, name: string, extra: Partial<Dog> = {}): Dog {
  return {
    id,
    name,
    species: 'cane',
    breed: '',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'mensile',
    status: 'attivo',
    contact: { name: '', phone: '333' },
    searchKey: name.toLowerCase(),
    createdAt: now,
    updatedAt: now,
    ...extra,
  }
}

function visit(id: string, dogId: string, start: Date, serviceIds: string[] = ['bagno']): Appointment {
  return {
    id,
    dogId,
    start,
    services: serviceIds.map((serviceId) => ({ serviceId, name: serviceId, durationMin: 30, price: 99 })),
    createdAt: start,
    updatedAt: start,
  }
}

function service(id: string, active = true): Service {
  return {
    id,
    name: id,
    kind: 'principale',
    durationMin: { piccola: 30, media: 45, grande: 60 },
    price: { piccola: 20, media: 28, grande: 38 },
    order: 0,
    active,
    createdAt: now,
    updatedAt: now,
  }
}

describe('monthly', () => {
  it('tiene fuori occasionale, archiviato, e divide futuro e passato', () => {
    const lists = monthlyLists([
      dog('rex', 'Rex'),
      dog('otto', 'Otto', { clientType: 'occasionale' }),
      dog('lux', 'Lux', { status: 'deceduto' }),
      dog('kira', 'Kira'),
    ], [
      visit('past', 'kira', new Date(2026, 8, 5, 9, 30, 0, 0)),
      visit('future', 'kira', new Date(2026, 9, 17, 9, 0, 0, 0)),
    ], now)
    expect(lists.toBook.map((row) => row.dog.name)).toEqual(['Rex'])
    expect(lists.toBook[0].subtitle).toBe('Nessun appuntamento')
    expect(lists.booked.map((row) => row.dog.name)).toEqual(['Kira'])
    expect(lists.booked[0].subtitle).toBe('Sabato 17 ottobre · 09:00')
    expect(lists.booked[0].next.id).toBe('future')
  })

  it('ordina Da fissare: senza passato per nome, poi il passato più vecchio', () => {
    const lists = monthlyLists([
      dog('nino', 'Nino'),
      dog('anna', 'Anna'),
      dog('anna-b', 'Anna'),
      dog('ciro', 'Ciro'),
      dog('bea', 'Bea'),
    ], [
      visit('c', 'ciro', new Date(2026, 8, 20, 9, 0, 0, 0)),
      visit('b', 'bea', new Date(2026, 8, 1, 9, 0, 0, 0)),
    ], now)
    expect(lists.toBook.map((row) => row.dog.id)).toEqual(['anna', 'anna-b', 'nino', 'bea', 'ciro'])
    expect(lists.toBook.find((row) => row.dog.id === 'bea')?.subtitle).toBe('Ultimo martedì 1 settembre')
  })

  it('scrive Ultimo con la prima lettera minuscola', () => {
    const lists = monthlyLists(
      [dog('luna', 'Luna')],
      [visit('old', 'luna', new Date(2026, 8, 5, 9, 30, 0, 0))],
      now,
    )
    expect(lists.toBook[0].subtitle).toBe('Ultimo sabato 5 settembre')
    expect(lists.toBook[0].last?.id).toBe('old')
  })

  it('a parità di passato prende lo start più grande e, a pari ora, l’id minore', () => {
    const start = new Date(2026, 8, 5, 9, 30, 0, 0)
    const lists = monthlyLists(
      [dog('luna', 'Luna')],
      [
        visit('b', 'luna', start, ['taglio']),
        visit('a', 'luna', start, ['bagno']),
      ],
      now,
    )
    expect(lists.toBook[0].last?.id).toBe('a')
  })

  it('ordina Fissati per start e poi per id dell’appuntamento', () => {
    const start = new Date(2026, 9, 10, 11, 0, 0, 0)
    const lists = monthlyLists(
      [dog('rex', 'Rex'), dog('luna', 'Luna')],
      [visit('m-2', 'luna', start), visit('m-1', 'rex', start)],
      now,
    )
    expect(lists.booked.map((row) => row.next.id)).toEqual(['m-1', 'm-2'])
  })

  it('activeServiceIds tiene la prima occorrenza, omette inattivi e sconosciuti', () => {
    expect(
      activeServiceIds(
        ['taglio', 'bagno', 'taglio', 'spento', 'assente'],
        [service('bagno'), service('taglio'), service('spento', false)],
      ),
    ).toEqual(['taglio', 'bagno'])
  })

  it('senza storico propone oggi, ora vuota e nessun servizio', () => {
    expect(suggestedVisit([], 'rex', [service('bagno')], now)).toEqual({
      day: '2026-10-03',
      time: '',
      serviceIds: [],
    })
  })

  it('dal 5 settembre alle 09:30 propone il 31 ottobre alle 09:30', () => {
    const appointments = [visit('old', 'luna', new Date(2026, 8, 5, 9, 30, 0, 0), ['taglio', 'bagno'])]
    expect(suggestedVisit(appointments, 'luna', [service('bagno'), service('taglio')], now)).toEqual({
      day: '2026-10-31',
      time: '09:30',
      serviceIds: ['taglio', 'bagno'],
    })
  })

  it('se le 14:00 del 3 ottobre sono ancora davanti, non aggiunge un altro mese', () => {
    const appointments = [visit('old', 'luna', new Date(2026, 8, 5, 14, 0, 0, 0))]
    expect(suggestedVisit(appointments, 'luna', [service('bagno')], now)).toEqual({
      day: '2026-10-03',
      time: '14:00',
      serviceIds: ['bagno'],
    })
  })

  it('un’ora che non è un quarto d’ora lascia il campo vuoto e porta il giorno a oggi o dopo', () => {
    const appointments = [visit('old', 'luna', new Date(2026, 8, 5, 9, 7, 0, 0))]
    expect(suggestedVisit(appointments, 'luna', [service('bagno')], now)).toEqual({
      day: '2026-10-03',
      time: '',
      serviceIds: ['bagno'],
    })
  })

  it('toglie i servizi assenti o spenti e, se non ne resta, omette il parametro', () => {
    const appointments = [visit('old', 'luna', new Date(2026, 8, 5, 9, 30, 0, 0), ['spento', 'assente'])]
    const visitPlan = suggestedVisit(appointments, 'luna', [service('spento', false), service('bagno')], now)
    expect(visitPlan.serviceIds).toEqual([])
    const href = bookHref('luna', appointments, [service('spento', false), service('bagno')], now)
    const params = new URL(href, 'http://local').searchParams
    expect(params.get('cane')).toBe('luna')
    expect(params.get('data')).toBe('2026-10-31')
    expect(params.get('ora')).toBe('09:30')
    expect(params.get('servizi')).toBeNull()
    expect(params.get('da')).toBe('mensili')
  })

  it('mette nell’indirizzo solo ora e servizi quando ci sono', () => {
    const appointments = [visit('old', 'luna', new Date(2026, 8, 5, 9, 30, 0, 0))]
    const params = new URL(bookHref('luna', appointments, [service('bagno')], now), 'http://local').searchParams
    expect(params.get('servizi')).toBe('bagno')
    expect(params.get('da')).toBe('mensili')
  })

  it('il banner è assente senza righe, singolare con una, e mostra solo tre nomi', () => {
    expect(bannerCopy([])).toBeNull()
    const one = monthlyLists([dog('rex', 'Rex')], [], now).toBook
    expect(bannerCopy(one)).toEqual({ title: '1 mensile da programmare', names: 'Rex' })
    const four = monthlyLists([
      dog('zoe', 'Zoe'),
      dog('anna', 'Anna'),
      dog('mia', 'Mia'),
      dog('bea', 'Bea'),
    ], [], now).toBook
    expect(bannerCopy(four)).toEqual({
      title: '4 mensili da programmare',
      names: 'Anna, Bea, Mia',
    })
  })
})
