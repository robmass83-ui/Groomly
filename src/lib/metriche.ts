import { VERSIONE_DOCUMENTI, type ConsensoMetriche, type TerminiAccount } from './versioneLegale'

export type PianoMetrica = 'go' | 'plus' | 'salon'

// Solo nomi e valori presi da elenchi fissi: qui non deve mai passare testo scritto da qualcuno.
export type EventoMetrica =
  | { nome: 'paywall_aperta'; feature: string; fonte: string }
  | { nome: 'salone_attivato' | 'cane_creato' | 'listino_condiviso' | 'report_esportato' }
  | { nome: 'appuntamento_creato' | 'appuntamento_completato' | 'appuntamento_disdetto' }
  | { nome: 'beta_accettata' | 'beta_rifiutata' }
  | { nome: 'vetrina_piano_vista' | 'avvisami_toccato'; piano: PianoMetrica }
  | { nome: 'backup_eseguito'; tipo: 'auto' | 'manuale' }

export type ProfiloMetriche = {
  nativo: boolean
  role?: string
  admin: boolean
  protetto: boolean
  vip: boolean
  email?: string | null
}

export function registra(consenso: boolean, evento: EventoMetrica, sink: (evento: EventoMetrica) => void): void {
  if (!consenso) return
  sink(evento)
}

/** Il consenso è personale: si chiede solo al titolare e vale solo per i suoi telefoni. */
export function puoRispondere(profilo: ProfiloMetriche): boolean {
  return profilo.nativo
    && profilo.role === 'titolare'
    && !profilo.admin
    && !profilo.protetto
    && !profilo.vip
    && !(profilo.email ?? '').toLowerCase().endsWith('@test.groomly')
}

export function puoRaccogliere(profilo: ProfiloMetriche, consenso?: ConsensoMetriche): boolean {
  return puoRispondere(profilo) && consenso?.attivo === true
}

/** Chi non ha ancora i documenti in vigore risponde dopo averli accettati. */
export function haDocumentiInVigore(termini: TerminiAccount | undefined): boolean {
  return (termini?.versione ?? 0) >= VERSIONE_DOCUMENTI
}

export function devoChiedere(profilo: ProfiloMetriche, consenso: ConsensoMetriche | undefined, termini: TerminiAccount | undefined): boolean {
  return puoRispondere(profilo) && !consenso && haDocumentiInVigore(termini)
}

export function nomePiano(livello: 'base' | 'pro' | 'salone'): PianoMetrica {
  if (livello === 'pro') return 'plus'
  return livello === 'salone' ? 'salon' : 'go'
}
