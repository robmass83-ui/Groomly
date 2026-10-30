import { describe, expect, it } from 'vitest'
import { dividiAvvisi, lettiDopoApertura, nonLetti, tipoAvviso, type AvvisoSistema } from './avvisiSistema'

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
