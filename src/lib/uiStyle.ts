import type { PriceIconKey } from '../assets/icons/icons'
import { formatEuro } from './format'

const TONE: Record<string, string> = {
  bagno: 'bagno',
  taglio: 'taglio',
  bagno_taglio: 'combo',
  nodi: 'nodi',
  dermatologico: 'derma',
  antiparassitario: 'anti',
}

export function serviceTone(iconKey?: string): { ink: string; bg: string } {
  const key = (iconKey && TONE[iconKey]) || 'strip'
  return { ink: `var(--s-${key})`, bg: `var(--s-${key}-bg)` }
}

const PRICE_TONE: Record<PriceIconKey, string> = {
  bagno: 'bagno',
  taglio: 'taglio',
  bagno_taglio: 'combo',
  bagno_sistemazione: 'combo',
  pelo_corto: 'pelo',
  pelo_lungo: 'pelo',
  nodi: 'nodi',
  dermatologico: 'derma',
  antiparassitario: 'anti',
  shampoo: 'combo',
  unghie: 'taglio',
  orecchie: 'bagno',
  occhi: 'bagno',
  tosatrice: 'strip',
}

export function priceTone(iconKey: PriceIconKey): { ink: string; bg: string } {
  const key = PRICE_TONE[iconKey]
  return { ink: `var(--s-${key})`, bg: `var(--s-${key}-bg)` }
}

export function nextVisitPill(start: Date, now: Date): string {
  const diff = start.getTime() - now.getTime()
  if (diff <= 0) return 'ora'
  return `tra ${Math.max(1, Math.ceil(diff / 60000))} min`
}

export function priceChange(current: number, previous: number | null): string | null {
  if (previous === null || previous === current) return null
  const arrow = current > previous ? '▲' : '▼'
  return `${arrow} ${formatEuro(Math.abs(current - previous))}`
}

export function eventLayout(durationMin: number): 'compact' | 'full' {
  return durationMin < 60 ? 'compact' : 'full'
}
