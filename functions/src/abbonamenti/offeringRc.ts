import { PACCHETTI_ATTESI, type VoceControllo } from '../../../src/lib/accensione'
import { PACCHETTI } from '../../../src/lib/idAbbonamenti'

export type VoceOffering = Extract<VoceControllo, { id: 'offering' }>

function lista(value: unknown): Record<string, unknown>[] {
  const items = value && typeof value === 'object' ? (value as { items?: unknown }).items : undefined
  return Array.isArray(items) ? items.filter((i): i is Record<string, unknown> => !!i && typeof i === 'object') : []
}

// Risposta di GET /v2/projects/{id}/offerings?expand=items.package.product (https://www.revenuecat.com/docs/api-v2/offering).
// L'offering si riconosce dal lookup_key (l'ID che scriviamo in config), i pacchetti dal loro lookup_key.
export function verificaOffering(json: unknown, offeringId: string): { trovati: number; mancanti: string[] } {
  const offering = lista(json).find((o) => o.lookup_key === offeringId)
  const pacchetti = lista(offering?.packages)
  const mancanti = Object.entries(PACCHETTI)
    .filter(([lookup, prodotto]) => {
      const pacchetto = pacchetti.find((p) => p.lookup_key === lookup)
      return !lista(pacchetto?.products).some((voce) => (voce.product as { store_identifier?: unknown } | undefined)?.store_identifier === prodotto)
    })
    .map(([lookup]) => lookup)
  return { trovati: PACCHETTI_ATTESI - mancanti.length, mancanti }
}

export async function leggiOfferingRc(o: { projectId: string; apiKey: string; offeringId: string; fetch?: typeof fetch }): Promise<VoceOffering> {
  const rosso = (errore: 'senza-accesso' | 'rete'): VoceOffering => ({
    id: 'offering', ok: false, trovati: 0, attesi: PACCHETTI_ATTESI, mancanti: Object.keys(PACCHETTI), errore,
  })
  if (!o.projectId.trim() || !o.apiKey.trim()) return rosso('senza-accesso')
  const url = `https://api.revenuecat.com/v2/projects/${encodeURIComponent(o.projectId.trim())}/offerings?expand=items.package.product&limit=100`
  let risposta: Response
  try {
    risposta = await (o.fetch ?? fetch)(url, { headers: { authorization: `Bearer ${o.apiKey.trim()}` } })
  } catch {
    return rosso('rete')
  }
  if (risposta.status === 401 || risposta.status === 403 || risposta.status === 404) return rosso('senza-accesso')
  if (!risposta.ok) return rosso('rete')
  const { trovati, mancanti } = verificaOffering(await risposta.json().catch(() => null), o.offeringId)
  return { id: 'offering', ok: mancanti.length === 0, trovati, attesi: PACCHETTI_ATTESI, mancanti }
}
