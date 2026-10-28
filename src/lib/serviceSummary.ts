import type { Service, SizeTriple } from '../types/models'
import { formatEuro } from './format'

function ends(values: SizeTriple): [number, number] {
  const list = [values.piccola, values.media, values.grande]
  return [Math.min(...list), Math.max(...list)]
}

function euroBody(amount: number): string {
  return formatEuro(amount).slice(2)
}

export function summarizeDuration(service: Pick<Service, 'kind' | 'durationMin'>): string {
  const [low, high] = ends(service.durationMin)
  if (service.kind === 'extra') return `+${low} min`
  return low === high ? `${low} min` : `${low}–${high} min`
}

export function summarizePrice(service: Pick<Service, 'kind' | 'price'>): string {
  const [low, high] = ends(service.price)
  if (low === high) return formatEuro(low)
  return `€ ${euroBody(low)}–${euroBody(high)}`
}

export function activeServicesSubtitle(count: number): string {
  return `${count} ${count === 1 ? 'servizio' : 'servizi'} · tempi stimati`
}
