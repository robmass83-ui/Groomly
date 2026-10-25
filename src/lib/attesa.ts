export type CandidatoAttesa = {
  id: string
  durataMin: number
  preferenza: 'mattina' | 'pomeriggio' | 'qualsiasi'
  arrivato: string
}

function minuti(hhmm: string): number {
  const [ore, min] = hhmm.split(':').map(Number)
  return (ore ?? 0) * 60 + (min ?? 0)
}

export function compatibili(bucoMinuti: number, ora: string, candidati: readonly CandidatoAttesa[]): CandidatoAttesa[] {
  const punto = minuti(ora)
  return candidati
    .filter((candidato) => candidato.durataMin <= bucoMinuti)
    .filter((candidato) => candidato.preferenza !== 'mattina' || punto < 13 * 60)
    .filter((candidato) => candidato.preferenza !== 'pomeriggio' || punto >= 13 * 60)
    .slice()
    .sort((a, b) => a.arrivato.localeCompare(b.arrivato) || a.id.localeCompare(b.id))
}

export function confermaAttesa(ordine: readonly string[], id: string): { vince: string; persi: string[] } | { persa: true } {
  const primo = ordine[0]
  if (!primo || !ordine.includes(id)) return { persa: true }
  if (id !== primo) return { persa: true }
  return { vince: primo, persi: ordine.slice(1) }
}

export function postoLiberato(appuntamento: { status: string; ora: string; minuti: number }): { ora: string; minuti: number } | null {
  if (appuntamento.status !== 'disdetto') return null
  return { ora: appuntamento.ora, minuti: appuntamento.minuti }
}
