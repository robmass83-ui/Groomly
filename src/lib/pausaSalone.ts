import type { SceltaServizio } from './serviziEmail'

export type SceltaSalonePersonale = 'pausa' | 'aperto'

export interface PausaSalone {
  prenotazioniOnline: boolean
  attesa: SceltaServizio | null
  dal: string
}

const MODI = new Set<string>(['spento', 'manuale', 'automatico'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function attesaDa(settings: Record<string, unknown>): SceltaServizio | null {
  const serviziEmail = settings.serviziEmail
  if (!isRecord(serviziEmail)) return null
  const attesa = serviziEmail.attesa
  if (!isRecord(attesa) || typeof attesa.modo !== 'string' || !MODI.has(attesa.modo)) return null
  return attesa as unknown as SceltaServizio
}

export function leggiPausa(value: unknown): PausaSalone | null {
  if (!isRecord(value)) return null
  if (typeof value.prenotazioniOnline !== 'boolean' || typeof value.dal !== 'string') return null
  const attesa = value.attesa
  if (attesa === null || attesa === undefined) return { prenotazioniOnline: value.prenotazioniOnline, attesa: null, dal: value.dal }
  if (!isRecord(attesa) || typeof attesa.modo !== 'string' || !MODI.has(attesa.modo)) return null
  return { prenotazioniOnline: value.prenotazioniOnline, attesa: attesa as unknown as SceltaServizio, dal: value.dal }
}

export function pausaDa(settings: Record<string, unknown>, adesso: Date): {
  pausa: PausaSalone
  settings: { prenotazioniOnline: false; serviziEmail: { attesa: { modo: 'spento' } }; updatedAt: string }
} {
  const dal = adesso.toISOString()
  return {
    pausa: { prenotazioniOnline: settings.prenotazioniOnline === true, attesa: attesaDa(settings), dal },
    settings: { prenotazioniOnline: false, serviziEmail: { attesa: { modo: 'spento' } }, updatedAt: dal },
  }
}

export function ripresaDa(settings: Record<string, unknown>, pausa: PausaSalone, adesso: Date): {
  prenotazioniOnline?: boolean
  attesa?: SceltaServizio | 'togli'
  updatedAt: string
} | null {
  const out: { prenotazioniOnline?: boolean; attesa?: SceltaServizio | 'togli'; updatedAt: string } = {
    updatedAt: adesso.toISOString(),
  }
  let qualcosa = false
  if (pausa.prenotazioniOnline && settings.prenotazioniOnline !== true) {
    out.prenotazioniOnline = true
    qualcosa = true
  }
  const attuale = attesaDa(settings)
  if (attuale === null || attuale.modo === 'spento') {
    if (pausa.attesa !== null) {
      out.attesa = pausa.attesa
      qualcosa = true
    } else if (attuale !== null) {
      out.attesa = 'togli'
      qualcosa = true
    }
  }
  return qualcosa ? out : null
}
