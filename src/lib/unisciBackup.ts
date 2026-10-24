function registro(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function istante(value: unknown): number {
  const row = registro(value)
  const raw = row && typeof row.updatedAt === 'string' ? Date.parse(row.updatedAt) : Number.NaN
  return Number.isNaN(raw) ? 0 : raw
}

export function unisciRegistri(attuale: unknown, ingresso: unknown): Record<string, unknown> {
  const base = registro(attuale) ?? {}
  const nuovi = registro(ingresso) ?? {}
  const out: Record<string, unknown> = { ...base }
  for (const [id, value] of Object.entries(nuovi)) {
    if (!(id in out)) {
      out[id] = value
      continue
    }
    if (istante(value) > istante(out[id])) out[id] = value
  }
  return out
}
