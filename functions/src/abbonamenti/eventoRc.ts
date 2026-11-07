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
  /** Solo per TRANSFER: da quali utenti RevenueCat a quali è passato l'acquisto. */
  transferred_from?: string[]
  transferred_to?: string[]
  /** Codice dell'offerta usata, quando RevenueCat lo manda. */
  offer_code?: string | null
  price?: number | null
  currency?: string | null
}

/** rcProdotto: il prodotto Play che regge il piano in corso, così gli eventi di un altro abbonamento non lo toccano. */
export type PianoRc = ProMain & { rcEventoMs?: number; rcProdotto?: string | null }

/** prodotto: quello da salvare come rcProdotto (null lo toglie). */
export type EsitoEvento = { azione: 'scrivi'; campi: CampiPiano; ms: number; prodotto: string | null } | { azione: 'ignora'; motivo: string }

const POSTI_SALONE = 3
const ATTIVANO = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'SUBSCRIPTION_EXTENDED', 'PRODUCT_CHANGE'])

function testo(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function elenco(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((a): a is string => typeof a === 'string') : undefined
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
    aliases: elenco(r.aliases),
    product_id: testo(r.product_id),
    new_product_id: r.new_product_id === null ? null : testo(r.new_product_id),
    expiration_at_ms: numero(r.expiration_at_ms),
    grace_period_expiration_at_ms: numero(r.grace_period_expiration_at_ms),
    event_timestamp_ms: numero(r.event_timestamp_ms) ?? undefined,
    environment: testo(r.environment),
    transferred_from: elenco(r.transferred_from),
    transferred_to: elenco(r.transferred_to),
    offer_code: r.offer_code === null ? null : testo(r.offer_code),
    price: numero(r.price),
    currency: r.currency === null ? null : testo(r.currency),
  }
}

/** L'id che l'app dà a RevenueCat: casuale, creato dal server per un salone (vedi idAcquistiPer). Mai il salonId, che è pubblico. */
export function idRcValido(id: string | undefined): id is string {
  return !!id && /^g_[0-9a-f]{32}$/.test(id)
}

// Gli id dell'evento che possono portare a un salone: prima app_user_id, poi gli alias (un acquisto fatto da anonimo).
export function idRcDiEvento(e: EventoRc): string[] {
  return [e.app_user_id, ...(e.aliases ?? [])].filter(idRcValido).filter((id, i, tutti) => tutti.indexOf(id) === i)
}

const RANGO = { pro: 1, salone: 2 } as const

/** L'abbonamento Play, senza il piano base: «groomly_plus:mensile» → «groomly_plus». */
export function abbonamentoDi(prodotto: string | null | undefined): string {
  return (prodotto ?? '').split(':')[0]
}

// RevenueCat chiama i prodotti Play «abbonamento:piano base»; conta l'abbonamento.
export function livelloDi(prodotto: string | null | undefined): 'pro' | 'salone' | null {
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

/**
 * Un salone può avere per poco due abbonamenti Play (Plus e poi Salon). L'evento di un prodotto diverso da quello che regge
 * il piano non lo tocca finché quel piano è più alto e non è scaduto; un acquisto di livello più alto passa sempre.
 */
function daUnAltroAbbonamento(prodotto: string, piano: 'pro' | 'salone', attuale: PianoRc | undefined, adesso: Date): boolean {
  const regge = attuale?.rcProdotto
  if (!regge || attuale?.fonte !== 'play' || abbonamentoDi(regge) === abbonamentoDi(prodotto)) return false
  const livelloAttuale = livelloDi(regge)
  if (!livelloAttuale || RANGO[piano] > RANGO[livelloAttuale]) return false
  const scade = Date.parse(attuale.scadeIl ?? '')
  return !Number.isFinite(scade) || scade > adesso.getTime()
}

export function pianoDaEvento(e: EventoRc, attuale: PianoRc | undefined, adesso: Date): EsitoEvento {
  if (eVip(attuale)) return { azione: 'ignora', motivo: 'vip' }
  const ms = e.event_timestamp_ms ?? 0
  if (typeof attuale?.rcEventoMs === 'number' && ms < attuale.rcEventoMs) return { azione: 'ignora', motivo: 'vecchio' }

  const prodotto = e.type === 'PRODUCT_CHANGE' && e.new_product_id ? e.new_product_id : e.product_id
  const piano = livelloDi(prodotto)
  // Un prodotto che non è un piano (anche alla scadenza) non tocca mai il piano del salone.
  if (!piano || !prodotto) return { azione: 'ignora', motivo: `prodotto ${prodotto ?? '-'}` }
  if (e.type !== 'PRODUCT_CHANGE' && daUnAltroAbbonamento(prodotto, piano, attuale, adesso)) return { azione: 'ignora', motivo: 'altro-abbonamento' }

  if (e.type === 'EXPIRATION') {
    if (attuale?.fonte !== 'play') return { azione: 'ignora', motivo: 'non-play' }
    return { azione: 'scrivi', campi: campiBase(true), ms, prodotto: null }
  }

  const scade = iso(e.expiration_at_ms)
  if (!scade) return { azione: 'ignora', motivo: 'senza-scadenza' }

  if (ATTIVANO.has(e.type)) return { azione: 'scrivi', campi: play(piano, 'attivo', scade, true), ms, prodotto }
  if (e.type === 'CANCELLATION') return { azione: 'scrivi', campi: play(piano, 'disdetto', scade, false), ms, prodotto }
  if (e.type === 'BILLING_ISSUE') {
    return { azione: 'scrivi', campi: play(piano, 'grazia', iso(e.grace_period_expiration_at_ms) ?? scade, true), ms, prodotto }
  }
  return { azione: 'ignora', motivo: e.type }
}
