import { createHash, timingSafeEqual } from 'node:crypto'

export type MemoriaEventi = {
  ha: (id: string) => boolean
  aggiungi: (id: string) => void
}

/** Il segreto del webhook deve essere lungo e casuale: con uno corto il webhook resta chiuso. */
export const SEGRETO_MINIMO = 32

// Confronto a tempo costante: gli hash hanno sempre la stessa lunghezza, quindi non si scopre il segreto un carattere alla volta.
function uguali(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export function decisioneWebhook(input: {
  authorization: string | undefined
  atteso: string
  giaVisto: boolean
  apiKey: string | undefined
}): { status: 401 | 200 | 503; scrivi: boolean } {
  if (!input.apiKey || input.apiKey.trim() === '') return { status: 503, scrivi: false }
  if (input.atteso.trim().length < SEGRETO_MINIMO) return { status: 503, scrivi: false }
  if (!input.authorization || !uguali(input.authorization, input.atteso)) return { status: 401, scrivi: false }
  if (input.giaVisto) return { status: 200, scrivi: false }
  return { status: 200, scrivi: true }
}
export function applicaWebhook(input: {
  authorization: string | undefined
  atteso: string
  eventoId: string
  apiKey: string | undefined
}, memoria: MemoriaEventi): { status: 401 | 200 | 503 } {
  const decisione = decisioneWebhook({
    authorization: input.authorization,
    atteso: input.atteso,
    giaVisto: memoria.ha(input.eventoId),
    apiKey: input.apiKey,
  })
  if (decisione.scrivi) memoria.aggiungi(input.eventoId)
  return { status: decisione.status }
}
