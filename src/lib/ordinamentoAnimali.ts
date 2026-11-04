import type { DogSort } from './dogList'

const KEY = 'groomly.ordinamentoAnimali'
const PREDEFINITO: DogSort = 'alfabetico'

export function leggiOrdinamento(): DogSort {
  try {
    const valore = localStorage.getItem(KEY)
    return valore === 'alfabetico' || valore === 'prossimo' ? valore : PREDEFINITO
  } catch {
    return PREDEFINITO
  }
}

export function salvaOrdinamento(mode: DogSort): void {
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    // memoria del telefono non disponibile: la scelta vale solo per questa sessione
  }
}
