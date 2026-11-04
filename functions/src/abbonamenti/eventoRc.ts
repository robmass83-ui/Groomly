import { eVip } from '../../../src/lib/funzioniPiano'
import { PRODOTTI_PLAY } from '../../../src/lib/idAbbonamenti'
import type { ProMain } from '../../../src/lib/piano'
import { campiBase, type CampiPiano } from '../piano/scriviPiano'

// Il pezzo dell'evento RevenueCat che serve al piano (https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields).
export type EventoRc = {
  id: string
  type: string
  app_user_id?: string
  aliases?: string[]
  product_id?: string
  new_product_id?: string | null
  expiration_at_ms?: number | null
  grace_period_expiration_at_ms?: number | null
  event_timestamp_ms?: number
  environment?: string
}

export type PianoRc = ProMain & { rcEventoMs?: number }

export type EsitoEvento = { azione: 'scrivi'; campi: CampiPiano; ms: number } | { azione: 'ignora'; motivo: string }

const POSTI_SALONE = 3
const ATTIVANO = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'SUBSCRIPTION_EXTENDED', 'PRODUCT_CHANGE'])

function testo(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function numero(value: unknown): number | null | undefined {
  if (value === null) return null
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function eventoRcDi(body: unknown): EventoRc | null {
  const e = body && typeof body === 'object' ? (body as { event?: unknown }).event : undefined
  if (!e || typeof e !== 'object') return null
  const r = e as Record<string, unknown>
  const id = testo(r.id)
  const type = testo(r.type)
  if (!id || !type) return null
  return {
    id,
    type,
    app_user_id: testo(r.app_user_id),
    aliases: Array.isArray(r.aliases) ? r.aliases.filter((a): a is string => typeof a === 'string') : undefined,
    product_id: testo(r.product_id),
    new_product_id: r.new_product_id === null ? null : testo(r.new_product_id),
    expiration_at_ms: numero(r.expiration_at_ms),
    grace_period_expiration_at_ms: numero(r.grace_period_expiration_at_ms),
    event_timestamp_ms: numero(r.event_timestamp_ms) ?? undefined,
    environment: testo(r.environment),
  }
}

function salonIdValido(id: string | undefined): id is string {
  return !!id && !id.startsWith('$RCAnonymousID:') && !id.includes('/') && id !== 'shared'
}

// L'app collega RevenueCat con appUserID = salonId; un acquisto fatto prima del collegamento arriva come anonimo con l'alias.
export function salonIdDiEvento(e: EventoRc): string | null {
  if (salonIdValido(e.app_user_id)) return e.app_user_id
  if (e.app_user_id === 'shared') return null
  return (e.aliases ?? []).find(salonIdValido) ?? null
}

// RevenueCat chiama i prodotti Play «abbonamento:piano base»; conta l'abbonamento.
function livelloDi(prodotto: string | null | undefined): 'pro' | 'salone' | null {
  const abbonamento = (prodotto ?? '').split(':')[0]
  if (abbonamento === PRODOTTI_PLAY.plus) return 'pro'
  if (abbonamento === PRODOTTI_PLAY.salone) return 'salone'
  return null
}

function iso(ms: number | null | undefined): string | null {
  return typeof ms === 'number' ? new Date(ms).toISOString() : null
}

function play(piano: 'pro' | 'salone', stato: CampiPiano['stato'], scadeIl: string, rinnovoAutomatico: boolean): CampiPiano {
  return {
    piano,
    stato,
    fonte: 'play',
    scadeIl,
    seatsIncluded: piano === 'salone' ? POSTI_SALONE : 0,
    rinnovoAutomatico,
  }
}

export function pianoDaEvento(e: EventoRc, attuale: PianoRc | undefined, _adesso: Date): EsitoEvento {
  if (eVip(attuale)) return { azione: 'ignora', motivo: 'vip' }
  const ms = e.event_timestamp_ms ?? 0
  if (typeof attuale?.rcEventoMs === 'number' && ms < attuale.rcEventoMs) return { azione: 'ignora', motivo: 'vecchio' }

  if (e.type === 'EXPIRATION') {
    if (attuale?.fonte !== 'play') return { azione: 'ignora', motivo: 'non-play' }
    return { azione: 'scrivi', campi: campiBase(true), ms }
  }

  const prodotto = e.type === 'PRODUCT_CHANGE' && e.new_product_id ? e.new_product_id : e.product_id
  const piano = livelloDi(prodotto)
  if (!piano) return { azione: 'ignora', motivo: `prodotto ${prodotto ?? '-'}` }
  const scade = iso(e.expiration_at_ms)
  if (!scade) return { azione: 'ignora', motivo: 'senza-scadenza' }

  if (ATTIVANO.has(e.type)) return { azione: 'scrivi', campi: play(piano, 'attivo', scade, true), ms }
  if (e.type === 'CANCELLATION') return { azione: 'scrivi', campi: play(piano, 'disdetto', scade, false), ms }
  if (e.type === 'BILLING_ISSUE') {
    return { azione: 'scrivi', campi: play(piano, 'grazia', iso(e.grace_period_expiration_at_ms) ?? scade, true), ms }
  }
  return { azione: 'ignora', motivo: e.type }
}
