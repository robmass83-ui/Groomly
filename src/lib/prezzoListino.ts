import { normalizeSearch } from './normalizza'

type Taglia = 'piccola' | 'media' | 'grande'

export type ServizioListino = { id: string; name: string; active: boolean; price: { piccola: number; media: number; grande: number } }
export type VoceListino = { nome: string; tipo?: string; prezzo?: number | null; servizioId?: string }
export type RazzaListino = { nome: string; voci: VoceListino[] }
export type Listino = { razze: RazzaListino[] }
export type CanePrezzo = { breed: string; size: Taglia; servicePrices: { serviceId: string; price?: number }[] }
export type RigaVisita = { serviceId: string; name: string; durationMin: number; price: number }

const normalizzaNome = normalizeSearch

// Nome (normalizzato) di una riga del foglio -> nome (normalizzato) del servizio che la copre.
const SINONIMI: Record<string, string> = {
  'bagno + tosatura': 'bagno + taglio',
  'taglio': 'taglio / tosatura',
  'tosatura': 'taglio / tosatura',
}

function attivoPerId(id: string, servizi: { id: string; active: boolean }[]): boolean {
  return servizi.some((servizio) => servizio.id === id && servizio.active)
}

export function servizioPerNome(nomeRiga: string, servizi: { id: string; name: string; active: boolean }[]): string | null {
  const nome = normalizzaNome(nomeRiga)
  const cercato = SINONIMI[nome] ?? nome
  const attivi = servizi.filter((servizio) => servizio.active)
  return attivi.find((servizio) => normalizzaNome(servizio.name) === cercato)?.id
    ?? attivi.find((servizio) => normalizzaNome(servizio.name) === nome)?.id
    ?? null
}

export function servizioDellaRiga(
  riga: { nome: string; servizioId?: string },
  servizi: { id: string; name: string; active: boolean }[],
): string | null {
  if (riga.servizioId === '') return null
  if (riga.servizioId !== undefined) return attivoPerId(riga.servizioId, servizi) ? riga.servizioId : null
  return servizioPerNome(riga.nome, servizi)
}

export function razzaDelCane<R extends { nome: string }>(breed: string, listino: { razze: R[] } | undefined): R | null {
  const cercata = normalizzaNome(breed)
  if (cercata === '' || !listino) return null
  return listino.razze.find((razza) => razza.nome.split('/').some((parte) => normalizzaNome(parte) === cercata)) ?? null
}

export function prezzoDalListino(
  dog: { breed: string },
  service: { id: string },
  listino: Listino | undefined,
  servizi: { id: string; name: string; active: boolean }[],
): { prezzo: number; razza: string } | null {
  const razza = razzaDelCane(dog.breed, listino)
  if (!razza) return null
  const riga = razza.voci.find((voce) => (
    voce.tipo !== 'valutazione' && typeof voce.prezzo === 'number' && servizioDellaRiga(voce, servizi) === service.id
  ))
  return riga && typeof riga.prezzo === 'number' ? { prezzo: riga.prezzo, razza: razza.nome } : null
}

export function prezziVisita(
  righe: RigaVisita[],
  cane: CanePrezzo,
  servizi: ServizioListino[],
  listino: Listino | undefined,
): RigaVisita[] {
  return righe.map((riga) => {
    const servizio = servizi.find((s) => s.id === riga.serviceId)
    if (!servizio) return riga
    const personale = cane.servicePrices.find((p) => p.serviceId === servizio.id)
    if (typeof personale?.price === 'number') return { ...riga, price: personale.price }
    const dalListino = prezzoDalListino(cane, servizio, listino, servizi)
    return { ...riga, price: dalListino ? dalListino.prezzo : servizio.price[cane.size] }
  })
}

function oggetto(valore: unknown): Record<string, unknown> | null {
  return typeof valore === 'object' && valore !== null && !Array.isArray(valore) ? valore as Record<string, unknown> : null
}

function prezzoValido(valore: unknown): number | undefined {
  return typeof valore === 'number' && Number.isFinite(valore) && valore >= 0 ? valore : undefined
}

function tagliaValida(valore: unknown): Taglia | undefined {
  return valore === 'piccola' || valore === 'media' || valore === 'grande' ? valore : undefined
}

export function servizioDaDoc(id: string, data: Record<string, unknown>): ServizioListino {
  const prezzi = oggetto(data.price)
  return {
    id,
    name: typeof data.name === 'string' ? data.name : '',
    active: data.active === true,
    price: {
      piccola: prezzoValido(prezzi?.piccola) ?? 0,
      media: prezzoValido(prezzi?.media) ?? 0,
      grande: prezzoValido(prezzi?.grande) ?? 0,
    },
  }
}

export function listinoDaDoc(valore: unknown): Listino | undefined {
  const razze = oggetto(valore)?.razze
  if (!Array.isArray(razze)) return undefined
  return {
    razze: razze.flatMap((r) => {
      const razza = oggetto(r)
      if (!razza || typeof razza.nome !== 'string') return []
      const voci = Array.isArray(razza.voci) ? razza.voci : []
      return [{
        nome: razza.nome,
        voci: voci.flatMap((v) => {
          const voce = oggetto(v)
          if (!voce || typeof voce.nome !== 'string') return []
          return [{
            nome: voce.nome,
            tipo: typeof voce.tipo === 'string' ? voce.tipo : undefined,
            prezzo: prezzoValido(voce.prezzo),
            servizioId: typeof voce.servizioId === 'string' ? voce.servizioId : undefined,
          }]
        }),
      }]
    }),
  }
}

export function caneDaDoc(data: Record<string, unknown> | undefined, ricaduta: { breed: string; size: Taglia }): CanePrezzo {
  const prezzi = Array.isArray(data?.servicePrices) ? data.servicePrices : []
  return {
    breed: typeof data?.breed === 'string' ? data.breed : ricaduta.breed,
    size: tagliaValida(data?.size) ?? ricaduta.size,
    servicePrices: prezzi.flatMap((p) => {
      const voce = oggetto(p)
      if (!voce || typeof voce.serviceId !== 'string') return []
      return [{ serviceId: voce.serviceId, price: prezzoValido(voce.price) }]
    }),
  }
}
