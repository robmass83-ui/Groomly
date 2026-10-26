import { describe, expect, it } from 'vitest'
import { pianoCompleanni } from './compleanno'

describe('compleanni', () => {
  it('alle 9 del giorno, e tra un minuto se la giornata è già aperta', () => {
    const prima = new Date(2026, 9, 26, 8, 0, 0, 0)
    const piano = pianoCompleanni([{ id: 'nanni', name: 'Nanni', birthMonth: 10, birthDay: 26 }], prima)
    expect(piano?.at).toEqual(new Date(2026, 9, 26, 9, 0, 0, 0))
    expect(piano?.subito).toBe(false)
    expect(piano?.path).toBe('/animali/nanni')

    const dopo = new Date(2026, 9, 26, 14, 0, 0, 0)
    const tardi = pianoCompleanni([{ id: 'nanni', name: 'Nanni', birthMonth: 10, birthDay: 26 }], dopo)
    expect(tardi?.subito).toBe(true)
    expect(tardi?.at.getTime()).toBe(dopo.getTime() + 60_000)

    const domani = pianoCompleanni([{ id: 'nanni', name: 'Nanni', birthMonth: 10, birthDay: 26 }], new Date(2026, 9, 27, 10, 0, 0, 0))
    expect(domani?.at).toEqual(new Date(2027, 9, 26, 9, 0, 0, 0))
  })

  it('senza giorno e mese non prepara nessun avviso', () => {
    expect(pianoCompleanni([{ id: 'nanni', name: 'Nanni', birthMonth: 10 }], new Date(2026, 9, 26, 8, 0, 0, 0))).toBeNull()
  })
})
