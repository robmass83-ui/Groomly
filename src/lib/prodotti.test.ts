import { describe, expect, it } from 'vitest'
import { arrivatoProdotto, daOrdinare, filtraProdotti, fornitori, leggiQuantita, misuraProdotto, muoviProdotto, prodottoDaDoc, prodottoValido, quantitaProposta, statoProdotto, tacche, totaleProdotto, type Prodotto } from './prodotti'
import { CATALOGO_PRODOTTI, KIT_BASE } from './catalogoProdotti'
import { it as frasiIt } from '../i18n/it'

const data = new Date('2026-11-05T10:00:00.000Z')

function prodotto(over: Partial<Prodotto> = {}): Prodotto {
  return { id: 'p1', nome: 'Shampoo manto bianco', categoria: 'shampoo', quantita: 5, unita: 'l', ditta: 'Ditta Alfa', codice: 'SH-120', pezzi: 4, telefono: '', email: '', soglia: 2, inArrivo: 0, ordinatoIl: null, movimenti: [], createdAt: data, updatedAt: data, ...over }
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

  it('i prodotti salvati prima dei pezzi contano uno, senza avviso', () => {
    const vecchio = prodottoDaDoc('a', { nome: 'Balsamo', categoria: 'balsami', quantita: 5, unita: 'l', ditta: '', codice: '', createdAt: data.getTime(), updatedAt: data.getTime() })
    expect(vecchio).toMatchObject({ pezzi: 1, soglia: 0, inArrivo: 0, ordinatoIl: null, movimenti: [], telefono: '', email: '' })
    expect(statoProdotto(vecchio as Prodotto)).toBe('ok')
  })

  it('lo stato guarda i pezzi e il minimo', () => {
    expect(statoProdotto(prodotto({ pezzi: 0 }))).toBe('finito')
    expect(statoProdotto(prodotto({ pezzi: 2, soglia: 2 }))).toBe('ordina')
    expect(statoProdotto(prodotto({ pezzi: 3, soglia: 2 }))).toBe('ok')
    expect(statoProdotto(prodotto({ pezzi: 1, soglia: 0 }))).toBe('ok')
  })

  it('i pezzi sono interi e non negativi', () => {
    expect(prodottoValido(prodotto({ pezzi: 0 }))).toBe(true)
    expect(prodottoValido(prodotto({ pezzi: 1.5 }))).toBe(false)
    expect(prodottoValido(prodotto({ pezzi: -1 }))).toBe(false)
  })

  it('scalare non scende sotto zero e tiene lo storico', () => {
    const adesso = new Date('2026-11-06T10:00:00.000Z')
    const dieci = prodotto({ pezzi: 10 })
    const otto = muoviProdotto(dieci, -2, adesso)
    expect(otto.pezzi).toBe(8)
    expect(otto.movimenti).toEqual([{ at: adesso.getTime(), delta: -2, dopo: 8 }])
    expect(muoviProdotto(prodotto({ pezzi: 1 }), -3, adesso).movimenti[0]).toMatchObject({ delta: -1, dopo: 0 })
    const zero = prodotto({ pezzi: 0 })
    expect(muoviProdotto(zero, -1, adesso)).toBe(zero)
  })

  it('lo storico non cresce all’infinito', () => {
    let attuale = prodotto({ pezzi: 100 })
    for (let volta = 0; volta < 40; volta += 1) attuale = muoviProdotto(attuale, -1, data)
    expect(attuale.movimenti).toHaveLength(30)
  })

  it('quando l’ordine arriva carica i pezzi e chiude l’attesa', () => {
    const arrivato = arrivatoProdotto(prodotto({ pezzi: 1, inArrivo: 6, ordinatoIl: 5 }), data)
    expect(arrivato).toMatchObject({ pezzi: 7, inArrivo: 0, ordinatoIl: null })
  })

  it('da ordinare esclude quello già in arrivo e propone il doppio del minimo', () => {
    const elenco = [prodotto({ id: 'a', pezzi: 1 }), prodotto({ id: 'b', pezzi: 0, inArrivo: 4 }), prodotto({ id: 'c', pezzi: 9 })]
    expect(daOrdinare(elenco).map((item) => item.id)).toEqual(['a'])
    expect(quantitaProposta(prodotto({ pezzi: 1, soglia: 3 }))).toBe(5)
    expect(quantitaProposta(prodotto({ pezzi: 0, soglia: 0 }))).toBe(2)
  })

  it('il totale somma i pezzi e passa ai litri', () => {
    expect(totaleProdotto(prodotto({ pezzi: 8, quantita: 5 }), 'it')).toBe('40 L')
    expect(totaleProdotto(prodotto({ pezzi: 4, quantita: 500, unita: 'ml' }), 'it')).toBe('2 L')
    expect(totaleProdotto(prodotto({ pezzi: 1, quantita: 250, unita: 'ml' }), 'it')).toBe('250 ml')
    expect(totaleProdotto(prodotto({ quantita: null }), 'it')).toBe('')
  })

  it('le tacche si comprimono oltre dieci pezzi', () => {
    expect(tacche(8, 3)).toEqual({ accese: 8, minimo: 2 })
    expect(tacche(20, 10)).toEqual({ accese: 10, minimo: 4 })
    expect(tacche(0, 0)).toEqual({ accese: 0, minimo: null })
  })

  it('un fornitore compare una volta sola con i contatti trovati', () => {
    const elenco = [prodotto({ ditta: 'Alfa' }), prodotto({ id: 'p2', ditta: 'alfa', telefono: '333' }), prodotto({ id: 'p3', ditta: '' })]
    expect(fornitori(elenco)).toEqual([{ nome: 'Alfa', telefono: '333', email: '' }])
  })

  it('il filtro da ordinare prende finiti e sotto il minimo', () => {
    const elenco = [prodotto({ id: 'a', pezzi: 0 }), prodotto({ id: 'b', pezzi: 2 }), prodotto({ id: 'c', pezzi: 3 })]
    expect(filtraProdotti(elenco, '', 'daOrdinare').map((item) => item.id)).toEqual(['a', 'b'])
  })

  it('ogni voce della lista ha il suo nome e il kit usa voci della lista', () => {
    expect(new Set(CATALOGO_PRODOTTI.map((voce) => voce.frase)).size).toBe(CATALOGO_PRODOTTI.length)
    for (const voce of CATALOGO_PRODOTTI) expect(frasiIt[voce.frase]).toBeTruthy()
    for (const frase of KIT_BASE) expect(CATALOGO_PRODOTTI.some((voce) => voce.frase === frase)).toBe(true)
  })
})
