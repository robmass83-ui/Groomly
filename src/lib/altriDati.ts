/** I dati fuori dal ripristino: stanno nello ZIP e nel Registro perché sono del salone, ma non tornano indietro. */
export type AltriDati = {
  richieste: Record<string, unknown>
  attesa: Record<string, unknown>
  coda: Record<string, unknown>
  /** Le raccolte che non si sono potute leggere: il backup finisce lo stesso. */
  nonLette: string[]
  account: Record<string, unknown> | null
}

// I token aprono link per conto del cliente: in un file che gira non servono.
export function senzaToken(dati: Record<string, unknown>): Record<string, unknown> {
  const { token: _token, ...resto } = dati
  return resto
}

function cella(valore: unknown): string | number {
  if (typeof valore === 'number' || typeof valore === 'string') return valore
  if (valore === null || valore === undefined) return ''
  return JSON.stringify(valore)
}

export function righeFoglio(voci: Record<string, unknown>): { colonne: string[]; righe: (string | number)[][] } {
  const elenco = Object.values(voci).filter((voce): voce is Record<string, unknown> => !!voce && typeof voce === 'object')
  const colonne = [...new Set(elenco.flatMap((voce) => Object.keys(voce)))].sort()
  return { colonne, righe: elenco.map((voce) => colonne.map((colonna) => cella(voce[colonna]))) }
}
