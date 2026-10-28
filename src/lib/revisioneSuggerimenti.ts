const CHIAVE = 'groomly.revisioneSuggerimenti'

export type SegnoSuggerimento = 'interessante' | 'visto'

export function leggiRevisione(): Record<string, SegnoSuggerimento> {
  try {
    const raw = localStorage.getItem(CHIAVE)
    if (!raw) return {}
    const data: unknown = JSON.parse(raw)
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
    const segni: Record<string, SegnoSuggerimento> = {}
    for (const [chiave, valore] of Object.entries(data)) {
      if (valore === 'interessante' || valore === 'visto') segni[chiave] = valore
    }
    return segni
  } catch {
    return {}
  }
}

export function scriviRevisione(segni: Record<string, SegnoSuggerimento>): void {
  localStorage.setItem(CHIAVE, JSON.stringify(segni))
}
