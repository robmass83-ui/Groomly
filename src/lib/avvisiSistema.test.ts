import { describe, expect, it } from 'vitest'
import { dividiAvvisi, lettiDopoApertura, nonLetti, testoPerLingua, tipoAvviso, traduzioniDi, unisciAvvisi, type AvvisoSistema } from './avvisiSistema'

const avviso = (id: string, creato: number, tipo: AvvisoSistema['tipo'] = 'novita'): AvvisoSistema => ({ id, tipo, titolo: id, testo: '', creato })

describe('avvisi di sistema', () => {
  const lista = [avviso('vecchio', 100), avviso('prezzi', 300, 'importante'), avviso('versione', 200, 'aggiornamento'), avviso('letto', 50, 'importante')]

  it('conta solo gli avvisi arrivati dopo l’ultima lettura', () => {
    expect(nonLetti(lista, 0)).toBe(4)
    expect(nonLetti(lista, 150)).toBe(2)
    expect(nonLetti(lista, 300)).toBe(0)
  })

  it('mette in alto solo gli importanti da leggere e ordina dal più nuovo', () => {
    const { evidenza, altri } = dividiAvvisi(lista, 60)
    expect(evidenza.map((item) => item.id)).toEqual(['prezzi'])
    expect(altri.map((item) => item.id)).toEqual(['versione', 'vecchio', 'letto'])
  })

  it('dopo l’apertura il segno di lettura arriva all’avviso più nuovo', () => {
    expect(lettiDopoApertura(lista, 0)).toBe(300)
    expect(lettiDopoApertura([], 80)).toBe(80)
  })

  it('un tipo sconosciuto diventa novità', () => {
    expect(tipoAvviso('importante')).toBe('importante')
    expect(tipoAvviso('boh')).toBe('novita')
  })
})

describe('avvisi in più lingue', () => {
  const avviso = { titolo: 'Ciao', testo: 'Testo', traduzioni: { de: { titolo: 'Hallo', testo: 'Text' }, fr: { titolo: '', testo: 'Texte' } } }

  it('sceglie la traduzione della lingua', () => {
    expect(testoPerLingua(avviso, 'de')).toEqual({ titolo: 'Hallo', testo: 'Text' })
  })

  it('senza traduzione resta l’italiano', () => {
    expect(testoPerLingua(avviso, 'es')).toEqual({ titolo: 'Ciao', testo: 'Testo' })
    expect(testoPerLingua({ titolo: 'Ciao', testo: 'Testo' }, 'de')).toEqual({ titolo: 'Ciao', testo: 'Testo' })
  })

  it('una traduzione senza titolo non vale', () => {
    expect(testoPerLingua(avviso, 'fr')).toEqual({ titolo: 'Ciao', testo: 'Testo' })
  })
})

describe('traduzioniDi', () => {
  it('tiene solo lingue note con titolo e testo stringhe', () => {
    expect(traduzioniDi({ de: { titolo: 'Hallo', testo: 'Text' }, xx: { titolo: 'a', testo: 'b' }, fr: { titolo: 3 } })).toEqual({ de: { titolo: 'Hallo', testo: 'Text' } })
    expect(traduzioniDi(null)).toBeUndefined()
  })
})

describe('unisciAvvisi', () => {
  const a = (id: string, creato: number) => ({ id, tipo: 'novita' as const, titolo: id, testo: '', creato })

  it('mette insieme globali e dell’account, dal più nuovo', () => {
    expect(unisciAvvisi([a('g1', 10), a('g2', 30)], [a('p1', 20)]).map((x) => x.id)).toEqual(['g2', 'p1', 'g1'])
  })

  it('il conto dei non letti vale per entrambi', () => {
    expect(nonLetti(unisciAvvisi([a('g1', 10)], [a('p1', 20)]), 5)).toBe(2)
  })
})
