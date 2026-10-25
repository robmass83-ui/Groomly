export type MemoriaEventi = {
  ha: (id: string) => boolean
  aggiungi: (id: string) => void
}

export function decisioneWebhook(input: {
  authorization: string | undefined
  atteso: string
  giaVisto: boolean
  apiKey: string | undefined
}): { status: 401 | 200 | 503; scrivi: boolean } {
  if (!input.apiKey || input.apiKey.trim() === '') return { status: 503, scrivi: false }
  if (!input.authorization || input.authorization !== input.atteso) return { status: 401, scrivi: false }
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
