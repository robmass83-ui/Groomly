import type { Dog, Service } from '../types/models'
import type { Breed, PriceItem, PriceSheet } from '../types/priceSheet'
import { normalizeSearch } from './dogList'

export const normalizzaNome = normalizeSearch

// Nome (normalizzato) di una riga del foglio -> nome (normalizzato) del servizio che la copre.
const SINONIMI: Record<string, string> = {
  'bagno + tosatura': 'bagno + taglio',
  'taglio': 'taglio / tosatura',
  'tosatura': 'taglio / tosatura',
}

function attivoPerId(id: string, servizi: Service[]): boolean {
  return servizi.some((servizio) => servizio.id === id && servizio.active)
}

export function servizioPerNome(nomeRiga: string, servizi: Service[]): string | null {
  const nome = normalizzaNome(nomeRiga)
  const cercato = SINONIMI[nome] ?? nome
  const attivi = servizi.filter((servizio) => servizio.active)
  return attivi.find((servizio) => normalizzaNome(servizio.name) === cercato)?.id
    ?? attivi.find((servizio) => normalizzaNome(servizio.name) === nome)?.id
    ?? null
}

export function servizioDellaRiga(riga: PriceItem, servizi: Service[]): string | null {
  if (riga.servizioId === '') return null
  if (riga.servizioId !== undefined) return attivoPerId(riga.servizioId, servizi) ? riga.servizioId : null
  return servizioPerNome(riga.nome, servizi)
}

export function razzaDelCane(breed: string, listino: PriceSheet | undefined): Breed | null {
  const cercata = normalizzaNome(breed)
  if (cercata === '' || !listino) return null
  return listino.razze.find((razza) => razza.nome.split('/').some((parte) => normalizzaNome(parte) === cercata)) ?? null
}

export function prezzoDalListino(
  dog: Dog,
  service: Service,
  listino: PriceSheet | undefined,
  servizi: Service[],
): { prezzo: number; razza: string } | null {
  const razza = razzaDelCane(dog.breed, listino)
  if (!razza) return null
  const riga = razza.voci.find((voce) => (
    voce.tipo !== 'valutazione' && typeof voce.prezzo === 'number' && servizioDellaRiga(voce, servizi) === service.id
  ))
  return riga && typeof riga.prezzo === 'number' ? { prezzo: riga.prezzo, razza: razza.nome } : null
}
