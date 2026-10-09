import { describe, expect, it } from 'vitest'
import { dateToMillis, millisToDate, storagePaths } from './firebaseMap'

describe('firebaseMap', () => {
  it('mappa i percorsi storage e i millisecondi', () => {
    expect(storagePaths('u').profile('d')).toBe('users/u/dogs/d/profile.jpg')
    expect(storagePaths('u').gallery('d', 'p')).toBe('users/u/dogs/d/gallery/p.jpg')
    expect(storagePaths('u').work('a', 'p', 'prima')).toBe('users/u/appointments/a/prima-p.jpg')
    expect(storagePaths('u').price('listino.pdf')).toBe('users/u/pricelist/listino.pdf')
    expect(storagePaths('u').backup('2026-10-09')).toBe('users/u/backups/2026-10-09.json')
    expect(millisToDate(dateToMillis(new Date(2026, 9, 3, 12))).toISOString()).toBe(new Date(2026, 9, 3, 12).toISOString())
  })
})
