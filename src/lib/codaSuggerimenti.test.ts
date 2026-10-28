// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import {
  categorieConConteggio,
  filtraGruppi,
  raggruppaSuggerimenti,
  righeEsportazione,
  saloniDelGruppo,
  type NotaSuggerimento,
} from './codaSuggerimenti'
import { leggiRevisione, scriviRevisione } from './revisioneSuggerimenti'

const NOTE: NotaSuggerimento[] = [
  { id: '1', email: 'a@a.it', categoria: 'agenda', testo: 'Orari più tardi', salonId: 'ada', creato: 200 },
  { id: '2', email: 'b@b.it', categoria: 'agenda', testo: '  orari   più   tardi ', salonId: 'leo', creato: 100 },
  { id: '3', email: 'c@c.it', categoria: 'bug', testo: 'Orari più tardi', salonId: 'ada', creato: 300 },
]

describe('coda suggerimenti', () => {
  it('unisce lo stesso testo e tiene separate le categorie', () => {
    const gruppi = raggruppaSuggerimenti(NOTE)
    expect(gruppi.map((gruppo) => gruppo.categoria)).toEqual(['agenda', 'bug'])
    expect(gruppi[0].testo).toBe('Orari più tardi')
    expect(gruppi[0].voci.map((voce) => voce.id)).toEqual(['1', '2'])
    expect(saloniDelGruppo(gruppi[0])).toEqual(['ada', 'leo'])
    expect(categorieConConteggio(NOTE).map((voce) => voce.categoria)).toEqual(['agenda', 'bug'])
  })

  it('mette gli interessanti prima dei visti e ripete il testo per ogni persona', () => {
    const gruppi = raggruppaSuggerimenti(NOTE)
    const segni = { [gruppi[0].chiave]: 'visto' as const, [gruppi[1].chiave]: 'interessante' as const }
    expect(filtraGruppi(gruppi, 'visto', segni)).toHaveLength(1)
    const righe = righeEsportazione(gruppi, segni)
    expect(righe.map((riga) => riga.stato)).toEqual(['interessante', 'visto', 'visto'])
    expect(righe[1].testo).toBe(righe[2].testo)
    expect(righe[1].volte).toBe(2)
    expect(righe.map((riga) => riga.email)).toEqual(['c@c.it', 'a@a.it', 'b@b.it'])
  })

  it('tiene i segni sul telefono e scarta i valori sconosciuti', () => {
    scriviRevisione({ a: 'interessante', b: 'visto' })
    expect(leggiRevisione()).toEqual({ a: 'interessante', b: 'visto' })
    localStorage.setItem('groomly.revisioneSuggerimenti', '{"a":"no","b":"visto"}')
    expect(leggiRevisione()).toEqual({ b: 'visto' })
    localStorage.setItem('groomly.revisioneSuggerimenti', 'nope')
    expect(leggiRevisione()).toEqual({})
  })
})
