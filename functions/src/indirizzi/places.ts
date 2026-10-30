export type Suggerimento = { placeId: string; principale: string; secondario: string }

const LIMITE_GIORNALIERO = 200
const BASE = 'https://places.googleapis.com/v1'

type Base = { sessione: string; lingua: string; chiave: string; fetch: typeof fetch }

function testoDi(valore: unknown): string {
  return typeof valore === 'string' ? valore : ''
}

export async function suggerimentiDa(input: Base & { testo: string }): Promise<Suggerimento[]> {
  const testo = input.testo.trim()
  if (testo.length < 3 || input.chiave === '') return []
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
}

export async function dettaglioDa(input: Base & { placeId: string }): Promise<{ indirizzo: string; placeId: string } | null> {
  if (!input.placeId || input.chiave === '') return null
  const query = new URLSearchParams({ sessionToken: input.sessione, languageCode: input.lingua })
  const risposta = await input.fetch(`${BASE}/places/${encodeURIComponent(input.placeId)}?${query.toString()}`, {
    headers: { 'X-Goog-Api-Key': input.chiave, 'X-Goog-FieldMask': 'formattedAddress' },
  })
  if (!risposta.ok) return null
  const corpo = await risposta.json() as { formattedAddress?: unknown }
  const indirizzo = testoDi(corpo.formattedAddress).trim()
  return indirizzo ? { indirizzo, placeId: input.placeId } : null
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
