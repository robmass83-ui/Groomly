import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  chiaveEliminazioni,
  dimenticaEliminazioni,
  dogHiddenNow,
  filterAppointments,
  filterDogs,
  forgetPendingDogDeletion,
  impostaAccountEliminazioni,
  mergeTombstone,
  noteSessionDogDeletion,
  PENDING_DELETE_KEY,
  readDeletion,
  readPendingDogDeletions,
  readTombstone,
  rememberDeletion,
  rememberPendingDogDeletion,
  resetSessionDogDeletions,
  sessionHidesDog,
  tombstoneRejectsAppointment,
  tombstoneRejectsDog,
  TOMBSTONE_KEY,
} from './tombstone'

describe('tombstone', () => {
  beforeEach(() => {
    localStorage.clear()
    impostaAccountEliminazioni('A')
  })
  afterEach(() => impostaAccountEliminazioni(null))

  it('un documento vecchio senza appointmentIds è un elenco vuoto', () => {
    expect(readTombstone({ ids: ['rex'] })).toEqual({ ids: ['rex'], appointmentIds: [], storicoIds: [] })
    expect(readTombstone(null)).toEqual({ ids: [], appointmentIds: [], storicoIds: [] })
    expect(readTombstone({ ids: [1, 'rex'], appointmentIds: ['a', 2] })).toEqual({
      ids: ['rex'],
      appointmentIds: ['a'],
      storicoIds: [],
    })
  })

  it('unisce senza duplicare e rifiuta cane e appuntamento collegato', () => {
    const stone = mergeTombstone(
      { ids: ['rex'], appointmentIds: ['a'], storicoIds: [] },
      { ids: ['rex', 'luna'], appointmentIds: ['a', 'b'], storicoIds: [] },
    )
    expect(stone).toEqual({ ids: ['rex', 'luna'], appointmentIds: ['a', 'b'], storicoIds: [] })
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

  it('un personale sparisce solo se il suo id è segnato, non per un cane', () => {
    const stone = { ids: ['rex'], appointmentIds: [] as string[], storicoIds: [] as string[] }
    expect(tombstoneRejectsAppointment(stone, 'p1', '')).toBe(false)
    expect(tombstoneRejectsAppointment({ ...stone, appointmentIds: ['p1'] }, 'p1', '')).toBe(true)
    const personal = { id: 'p1', dogId: 'rex', kind: 'personale' as const }
    expect(filterAppointments([personal], stone).map((item) => item.id)).toEqual(['p1'])
    expect(filterAppointments([personal], { ...stone, appointmentIds: ['p1'] })).toEqual([])
    expect(filterAppointments([{ id: 'v1', dogId: 'rex' }], stone)).toEqual([])
  })

  it('un cane con lo storico tenuto non nasconde le sue visite', () => {
    expect(tombstoneRejectsAppointment({ ids: ['rex'], appointmentIds: [], storicoIds: ['rex'] }, 'a1', 'rex')).toBe(false)
  })

  it('un cane eliminato prima dell aggiornamento nasconde ancora le sue visite', () => {
    expect(tombstoneRejectsAppointment({ ids: ['rex'], appointmentIds: [], storicoIds: [] }, 'a1', 'rex')).toBe(true)
  })

  it('una visita futura cancellata resta nascosta anche con lo storico tenuto', () => {
    expect(tombstoneRejectsAppointment({ ids: ['rex'], appointmentIds: ['f1'], storicoIds: ['rex'] }, 'f1', 'rex')).toBe(true)
  })

  it('readTombstone legge storicoIds e scarta i non testi', () => {
    expect(readTombstone({ ids: ['rex'], storicoIds: ['rex', 3] })).toEqual({ ids: ['rex'], appointmentIds: [], storicoIds: ['rex'] })
  })

  it('ricorda il segno sul telefono e lo rilegge', () => {
    rememberDeletion({ ids: ['rex'], appointmentIds: ['a'] })
    rememberDeletion({ appointmentIds: ['b'] })
    expect(localStorage.getItem(chiaveEliminazioni('A'))).toContain('"rex"')
    expect(readDeletion()).toEqual({ ids: ['rex'], appointmentIds: ['a', 'b'], storicoIds: [] })
  })

  it('ogni account ha la sua lista', () => {
    rememberDeletion({ ids: ['rex'] })
    impostaAccountEliminazioni('B')
    expect(readDeletion().ids).toEqual([])
    impostaAccountEliminazioni('A')
    expect(readDeletion().ids).toEqual(['rex'])
  })

  it('la vecchia lista unica passa all’account che entra e sparisce', () => {
    localStorage.setItem(TOMBSTONE_KEY, JSON.stringify({ ids: ['d1'] }))
    impostaAccountEliminazioni('A')
    expect(readDeletion().ids).toContain('d1')
    expect(localStorage.getItem(TOMBSTONE_KEY)).toBeNull()
  })

  it('senza account la lista è vuota e non si scrive', () => {
    impostaAccountEliminazioni(null)
    rememberDeletion({ ids: ['rex'] })
    expect(readDeletion().ids).toEqual([])
    expect(localStorage.length).toBe(0)
  })

  it('dimenticaEliminazioni toglie la chiave dell’account', () => {
    rememberDeletion({ ids: ['rex'] })
    dimenticaEliminazioni('A')
    expect(localStorage.getItem(chiaveEliminazioni('A'))).toBeNull()
  })
})

describe('cancellazione cane in corso', () => {
  afterEach(() => {
    resetSessionDogDeletions()
    localStorage.removeItem(PENDING_DELETE_KEY)
  })

  it('la sessione e il pending nascondono, la pietra storica no', () => {
    rememberDeletion({ ids: ['storico'] })
    expect(dogHiddenNow('storico')).toBe(false)
    noteSessionDogDeletion('adesso')
    expect(sessionHidesDog('adesso')).toBe(true)
    expect(dogHiddenNow('adesso')).toBe(true)
    rememberPendingDogDeletion('coda', [])
    rememberPendingDogDeletion('coda', [])
    expect(readPendingDogDeletions()).toEqual([{ id: 'coda', visitIds: [] }])
    expect(dogHiddenNow('coda')).toBe(true)
    forgetPendingDogDeletion('coda')
    expect(dogHiddenNow('coda')).toBe(false)
    expect(dogHiddenNow('')).toBe(false)
  })

  it('una cancellazione in sospeso tiene gli id delle visite', () => {
    rememberPendingDogDeletion('rex', ['f1', 'f2'])
    expect(readPendingDogDeletions()).toEqual([{ id: 'rex', visitIds: ['f1', 'f2'] }])
    expect(dogHiddenNow('rex')).toBe(true)
  })

  it('una cancellazione in sospeso tiene anche il percorso vecchio del cane', () => {
    rememberPendingDogDeletion('scheda-nuova', ['f1'], 'percorso-vecchio')
    expect(readPendingDogDeletions()).toEqual([{ id: 'scheda-nuova', visitIds: ['f1'], sourceDocId: 'percorso-vecchio' }])
    expect(dogHiddenNow('scheda-nuova')).toBe(true)
  })

  it('il formato vecchio delle cancellazioni in sospeso si legge senza visite', () => {
    localStorage.setItem(PENDING_DELETE_KEY, JSON.stringify(['rex']))
    expect(readPendingDogDeletions()).toEqual([{ id: 'rex', visitIds: [] }])
  })
})
