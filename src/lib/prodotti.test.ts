import { describe, expect, it } from 'vitest'
import { DETTAGLI_VUOTI, arrivatoProdotto, daButtare, daOrdinare, dosaggio, scadenzaProdotto, filtraProdotti, fornitori, leggiQuantita, misuraProdotto, muoviProdotto, prodottoDaDoc, prodottoValido, quantitaProposta, statoProdotto, tacche, totaleProdotto, type Prodotto } from './prodotti'
import { CATALOGO_PRODOTTI, KIT_BASE } from './catalogoProdotti'
import { de } from '../i18n/de'
import { en } from '../i18n/en'
import { es } from '../i18n/es'
import { fr } from '../i18n/fr'
import { it as frasiIt } from '../i18n/it'

const data = new Date('2026-11-05T10:00:00.000Z')

function prodotto(over: Partial<Prodotto> = {}): Prodotto {
  return { id: 'p1', nome: 'Shampoo manto bianco', categoria: 'lavaggio', quantita: 5, unita: 'l', ditta: 'Ditta Alfa', codice: 'SH-120', pezzi: 4, telefono: '', email: '', soglia: 2, inArrivo: 0, ordinatoIl: null, movimenti: [], ...DETTAGLI_VUOTI, createdAt: data, updatedAt: data, ...over }
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
    const elenco = [prodotto(), prodotto({ id: 'p2', nome: 'Profumo talco', categoria: 'finitura', ditta: 'Forniture Beta', codice: 'PR-018' })]
    expect(filtraProdotti(elenco, 'mánto', 'tutti').map((item) => item.id)).toEqual(['p1'])
    expect(filtraProdotti(elenco, 'forniture', 'tutti').map((item) => item.id)).toEqual(['p2'])
    expect(filtraProdotti(elenco, 'pr-018', 'tutti').map((item) => item.id)).toEqual(['p2'])
    expect(filtraProdotti(elenco, '', 'finitura').map((item) => item.id)).toEqual(['p2'])
    expect(filtraProdotti(elenco, 'talco', 'lavaggio')).toEqual([])
  })

  it('un prodotto senza nome o con categoria sconosciuta non vale', () => {
    expect(prodottoValido(prodotto())).toBe(true)
    expect(prodottoValido(prodotto({ nome: '  ' }))).toBe(false)
    expect(prodottoValido(prodotto({ categoria: 'cibo' as Prodotto['categoria'] }))).toBe(false)
    expect(prodottoValido(prodotto({ quantita: -2 }))).toBe(false)
  })

  describe('categorie vecchie', () => {
    const doc = (categoria: unknown, nome = 'Prodotto', extra: Record<string, unknown> = {}) => prodottoDaDoc('a', { nome, categoria, quantita: 5, unita: 'l', ditta: '', codice: '', createdAt: data.getTime(), updatedAt: data.getTime(), ...extra })

    it.each([['shampoo', 'lavaggio'], ['balsami', 'lavaggio'], ['profumi', 'finitura'], ['cura', 'cura'], ['altro', 'pulizia']])('%s diventa %s', (vecchia, nuova) => {
      expect(doc(vecchia)?.categoria).toBe(nuova)
    })

    it.each(['Disinfettante per attrezzi', 'Tool disinfectant', 'Desinfectante para utensilios', 'Désinfectant pour outils', 'Werkzeugdesinfektion'])('%s nato dal catalogo va in pulizia', (nome) => {
      expect(doc('cura', nome)?.categoria).toBe('pulizia')
    })

    it.each(['Lame per tosatrice', 'Olio per tosatrice', 'Spray refrigerante lame', 'Clipper oil', 'Scherköpfe', 'Spray refroidissant pour lames'])('%s nato dal catalogo va in macchinette', (nome) => {
      expect(doc('altro', nome)?.categoria).toBe('macchinette')
    })

    it('un nome diverso dal catalogo non sposta nulla', () => {
      expect(doc('altro', 'Lame per tosatrice n. 10')?.categoria).toBe('pulizia')
      expect(doc('cura', 'Lame per tosatrice')?.categoria).toBe('cura')
    })

    it('un prodotto già nel formato nuovo resta dove è stato messo', () => {
      expect(doc('cura', 'Disinfettante per attrezzi', { uso: 'salone' })?.categoria).toBe('cura')
    })

    it('una categoria sconosciuta o assente non fa sparire il prodotto', () => {
      expect(doc('cibo')?.categoria).toBe('varie')
      expect(doc(undefined)?.categoria).toBe('varie')
      expect(doc('constructor')?.categoria).toBe('varie')
      expect(doc('vendita')?.categoria).toBe('varie')
    })

    it('una unità sconosciuta non fa sparire il prodotto', () => {
      expect(doc('shampoo', 'Prodotto', { unita: 'kg' })?.unita).toBe('l')
    })

    it('le chiavi nuove restano come sono', () => {
      for (const categoria of ['lavaggio', 'finitura', 'cura', 'macchinette', 'pulizia', 'tocchi', 'varie']) expect(doc(categoria)?.categoria).toBe(categoria)
    })
  })

  it('legge le date sia dal cloud sia dalla copia locale', () => {
    const base = { nome: 'Balsamo', categoria: 'lavaggio', quantita: null, unita: 'ml', ditta: '', codice: '' }
    expect(prodottoDaDoc('a', { ...base, createdAt: data.getTime(), updatedAt: data.getTime() })?.createdAt).toEqual(data)
    expect(prodottoDaDoc('a', { ...base, createdAt: data.toISOString(), updatedAt: data.toISOString() })?.updatedAt).toEqual(data)
    expect(prodottoDaDoc('a', { ...base, nome: '' })).toBeNull()
  })

  it('i prodotti salvati prima dei pezzi contano uno, senza avviso', () => {
    const vecchio = prodottoDaDoc('a', { nome: 'Balsamo', categoria: 'lavaggio', quantita: 5, unita: 'l', ditta: '', codice: '', createdAt: data.getTime(), updatedAt: data.getTime() })
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
    expect(fornitori(elenco)).toEqual([{ nome: 'Alfa', telefono: '333', email: '', giorniConsegna: null }])
  })

  it('i giorni di consegna valgono per il fornitore', () => {
    const elenco = [prodotto({ ditta: 'Alfa' }), prodotto({ id: 'p2', ditta: 'alfa', giorniConsegna: 4 })]
    expect(fornitori(elenco)[0].giorniConsegna).toBe(4)
  })

  describe('campi nuovi', () => {
    const vecchio = { nome: 'Shampoo', categoria: 'shampoo', quantita: 5, unita: 'l', ditta: '', codice: '', createdAt: data.getTime(), updatedAt: data.getTime() }

    it('un documento vecchio si legge con i campi vuoti', () => {
      expect(prodottoDaDoc('a', vecchio)).toMatchObject(DETTAGLI_VUOTI)
    })

    it('legge i campi salvati', () => {
      const salvato = { uso: 'vendita', diluizione: 10, apertoIl: 5, mesiDopoApertura: 12, costo: 18.5, prezzoVendita: 25, mlPerCane: { piccola: 15, media: 30, grande: 50 }, giorniConsegna: 3, confrontoIl: 9 }
      expect(prodottoDaDoc('a', { ...vecchio, ...salvato })).toMatchObject(salvato)
    })

    it('un campo storto vale vuoto e non fa sparire il prodotto', () => {
      const letto = prodottoDaDoc('a', { ...vecchio, uso: 'boh', diluizione: 'tanta', costo: -3, mesiDopoApertura: 1.5, mlPerCane: { piccola: 1 }, apertoIl: 'ieri' })
      expect(letto).toMatchObject(DETTAGLI_VUOTI)
    })

    it('la diluizione dice quanto prodotto e quanta acqua per un litro', () => {
      expect(dosaggio(10)).toEqual({ prodotto: 91, acqua: 909 })
      expect(dosaggio(1)).toEqual({ prodotto: 500, acqua: 500 })
    })

    it('togliere un pezzo azzera l’apertura, caricarne no', () => {
      const aperto = prodotto({ apertoIl: 123 })
      expect(muoviProdotto(aperto, -1, data).apertoIl).toBeNull()
      expect(muoviProdotto(aperto, 2, data).apertoIl).toBe(123)
      expect(arrivatoProdotto({ ...aperto, inArrivo: 2 }, data).apertoIl).toBe(123)
    })
  })

  describe('salone e vendita', () => {
    const elenco = [prodotto({ id: 's' }), prodotto({ id: 'v', uso: 'vendita' }), prodotto({ id: 'f', uso: 'vendita', pezzi: 0 }), prodotto({ id: 'o', pezzi: 1 })]

    it('Vendita mostra solo uso vendita, le categorie solo il salone', () => {
      expect(filtraProdotti(elenco, '', 'vendita').map((item) => item.id)).toEqual(['v', 'f'])
      expect(filtraProdotti(elenco, '', 'lavaggio').map((item) => item.id)).toEqual(['s', 'o'])
    })

    it('Tutti e Da ordinare li mostrano entrambi', () => {
      expect(filtraProdotti(elenco, '', 'tutti')).toHaveLength(4)
      expect(filtraProdotti(elenco, '', 'daOrdinare').map((item) => item.id)).toEqual(['f', 'o'])
      expect(daOrdinare(elenco).map((item) => item.id)).toEqual(['f', 'o'])
    })

    it('la stima aggiunge prodotti a Da ordinare senza toccare gli altri', () => {
      expect(daOrdinare(elenco, new Set(['s'])).map((item) => item.id)).toEqual(['s', 'f', 'o'])
      expect(filtraProdotti(elenco, '', 'daOrdinare', new Set(['s'])).map((item) => item.id)).toEqual(['s', 'f', 'o'])
    })
  })

  describe('scadenze', () => {
    const aperto = new Date(2026, 9, 3).getTime()

    it('somma i mesi alla data di apertura', () => {
      expect(scadenzaProdotto(prodotto({ apertoIl: aperto, mesiDopoApertura: 6 }))).toEqual(new Date(2027, 3, 3))
    })

    it('a fine mese resta nel mese giusto', () => {
      expect(scadenzaProdotto(prodotto({ apertoIl: new Date(2027, 0, 31).getTime(), mesiDopoApertura: 1 }))).toEqual(new Date(2027, 1, 28))
    })

    it('senza data o senza mesi non scade', () => {
      expect(scadenzaProdotto(prodotto({ apertoIl: aperto }))).toBeNull()
      expect(scadenzaProdotto(prodotto({ mesiDopoApertura: 12 }))).toBeNull()
      expect(daButtare(prodotto({ apertoIl: 1 }), new Date(2030, 0, 1))).toBe(false)
    })

    it('è da buttare solo a tempo passato', () => {
      const elenco = prodotto({ apertoIl: aperto, mesiDopoApertura: 6 })
      expect(daButtare(elenco, new Date(2027, 3, 2))).toBe(false)
      expect(daButtare(elenco, new Date(2027, 3, 3))).toBe(true)
      expect(filtraProdotti([elenco], '', 'daButtare', new Set(), new Date(2027, 3, 3))).toHaveLength(1)
    })
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

  it('il kit base ha le 14 voci del piano, in tutte le lingue c’è ogni voce', () => {
    expect(KIT_BASE).toHaveLength(14)
    for (const catalogo of [frasiIt, en, es, fr, de]) for (const voce of CATALOGO_PRODOTTI) expect(catalogo[voce.frase]).toBeTruthy()
  })

  it('le voci unite non si propongono più e le frasi sono sparite', () => {
    const tolte = ['catShNero', 'catShRosso', 'catShDuro', 'catShIdratante', 'catShLungo', 'catBaIdratante', 'catBaLungo', 'catMaNutriente', 'catMaRistrutturante', 'catBaOlio', 'catPrTalco', 'catPrFiorito', 'catPrAgrumi', 'catPrFresco', 'catPrCuccioli', 'catSpOdore', 'catCuZampe', 'catAlAsciugamani']
    for (const frase of tolte) {
      expect(CATALOGO_PRODOTTI.some((voce) => voce.frase === frase)).toBe(false)
      expect(frase in frasiIt).toBe(false)
    }
  })

  it('un prodotto salvato con una voce tolta si legge ancora', () => {
    expect(prodottoDaDoc('a', { nome: 'Profumo talco', categoria: 'profumi', quantita: 250, unita: 'ml', ditta: '', codice: '', createdAt: data.getTime(), updatedAt: data.getTime() })).toMatchObject({ nome: 'Profumo talco', categoria: 'finitura' })
  })

  it('diluizione solo in lavaggio, consumo solo su lavaggio e finitura con formato', () => {
    for (const voce of CATALOGO_PRODOTTI) {
      if (voce.diluizione !== null) expect(voce.categoria).toBe('lavaggio')
      if (voce.mlPerCane !== null) {
        expect(['lavaggio', 'finitura']).toContain(voce.categoria)
        expect(voce.quantita).not.toBeNull()
      }
    }
    expect(CATALOGO_PRODOTTI.find((voce) => voce.frase === 'catShNeutro')).toMatchObject({ diluizione: 10, mlPerCane: { piccola: 15, media: 30, grande: 50 } })
    expect(CATALOGO_PRODOTTI.find((voce) => voce.frase === 'catBaDistricante')?.mlPerCane).toEqual({ piccola: 10, media: 20, grande: 35 })
    expect(CATALOGO_PRODOTTI.find((voce) => voce.frase === 'catPrProfumo')?.mlPerCane).toEqual({ piccola: 2, media: 3, grande: 5 })
    expect(CATALOGO_PRODOTTI.find((voce) => voce.frase === 'catSpNodi')?.mlPerCane).toEqual({ piccola: 5, media: 10, grande: 20 })
  })
})
