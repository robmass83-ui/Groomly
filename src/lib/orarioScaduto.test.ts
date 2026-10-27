import { describe, expect, it } from 'vitest'
import { visiteDaProgrammare, visitaDaAvvisare } from './orarioScaduto'

describe('orario scaduto', () => {
  it('avvisa solo una visita ancora programmata la cui fine è passata', () => {
    const ora = new Date('2026-10-27T11:05:00+01:00')
    const visite = [
      { id: 'a', nome: 'Fido', status: 'programmato', fine: new Date('2026-10-27T11:00:00+01:00') },
      { id: 'b', nome: 'Luna', status: 'completato', fine: new Date('2026-10-27T11:00:00+01:00') },
    ]
    expect(visitaDaAvvisare(visite, ora, new Set())?.id).toBe('a')
    expect(visitaDaAvvisare(visite, ora, new Set(['a']))).toBeNull()
  })

  it('programma anche la visita che deve ancora finire, non una già avvisata', () => {
    const ora = new Date('2026-10-27T11:05:00+01:00')
    const visite = [
      { id: 'a', nome: 'Fido', status: 'programmato', fine: new Date('2026-10-27T11:00:00+01:00') },
      { id: 'c', nome: 'Rex', status: 'programmato', fine: new Date('2026-10-27T15:00:00+01:00') },
      { id: 'd', nome: 'Z', status: 'programmato', fine: new Date('2026-10-29T11:00:00+01:00') },
    ]
    expect(visiteDaProgrammare(visite, ora, new Set(['a'])).map((visita) => visita.id)).toEqual(['c'])
  })
})
