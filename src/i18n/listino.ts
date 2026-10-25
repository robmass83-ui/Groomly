import type { Lingua } from './lingua'
import { nomeServizioVisibile } from './servizioVisibile'

const TESTI = {
  it: {
    tagliaPiccola: 'Taglia piccola',
    tagliaMedia: 'Taglia media',
    tagliaGrande: 'Taglia grande',
    segue: 'LISTINO · segue',
    bagno: 'BAGNO + TOSATURA',
    da: 'da ',
    titolo: 'Listino',
    prezzi: 'Listino prezzi',
    tipo: 'Tipo ',
    extra: 'SERVIZI EXTRA',
    daPartire: 'a partire da ',
    valutazione: 'su valutazione',
  },
  en: {
    tagliaPiccola: 'Small size',
    tagliaMedia: 'Medium size',
    tagliaGrande: 'Large size',
    segue: 'PRICE LIST · continued',
    bagno: 'BATH AND TRIM',
    da: 'from ',
    titolo: 'Price list',
    prezzi: 'Price list',
    tipo: 'Type ',
    extra: 'EXTRA SERVICES',
    daPartire: 'from ',
    valutazione: 'on assessment',
  },
  es: {
    tagliaPiccola: 'Talla pequeña',
    tagliaMedia: 'Talla mediana',
    tagliaGrande: 'Talla grande',
    segue: 'LISTA · sigue',
    bagno: 'BAÑO Y CORTE',
    da: 'desde ',
    titolo: 'Lista de precios',
    prezzi: 'Lista de precios',
    tipo: 'Tipo ',
    extra: 'SERVICIOS EXTRA',
    daPartire: 'desde ',
    valutazione: 'bajo valoración',
  },
} as const

export function etichetteListino(lingua: Lingua) {
  return TESTI[lingua]
}

export function nomeVoceListino(lingua: Lingua, nome: string): string {
  return nomeServizioVisibile(lingua, nome)
}
