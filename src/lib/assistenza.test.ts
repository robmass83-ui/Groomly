import { describe, expect, it } from 'vitest'
import { chiaveAssistenza, contaNuove, statoRichiesta, unisciRichieste } from './assistenza'

const TAGLIO = '2026-11-05T00:00:00.000Z'
const sugg = (id: string, creato: number) => ({ id, email: 'a@b.it', categoria: 'bug', testo: `testo ${id}`, salonId: 's1', creato })
const feed = (id: string, creatoIl: string) => ({ id, salonId: 's2', creatoIl, nonVa: '', manca: 'Il meteo' })

describe('statoRichiesta', () => {
  it('senza documento e prima del taglio vale risolto', () => {
    expect(statoRichiesta(undefined, '2026-11-04T10:00:00.000Z', TAGLIO)).toBe('risolto')
  })

  it('senza documento e dopo il taglio vale nuovo', () => {
    expect(statoRichiesta(undefined, '2026-11-06T10:00:00.000Z', TAGLIO)).toBe('nuovo')
  })

  it('senza taglio tutto è nuovo', () => {
    expect(statoRichiesta(undefined, '2026-11-04T10:00:00.000Z', null)).toBe('nuovo')
  })

  it('il documento vince sulla data', () => {
    expect(statoRichiesta({ stato: 'in-corso', risposte: [] }, '2026-11-04T10:00:00.000Z', TAGLIO)).toBe('in-corso')
  })
})

describe('unisciRichieste', () => {
  it('mette insieme suggerimenti e feedback, dal più recente, con risposte e stato', () => {
    const risposta = { testo: 'Grazie', quando: '2026-11-06T12:00:00.000Z', email: null }
    const richieste = unisciRichieste(
      [sugg('a', Date.parse('2026-11-06T09:00:00.000Z')), sugg('b', Date.parse('2026-11-01T09:00:00.000Z'))],
      [feed('f', '2026-11-07T09:00:00.000Z')],
      { [chiaveAssistenza('suggerimento', 'a')]: { stato: 'risolto', risposte: [risposta] } },
      TAGLIO,
    )
    expect(richieste.map((r) => [r.chiave, r.stato])).toEqual([
      ['feedback_f', 'nuovo'],
      ['suggerimento_a', 'risolto'],
      ['suggerimento_b', 'risolto'],
    ])
    expect(richieste[1]?.risposte).toEqual([risposta])
    expect(richieste[0]?.salonId).toBe('s2')
    expect(richieste[0]?.testo).toBe('Il meteo')
  })

  it('un suggerimento senza data non rompe l’ordine e non è nuovo', () => {
    const [r] = unisciRichieste([{ ...sugg('a', 0), creato: null }], [], {}, TAGLIO)
    expect(r?.stato).toBe('risolto')
  })
})

describe('contaNuove', () => {
  it('conta solo le richieste nuove', () => {
    const richieste = unisciRichieste([sugg('a', Date.parse('2026-11-06T09:00:00.000Z')), sugg('b', Date.parse('2026-11-01T09:00:00.000Z'))], [], {}, TAGLIO)
    expect(contaNuove(richieste)).toBe(1)
  })
})
