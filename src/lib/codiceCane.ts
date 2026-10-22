export type CodiciCaneDoc = {
  next: number
  cartella: 'cani' | 'animali'
  byId: Record<string, string>
}

export type CaneCodice = { id: string; createdAt?: number; species?: string }

export function formatCodice(n: number): string {
  return `C${String(n).padStart(4, '0')}`
}

function numeroDi(code: string): number | null {
  const match = /^C(\d+)$/.exec(code)
  if (!match) return null
  const value = Number(match[1])
  return Number.isSafeInteger(value) ? value : null
}

export function assegnaCodici(doc: CodiciCaneDoc | null, cani: readonly CaneCodice[]): { doc: CodiciCaneDoc; changed: boolean } {
  const byId = { ...(doc?.byId ?? {}) }
  const inputNext = typeof doc?.next === 'number' && doc.next >= 1 ? doc.next : 1
  let next = inputNext
  let max = 0
  for (const code of Object.values(byId)) {
    const value = numeroDi(code)
    if (value !== null && value > max) max = value
  }
  if (next < max + 1) next = max + 1
  const pending = cani.filter((dog) => byId[dog.id] === undefined).sort((a, b) => {
    const left = a.createdAt ?? Number.POSITIVE_INFINITY
    const right = b.createdAt ?? Number.POSITIVE_INFINITY
    if (left !== right) return left - right
    return a.id.localeCompare(b.id)
  })
  for (const dog of pending) {
    byId[dog.id] = formatCodice(next)
    next += 1
  }
  const cartella = doc?.cartella ?? (cani.some((dog) => dog.species && dog.species !== 'cane') ? 'animali' : 'cani')
  const changed = doc === null
    ? cani.length > 0
    : next !== inputNext || pending.length > 0 || cartella !== doc.cartella
  return { doc: { next, cartella, byId }, changed }
}
