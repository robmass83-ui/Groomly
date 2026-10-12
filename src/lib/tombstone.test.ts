import { beforeEach, describe, expect, it } from 'vitest'
import {
  filterAppointments,
  filterDogs,
  mergeTombstone,
  readDeletion,
  readTombstone,
  rememberDeletion,
  tombstoneRejectsAppointment,
  tombstoneRejectsDog,
  TOMBSTONE_KEY,
} from './tombstone'

describe('tombstone', () => {
  beforeEach(() => localStorage.clear())

  it('un documento vecchio senza appointmentIds è un elenco vuoto', () => {
    expect(readTombstone({ ids: ['rex'] })).toEqual({ ids: ['rex'], appointmentIds: [] })
    expect(readTombstone(null)).toEqual({ ids: [], appointmentIds: [] })
    expect(readTombstone({ ids: [1, 'rex'], appointmentIds: ['a', 2] })).toEqual({
      ids: ['rex'],
      appointmentIds: ['a'],
    })
  })

  it('unisce senza duplicare e rifiuta cane e appuntamento collegato', () => {
    const stone = mergeTombstone(
      { ids: ['rex'], appointmentIds: ['a'] },
      { ids: ['rex', 'luna'], appointmentIds: ['a', 'b'] },
    )
    expect(stone).toEqual({ ids: ['rex', 'luna'], appointmentIds: ['a', 'b'] })
    expect(tombstoneRejectsDog(stone, 'luna')).toBe(true)
    expect(tombstoneRejectsAppointment(stone, 'z', 'luna')).toBe(true)
    expect(tombstoneRejectsAppointment(stone, 'b', 'altro')).toBe(true)
    expect(tombstoneRejectsAppointment(stone, 'c', 'altro')).toBe(false)
    expect(filterDogs([{ id: 'rex' }, { id: 'oli' }], stone).map((dog) => dog.id)).toEqual(['oli'])
    expect(filterAppointments(
      [{ id: 'b', dogId: 'oli' }, { id: 'c', dogId: 'oli' }, { id: 'z', dogId: 'luna' }],
      stone,
    ).map((item) => item.id)).toEqual(['c'])
  })

  it('ricorda il segno sul telefono e lo rilegge', () => {
    rememberDeletion({ ids: ['rex'], appointmentIds: ['a'] })
    rememberDeletion({ appointmentIds: ['b'] })
    expect(localStorage.getItem(TOMBSTONE_KEY)).toContain('"rex"')
    expect(readDeletion()).toEqual({ ids: ['rex'], appointmentIds: ['a', 'b'] })
  })
})
