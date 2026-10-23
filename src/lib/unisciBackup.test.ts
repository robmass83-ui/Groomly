import { describe, expect, it } from 'vitest'
import { unisciRegistri } from './unisciBackup'

describe('unisci backup', () => {
  it('aggiunge ciò che manca, aggiorna solo se è più nuovo e non cancella', () => {
    expect(unisciRegistri(
      {
        resta: { name: 'Qui', updatedAt: '2026-10-20T00:00:00.000Z' },
        vecchio: { name: 'Vecchio', updatedAt: '2026-10-01T00:00:00.000Z' },
      },
      {
        vecchio: { name: 'Nuovo', updatedAt: '2026-10-22T00:00:00.000Z' },
        aggiunto: { name: 'Extra', updatedAt: '2026-10-22T00:00:00.000Z' },
        senzaData: { name: 'No' },
      },
    )).toEqual({
      resta: { name: 'Qui', updatedAt: '2026-10-20T00:00:00.000Z' },
      vecchio: { name: 'Nuovo', updatedAt: '2026-10-22T00:00:00.000Z' },
      aggiunto: { name: 'Extra', updatedAt: '2026-10-22T00:00:00.000Z' },
      senzaData: { name: 'No' },
    })
  })
})
