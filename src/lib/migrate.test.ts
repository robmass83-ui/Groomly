import { describe, expect, it } from 'vitest'
import { migrateMaps } from './migrate'

describe('migrateMaps', () => {
  it('porta un senior vecchio ad anziano, dà 4 settimane ai mensili e ricalcola la chiave', () => {
    const result = migrateMaps(
      {
        ercole: {
          id: 'ercole',
          name: 'Àrtù',
          breed: 'Terranova',
          ageCategory: 'adulto',
          isSenior: true,
          clientType: 'mensile',
          contact: { name: 'Maria Usai', phone: '+39 345 2424242' },
          contacts: [{ name: 'Maria Usai', phone: '+39 345 2424242' }],
          searchKey: 'artu scritto a mano',
        },
        luna: {
          id: 'luna',
          name: 'Luna',
          breed: 'Maltese',
          ageCategory: 'adulto',
          isSenior: false,
          clientType: 'occasionale',
          contact: { name: 'Bianchi', phone: '333' },
          searchKey: 'luna maltese bianchi',
        },
      },
      {
        a1: { id: 'a1', status: 'cancellato' },
        a2: { id: 'a2', status: 'completato' },
      },
    )
    expect(result.changed).toBe(true)
    const ercole = result.dogs.ercole as { ageCategory: string; isSenior: boolean; recurrenceWeeks: number; searchKey: string }
    expect(ercole.ageCategory).toBe('anziano')
    expect(ercole.isSenior).toBe(true)
    expect(ercole.recurrenceWeeks).toBe(4)
    expect(ercole.searchKey).toContain('artu')
    expect(ercole.searchKey).toContain('3452424242')
    expect(ercole.searchKey).not.toContain('+39')
    const luna = result.dogs.luna as { recurrenceWeeks?: number; ageCategory: string }
    expect(luna.ageCategory).toBe('adulto')
    expect(luna.recurrenceWeeks).toBeUndefined()
    expect((result.appointments.a1 as { status: string }).status).toBe('programmato')
    expect((result.appointments.a2 as { status: string }).status).toBe('completato')
  })

  it('toglie il prefisso una sola volta', () => {
    const result = migrateMaps({
      rex: {
        name: 'Rex',
        breed: '',
        contact: { name: '', phone: '+390039123456' },
        searchKey: 'vecchia',
      },
    }, {})
    expect((result.dogs.rex as { searchKey: string }).searchKey).toBe('rex 0039123456')
  })

  it('non riscrive dati già a posto', () => {
    const dogs = {
      ok: {
        id: 'ok',
        name: 'Ok',
        breed: 'Barboncino',
        ageCategory: 'anziano',
        isSenior: true,
        clientType: 'mensile',
        recurrenceWeeks: 6,
        contact: { name: 'Lea', phone: '3452424242' },
        searchKey: 'ok barboncino lea 3452424242',
      },
    }
    const appointments = { a: { id: 'a', status: 'disdetto' } }
    const result = migrateMaps(dogs, appointments)
    expect(result.changed).toBe(false)
    expect((result.appointments.a as { status: string }).status).toBe('disdetto')
    expect(result.dogs.ok).toBe(dogs.ok)
  })
})
