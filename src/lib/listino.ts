import type { Service } from '../types/models'
import { formatEuro } from './format'
import { summarizeDuration, summarizePrice } from './serviceSummary'

export type ListinoPrice =
  | { kind: 'sizes'; piccola: string; media: string; grande: string }
  | { kind: 'single'; text: string }

export interface ListinoRow {
  id: string
  name: string
  duration: string
  price: ListinoPrice
}

export interface ListinoView {
  updatedAt: Date | null
  rows: ListinoRow[]
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
    rows: active.map((service) => ({
      id: service.id,
      name: service.name,
      duration: summarizeDuration(service),
      price: service.kind === 'principale'
        ? {
            kind: 'sizes' as const,
            piccola: formatEuro(service.price.piccola),
            media: formatEuro(service.price.media),
            grande: formatEuro(service.price.grande),
          }
        : { kind: 'single' as const, text: summarizePrice(service) },
    })),
  }
}
