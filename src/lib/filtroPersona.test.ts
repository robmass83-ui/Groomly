// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { filtraPerPersona, iniziali, leggiFiltroPersona, personaDellaVisita, ricordaFiltroPersona } from './filtroPersona'
import type { SalonMember } from './salonRoster'

const anna: SalonMember = { uid: 'a1', email: 'anna@s.it', role: 'collaboratore', firstName: 'Anna', lastName: 'Rossi', status: 'attivo' }

describe('iniziali', () => {
  it('prende le prime lettere di nome e cognome in maiuscolo', () => {
    expect(iniziali('Anna Rossi')).toBe('AR')
    expect(iniziali('anna  maria rossi')).toBe('AM')
    expect(iniziali('Anna')).toBe('A')
    expect(iniziali('  ')).toBe('')
    expect(iniziali('')).toBe('')
  })
})

describe('filtraPerPersona', () => {
  const items = [{ id: 1, assigneeUid: 'a1' }, { id: 2, assigneeUid: 't1' }, { id: 3 }, { id: 4, assigneeUid: null }]

  it('null lascia tutte le visite', () => {
    expect(filtraPerPersona(items, null, 't1')).toHaveLength(4)
  })

  it('con un uid tiene solo le sue; la visita senza assegnatario è del titolare', () => {
    expect(filtraPerPersona(items, 'a1', 't1').map((item) => item.id)).toEqual([1])
    expect(filtraPerPersona(items, 't1', 't1').map((item) => item.id)).toEqual([2, 3, 4])
  })
})

describe('personaDellaVisita', () => {
  it('trova la persona assegnata, il titolare se manca l’assegnatario, nessuno se sconosciuta', () => {
    const titolare: SalonMember = { ...anna, uid: 't1', role: 'titolare', firstName: 'Tina', lastName: 'Verdi' }
    expect(personaDellaVisita({ assigneeUid: 'a1' }, [titolare, anna], 't1')).toBe(anna)
    expect(personaDellaVisita({}, [titolare, anna], 't1')).toBe(titolare)
    expect(personaDellaVisita({ assigneeUid: 'zz' }, [titolare, anna], 't1')).toBeUndefined()
  })
})

describe('filtro ricordato', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('si scrive e si rilegge per salone', () => {
    expect(leggiFiltroPersona('s1')).toBeNull()
    ricordaFiltroPersona('s1', 'a1')
    expect(leggiFiltroPersona('s1')).toBe('a1')
    expect(leggiFiltroPersona('s2')).toBeNull()
    ricordaFiltroPersona('s1', null)
    expect(leggiFiltroPersona('s1')).toBeNull()
  })

  it('se localStorage lancia, legge null e non scrive', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('no') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('no') })
    expect(leggiFiltroPersona('s1')).toBeNull()
    expect(() => ricordaFiltroPersona('s1', 'a1')).not.toThrow()
  })
})
