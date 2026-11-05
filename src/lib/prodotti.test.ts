import { describe, expect, it } from 'vitest'
import { ditteProposte, filtraProdotti, leggiQuantita, misuraProdotto, prodottoDaDoc, prodottoValido, type Prodotto } from './prodotti'

const data = new Date('2026-11-05T10:00:00.000Z')

function prodotto(over: Partial<Prodotto> = {}): Prodotto {
  return { id: 'p1', nome: 'Shampoo manto bianco', categoria: 'shampoo', quantita: 5, unita: 'l', ditta: 'Ditta Alfa', codice: 'SH-120', createdAt: data, updatedAt: data, ...over }
}

describe('prodotti', () => {
  it('la quantità accetta la virgola e il campo vuoto, rifiuta il resto', () => {
    expect(leggiQuantita('0,5')).toBe(0.5)
    expect(leggiQuantita(' 5 ')).toBe(5)
    expect(leggiQuantita('')).toBeNull()
    expect(leggiQuantita('zero')).toBe('errore')
    expect(leggiQuantita('0')).toBe('errore')
    expect(leggiQuantita('-1')).toBe('errore')
  })

  it('la misura segue la lingua e sparisce senza quantità', () => {
    expect(misuraProdotto(prodotto({ quantita: 0.5 }), 'it')).toBe('0,5 L')
    expect(misuraProdotto(prodotto({ quantita: 0.5 }), 'en')).toBe('0.5 L')
    expect(misuraProdotto(prodotto({ quantita: 250, unita: 'ml' }), 'it')).toBe('250 ml')
    expect(misuraProdotto(prodotto({ quantita: null }), 'it')).toBe('')
  })

  it('la ricerca guarda nome, ditta e codice, senza badare ad accenti e maiuscole', () => {
    const elenco = [prodotto(), prodotto({ id: 'p2', nome: 'Profumo talco', categoria: 'profumi', ditta: 'Forniture Beta', codice: 'PR-018' })]
    expect(filtraProdotti(elenco, 'mánto', 'tutti').map((item) => item.id)).toEqual(['p1'])
    expect(filtraProdotti(elenco, 'forniture', 'tutti').map((item) => item.id)).toEqual(['p2'])
    expect(filtraProdotti(elenco, 'pr-018', 'tutti').map((item) => item.id)).toEqual(['p2'])
    expect(filtraProdotti(elenco, '', 'profumi').map((item) => item.id)).toEqual(['p2'])
    expect(filtraProdotti(elenco, 'talco', 'shampoo')).toEqual([])
  })

  it('propone ogni ditta una volta sola e non quella già scritta per intero', () => {
    const elenco = [prodotto(), prodotto({ id: 'p2', ditta: 'ditta alfa' }), prodotto({ id: 'p3', ditta: 'Ditta Gamma' }), prodotto({ id: 'p4', ditta: '' })]
    expect(ditteProposte(elenco, 'ditta')).toEqual(['Ditta Alfa', 'Ditta Gamma'])
    expect(ditteProposte(elenco, 'DITTA ALFA')).toEqual([])
    expect(ditteProposte(elenco, '')).toEqual(['Ditta Alfa', 'Ditta Gamma'])
  })

  it('un prodotto senza nome o con categoria sconosciuta non vale', () => {
    expect(prodottoValido(prodotto())).toBe(true)
    expect(prodottoValido(prodotto({ nome: '  ' }))).toBe(false)
    expect(prodottoValido(prodotto({ categoria: 'cibo' as Prodotto['categoria'] }))).toBe(false)
    expect(prodottoValido(prodotto({ quantita: -2 }))).toBe(false)
  })

  it('legge le date sia dal cloud sia dalla copia locale', () => {
    const base = { nome: 'Balsamo', categoria: 'balsami', quantita: null, unita: 'ml', ditta: '', codice: '' }
    expect(prodottoDaDoc('a', { ...base, createdAt: data.getTime(), updatedAt: data.getTime() })?.createdAt).toEqual(data)
    expect(prodottoDaDoc('a', { ...base, createdAt: data.toISOString(), updatedAt: data.toISOString() })?.updatedAt).toEqual(data)
    expect(prodottoDaDoc('a', { ...base, nome: '' })).toBeNull()
  })
})
