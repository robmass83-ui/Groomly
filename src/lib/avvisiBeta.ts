import type { StatoBeta } from './faseBeta'

// Avvisi della beta calcolati dall'app: gli avvisi di sistema sono uguali per tutti i saloni, questi sono del singolo salone.
export type TipoAvvisoBeta = 'invito' | 'promemoria' | 'fine-vicina' | 'fine-domani' | 'finita'

export interface AvvisoBeta {
  id: string
  tipo: TipoAvvisoBeta
  data: Date
  link: string
}

const GIORNO_MS = 24 * 60 * 60 * 1000
const GIORNI_PROMEMORIA = 7
const GIORNI_FINE_VICINA = 7

function avviso(tipo: TipoAvvisoBeta, data: Date, link: string): AvvisoBeta {
  return { id: `${tipo}:${data.toISOString()}`, tipo, data, link }
}

export function avvisiBeta(beta: StatoBeta, adesso: Date, opzioni: { feedbackInviatoIl?: number | null }): AvvisoBeta[] {
  if (beta.fase === 'invitato' && beta.invito) {
    return [avviso('invito', new Date(beta.invito.invitatoIl), '/impostazioni/beta')]
  }
  if (beta.fase === 'in-corso') {
    const lista: AvvisoBeta[] = []
    const rimasti = beta.giorniRimasti
    if (beta.fine && rimasti !== null && rimasti <= 1) lista.push(avviso('fine-domani', beta.fine, '/impostazioni/beta/fine'))
    else if (beta.fine && rimasti !== null && rimasti <= GIORNI_FINE_VICINA) lista.push(avviso('fine-vicina', beta.fine, '/impostazioni/abbonamento'))
    if (beta.inizio) {
      const quando = new Date(beta.inizio.getTime() + GIORNI_PROMEMORIA * GIORNO_MS)
      const giaInviato = typeof opzioni.feedbackInviatoIl === 'number' && opzioni.feedbackInviatoIl >= beta.inizio.getTime()
      if (adesso >= quando && !giaInviato) lista.push(avviso('promemoria', quando, '/impostazioni/beta/feedback'))
    }
    return lista
  }
  if (beta.fase === 'finita' && beta.fine && beta.feedbackVisibile && !beta.revocata) {
    return [avviso('finita', beta.fine, '/impostazioni/beta/fine')]
  }
  return []
}
