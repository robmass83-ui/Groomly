import type { Service } from '../types/models'
import { formatEuro } from './format'
import { summarizeDuration, summarizePrice } from './serviceSummary'

export type ListinoPrice =
  | { kind: 'sizes'; piccola: string; media: string; grande: string }
  | { kind: 'all'; text: string }
  | { kind: 'single'; text: string }

export interface ListinoRow {
  id: string
  name: string
  duration: string
  price: ListinoPrice
}

export interface ListinoView {
  updatedAt: Date | null
  /** Servizi principali: una riga della tabella per taglia. */
  rows: ListinoRow[]
  /** Servizi aggiuntivi: prezzo unico, fuori dalla tabella. */
  extras: ListinoRow[]
}

function rowFor(service: Service): ListinoRow {
  const { piccola, media, grande } = service.price
  const price: ListinoPrice = service.kind !== 'principale'
    ? { kind: 'single', text: summarizePrice(service) }
    : piccola === media && media === grande
      ? { kind: 'all', text: `${formatEuro(piccola)} · tutte le taglie` }
      : { kind: 'sizes', piccola: formatEuro(piccola), media: formatEuro(media), grande: formatEuro(grande) }
  return { id: service.id, name: service.name, duration: summarizeDuration(service), price }
}

export function listinoView(services: Service[]): ListinoView {
  const active = services
    .filter((service) => service.active)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  const updatedAt = active.reduce<Date | null>((latest, service) => {
    if (latest == null || service.updatedAt > latest) return service.updatedAt
    return latest
  }, null)
  return {
    updatedAt,
    rows: active.filter((service) => service.kind === 'principale').map(rowFor),
    extras: active.filter((service) => service.kind !== 'principale').map(rowFor),
  }
}
