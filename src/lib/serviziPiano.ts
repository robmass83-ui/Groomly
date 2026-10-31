import type { TipoCoda } from './codaEmail'
import { haAccesso, type FeatureKey, type StatoPiano } from './piano'

const TIPI_EMAIL: TipoCoda[] = ['promemoria', 'pronto', 'auguri', 'recensione', 'attesa']

export const FUNZIONE_EMAIL: Record<TipoCoda, FeatureKey> = {
  promemoria: 'promemoriaAuto',
  pronto: 'pronto',
  auguri: 'compleanno',
  recensione: 'recensioni',
  attesa: 'listaAttesa',
}

export function emailPermessa(stato: StatoPiano, tipo: TipoCoda): boolean {
  return haAccesso(stato, FUNZIONE_EMAIL[tipo])
}

// Le email automatiche seguono il piano: se il livello non le comprende, valgono come spente.
export function serviziPerStato<T>(servizi: T, stato: StatoPiano): T {
  if (!servizi || typeof servizi !== 'object') return servizi
  const copia: Record<string, unknown> = { ...(servizi as Record<string, unknown>) }
  for (const tipo of TIPI_EMAIL) {
    if (emailPermessa(stato, tipo)) continue
    const attuale = copia[tipo]
    copia[tipo] = { ...(attuale && typeof attuale === 'object' ? attuale : {}), modo: 'spento' }
  }
  return copia as T
}
