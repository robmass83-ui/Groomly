import { describe, expect, it } from 'vitest'
import { compatibili, confermaAttesa, postoLiberato } from './attesa'

const coda = [
  { id: 'lunga', durataMin: 90, preferenza: 'qualsiasi' as const, arrivato: '2026-10-26T08:00:00.000Z' },
  { id: 'mattina', durataMin: 30, preferenza: 'mattina' as const, arrivato: '2026-10-26T09:00:00.000Z' },
  { id: 'prima', durataMin: 30, preferenza: 'qualsiasi' as const, arrivato: '2026-10-26T07:00:00.000Z' },
]

describe('lista d’attesa', () => {
  it('esclude chi non entra nel buco e chi vuole la mattina alle 16, in ordine di arrivo', () => {
    expect(compatibili(60, '16:00', coda).map((voce) => voce.id)).toEqual(['prima'])
    expect(compatibili(60, '10:00', coda).map((voce) => voce.id)).toEqual(['prima', 'mattina'])
  })

  it('il primo che conferma vince e il secondo è persa; la disdetta libera il posto', () => {
    expect(confermaAttesa(['prima', 'mattina'], 'prima')).toEqual({ vince: 'prima', persi: ['mattina'] })
    expect(confermaAttesa(['prima', 'mattina'], 'mattina')).toEqual({ persa: true })
    expect(postoLiberato({ status: 'disdetto', ora: '10:00', minuti: 60 })).toEqual({ ora: '10:00', minuti: 60 })
    expect(postoLiberato({ status: 'programmato', ora: '10:00', minuti: 60 })).toBeNull()
  })
})
