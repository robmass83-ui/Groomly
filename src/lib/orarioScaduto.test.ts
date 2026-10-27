import { describe, expect, it } from 'vitest'
import { visitaDaAvvisare } from './orarioScaduto'

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
})
