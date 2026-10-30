import * as logger from 'firebase-functions/logger'

export type Suggerimento = { placeId: string; principale: string; secondario: string }

const LIMITE_GIORNALIERO = 200
const TIMEOUT_MS = 5000
const BASE = 'https://places.googleapis.com/v1'

type Base = { sessione: string; lingua: string; chiave: string; fetch: typeof fetch }

// Controlli che non costano nulla: servono anche alle callable prima di contare la richiesta.
export function suggerimentoPossibile(testo: string, chiave: string): boolean {
  return testo.trim().length >= 3 && chiave !== ''
}

export function dettaglioPossibile(placeId: string, chiave: string): boolean {
  return placeId !== '' && chiave !== ''
}

function codiceErrore(errore: unknown): string {
  return errore instanceof Error ? errore.name : 'sconosciuto'
}

function testoDi(valore: unknown): string {
  return typeof valore === 'string' ? valore : ''
}

export async function suggerimentiDa(input: Base & { testo: string }): Promise<Suggerimento[]> {
  const testo = input.testo.trim()
  if (!suggerimentoPossibile(testo, input.chiave)) return []
  try {
    const risposta = await input.fetch(`${BASE}/places:autocomplete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': input.chiave },
      body: JSON.stringify({
        input: testo,
        sessionToken: input.sessione,
        languageCode: input.lingua,
        regionCode: 'it',
        includedPrimaryTypes: ['street_address', 'premise', 'subpremise', 'route'],
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!risposta.ok) return []
    const corpo = await risposta.json() as { suggestions?: unknown }
    const elenco = Array.isArray(corpo.suggestions) ? corpo.suggestions : []
    const risultato: Suggerimento[] = []
    for (const voce of elenco) {
      const p = (voce as { placePrediction?: Record<string, unknown> } | null)?.placePrediction
      const placeId = testoDi(p?.placeId)
      if (!p || !placeId) continue
      const formato = p.structuredFormat as { mainText?: { text?: unknown }; secondaryText?: { text?: unknown } } | undefined
      risultato.push({
        placeId,
        principale: testoDi(formato?.mainText?.text),
        secondario: testoDi(formato?.secondaryText?.text),
      })
      if (risultato.length === 5) break
    }
    return risultato
  } catch (errore) {
    logger.warn('Suggerimenti indirizzo non disponibili', { code: codiceErrore(errore) })
    return []
  }
}

export async function dettaglioDa(input: Base & { placeId: string }): Promise<{ indirizzo: string; placeId: string } | null> {
  if (!dettaglioPossibile(input.placeId, input.chiave)) return null
  try {
    const query = new URLSearchParams({ sessionToken: input.sessione, languageCode: input.lingua })
    const risposta = await input.fetch(`${BASE}/places/${encodeURIComponent(input.placeId)}?${query.toString()}`, {
      headers: { 'X-Goog-Api-Key': input.chiave, 'X-Goog-FieldMask': 'formattedAddress' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!risposta.ok) return null
    const corpo = await risposta.json() as { formattedAddress?: unknown }
    const indirizzo = testoDi(corpo.formattedAddress).trim()
    return indirizzo ? { indirizzo, placeId: input.placeId } : null
  } catch (errore) {
    logger.warn('Dettaglio indirizzo non disponibile', { code: codiceErrore(errore) })
    return null
  }
}

export function decisioneLimite(
  attuale: unknown,
  oggi: string,
): { ok: boolean; prossimo: { giorno: string; conteggio: number } } {
  const dati = (attuale && typeof attuale === 'object' ? attuale : {}) as { giorno?: unknown; conteggio?: unknown }
  const conteggio = dati.giorno === oggi && typeof dati.conteggio === 'number' ? dati.conteggio : 0
  if (conteggio >= LIMITE_GIORNALIERO) return { ok: false, prossimo: { giorno: oggi, conteggio } }
  return { ok: true, prossimo: { giorno: oggi, conteggio: conteggio + 1 } }
}
