import type { FeedbackBeta } from './betaFeedback'

// La casella di Assistenza: suggerimenti e feedback beta, con lo stato che tiene il server.

export const STATI_ASSISTENZA = ['nuovo', 'in-corso', 'risolto'] as const
export type StatoAssistenza = (typeof STATI_ASSISTENZA)[number]
export const FONTI_ASSISTENZA = ['suggerimento', 'feedback'] as const
export type FonteAssistenza = (typeof FONTI_ASSISTENZA)[number]
export type EsitoEmailRisposta = 'inviata' | 'non_inviata' | 'limite' | null

export type RispostaAssistenza = { testo: string; quando: string; email: EsitoEmailRisposta }
export type DocAssistenza = { stato: StatoAssistenza; risposte: RispostaAssistenza[] }

export type RichiestaAssistenza = {
  chiave: string
  fonte: FonteAssistenza
  idOrigine: string
  salonId: string
  categoria: string
  testo: string
  email: string
  quando: string
  stato: StatoAssistenza
  risposte: RispostaAssistenza[]
}

type Suggerimento = { id: string; email: string; categoria: string; testo: string; salonId: string; creato: number | null }
type Feedback = Pick<FeedbackBeta, 'salonId' | 'creatoIl' | 'nonVa' | 'manca'> & { id: string }

export function chiaveAssistenza(fonte: FonteAssistenza, id: string): string {
  return `${fonte}_${id}`
}

/** Prima del taglio una richiesta senza documento è storia passata; dopo, è nuova finché l'admin non agisce. */
export function statoRichiesta(doc: DocAssistenza | undefined, quando: string, assistenzaDal: string | null): StatoAssistenza {
  if (doc) return doc.stato
  if (!assistenzaDal) return 'nuovo'
  return Date.parse(quando) >= Date.parse(assistenzaDal) ? 'nuovo' : 'risolto'
}

export function unisciRichieste(
  suggerimenti: readonly Suggerimento[],
  feedback: readonly Feedback[],
  documenti: Readonly<Record<string, DocAssistenza>>,
  assistenzaDal: string | null,
): RichiestaAssistenza[] {
  const richiesta = (fonte: FonteAssistenza, id: string, salonId: string, categoria: string, testo: string, email: string, quando: string): RichiestaAssistenza => {
    const chiave = chiaveAssistenza(fonte, id)
    const doc = documenti[chiave]
    return { chiave, fonte, idOrigine: id, salonId, categoria, testo, email, quando, stato: statoRichiesta(doc, quando, assistenzaDal), risposte: doc?.risposte ?? [] }
  }
  return [
    ...suggerimenti.map((s) => richiesta('suggerimento', s.id, s.salonId, s.categoria, s.testo, s.email, s.creato === null ? '' : new Date(s.creato).toISOString())),
    ...feedback.map((f) => richiesta('feedback', f.id, f.salonId, '', [f.nonVa, f.manca].filter((t) => t.trim() !== '').join('\n'), '', f.creatoIl)),
  ].sort((a, b) => (Date.parse(b.quando) || 0) - (Date.parse(a.quando) || 0))
}

export type FiltroAssistenza = { fonte: FonteAssistenza | null; categoria: string; stato: StatoAssistenza | 'tutte'; cerca: string }

export function filtraRichieste(richieste: readonly RichiestaAssistenza[], filtro: FiltroAssistenza, nomeDi: (salonId: string) => string): RichiestaAssistenza[] {
  const cerca = filtro.cerca.trim().toLowerCase()
  return richieste.filter((r) => (
    (filtro.fonte === null || r.fonte === filtro.fonte)
    && (filtro.categoria === '' || r.categoria === filtro.categoria)
    && (filtro.stato === 'tutte' || r.stato === filtro.stato)
    && (cerca === '' || nomeDi(r.salonId).toLowerCase().includes(cerca))
  ))
}

export function contaNuove(richieste: readonly RichiestaAssistenza[]): number {
  return richieste.filter((r) => r.stato === 'nuovo').length
}
