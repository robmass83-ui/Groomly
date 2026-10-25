const VIETATI = ['notes', 'tags', 'behavior', 'temperament', 'criticalNote'] as const

export function schedaPubblica(cane: Record<string, unknown>): { nome: string; specie: string } {
  const pubblica = {
    nome: typeof cane.name === 'string' ? cane.name : '',
    specie: typeof cane.species === 'string' ? cane.species : '',
  }
  for (const chiave of VIETATI) {
    if (chiave in pubblica) throw new Error('campo interno')
  }
  return pubblica
}

export function esitoToken(revocato: boolean, trovato: boolean): 'ok' | 'non_trovata' {
  if (!trovato || revocato) return 'non_trovata'
  return 'ok'
}
