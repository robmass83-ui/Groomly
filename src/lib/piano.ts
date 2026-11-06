import type { PausaSalone } from './pausaSalone'

export type Livello = 'base' | 'pro' | 'salone'
export type StatoPianoNome = 'attivo' | 'prova' | 'grazia' | 'sospeso' | 'disdetto' | 'scaduto'

const STATI_PIANO = new Set<string>(['attivo', 'prova', 'grazia', 'sospeso', 'disdetto', 'scaduto'])

export function statoPianoNome(value: unknown): StatoPianoNome | undefined {
  return typeof value === 'string' && STATI_PIANO.has(value) ? value as StatoPianoNome : undefined
}
// L'unico elenco delle fonti: app, functions e admin leggono la fonte con fonteDi.
export const FONTI_PIANO = ['play', 'prova', 'omaggio', 'manuale', 'beta'] as const
export type FontePiano = typeof FONTI_PIANO[number]

export function fonteDi(value: unknown): FontePiano | null {
  return typeof value === 'string' && (FONTI_PIANO as readonly string[]).includes(value) ? value as FontePiano : null
}

// Traccia della beta: resta in pro/main anche dopo il ritorno a Go (nessuna scrittura la cancella).
export interface TracciaBeta {
  exBeta?: boolean
  betaPiano?: 'pro' | 'salone'
  betaDal?: string
  betaFinoAl?: string
  earlyAdopter?: boolean
}

export function tracciaBetaDi(doc: unknown): TracciaBeta {
  if (!doc || typeof doc !== 'object') return {}
  const grezzo = doc as Record<string, unknown>
  const traccia: TracciaBeta = {}
  if (typeof grezzo.exBeta === 'boolean') traccia.exBeta = grezzo.exBeta
  if (grezzo.betaPiano === 'pro' || grezzo.betaPiano === 'salone') traccia.betaPiano = grezzo.betaPiano
  if (typeof grezzo.betaDal === 'string') traccia.betaDal = grezzo.betaDal
  if (typeof grezzo.betaFinoAl === 'string') traccia.betaFinoAl = grezzo.betaFinoAl
  if (typeof grezzo.earlyAdopter === 'boolean') traccia.earlyAdopter = grezzo.earlyAdopter
  return traccia
}

export type FeatureKey =
  | 'export' | 'backupAuto' | 'drive' | 'messaggiCategoria' | 'copieCloud'
  | 'promemoriaAuto' | 'richiamo' | 'pronto' | 'compleanno'
  | 'prenotazioni' | 'listaAttesa' | 'recensioni' | 'fedelta'
  | 'team' | 'postiExtra'
  | 'stimeMagazzino'

export interface ProMain extends TracciaBeta {
  piano?: Livello
  stato?: StatoPianoNome
  fonte?: FontePiano | null
  scadeIl?: string | null
  rinnovoAutomatico?: boolean
  seatsIncluded?: number
  seatsExtra?: number
  seats?: number
  provaUsata?: boolean
  pausa?: PausaSalone
}

export interface StatoPiano {
  livello: Livello
  stato: StatoPianoNome | 'assente'
  fonte: FontePiano | null
  scadeIl: Date | null
  inProva: boolean
  giorniProva: number | null
  posti: number
  rinnovoAutomatico: boolean
}

const RANK: Record<Livello, number> = { base: 0, pro: 1, salone: 2 }
const NASCOSTE = new Set<FeatureKey>(['copieCloud', 'postiExtra'])
const LIVELLO: Record<FeatureKey, Livello> = {
  export: 'pro',
  backupAuto: 'pro',
  drive: 'pro',
  messaggiCategoria: 'pro',
  copieCloud: 'pro',
  promemoriaAuto: 'pro',
  richiamo: 'pro',
  pronto: 'pro',
  compleanno: 'pro',
  prenotazioni: 'pro',
  listaAttesa: 'pro',
  recensioni: 'pro',
  fedelta: 'pro',
  team: 'salone',
  postiExtra: 'salone',
  stimeMagazzino: 'pro',
}

const OFFLINE_MS = 72 * 60 * 60 * 1000

function livelloDi(value: unknown): Livello {
  return value === 'pro' || value === 'salone' ? value : 'base'
}

function dataDi(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const FONTI_NON_PROVA = new Set<string>(['play', 'omaggio', 'manuale', 'prova', 'beta'])

export function provaConcessa(doc: ProMain | undefined, adesso: Date): boolean {
  if (!doc) return true
  if (statoPiano(doc, adesso).livello !== 'base') return false
  if (doc.provaUsata === true || doc.exBeta === true) return false
  if (doc.piano === 'pro' || doc.piano === 'salone') return false
  if (doc.fonte && FONTI_NON_PROVA.has(doc.fonte)) return false
  return true
}

export function postiTotali(doc: ProMain | undefined): number {
  if (!doc) return 0
  const included = typeof doc.seatsIncluded === 'number' ? doc.seatsIncluded : 0
  const extra = typeof doc.seatsExtra === 'number' ? doc.seatsExtra : 0
  if (typeof doc.seatsIncluded === 'number' || typeof doc.seatsExtra === 'number') return included + extra
  return typeof doc.seats === 'number' ? doc.seats : 0
}

export function statoPiano(doc: ProMain | undefined, adesso: Date, opzioni?: { offline?: boolean }): StatoPiano {
  const vuoto: StatoPiano = {
    livello: 'base',
    stato: 'assente',
    fonte: null,
    scadeIl: null,
    inProva: false,
    giorniProva: null,
    posti: 0,
    rinnovoAutomatico: false,
  }
  if (!doc) return vuoto
  const scadeIl = dataDi(doc.scadeIl)
  const posti = postiTotali(doc)
  const fonte = doc.fonte ?? null
  const dichiarato = livelloDi(doc.piano)
  const stato = doc.stato ?? 'scaduto'
  const base: StatoPiano = { ...vuoto, stato, fonte, scadeIl, posti, rinnovoAutomatico: doc.rinnovoAutomatico === true }
  if (stato === 'sospeso' || stato === 'scaduto') return { ...base, livello: 'base' }
  const vivo = stato === 'attivo' || stato === 'prova' || stato === 'grazia' || stato === 'disdetto'
  if (!vivo) return { ...base, livello: 'base', stato: 'assente' }
  const scaduto = scadeIl !== null && scadeIl.getTime() <= adesso.getTime()
  if (scaduto && opzioni?.offline && adesso.getTime() - scadeIl.getTime() < OFFLINE_MS) {
    return livelloEffettivo(base, dichiarato, stato, adesso)
  }
  if (scaduto) return { ...base, livello: 'base', stato: 'scaduto' }
  return livelloEffettivo(base, dichiarato, stato, adesso)
}

// Il server scrive la scadenza con il suo orologio e il telefono può essere indietro di qualche minuto:
// senza questa tolleranza 30 giorni e pochi minuti si arrotondano a 31.
const TOLLERANZA_GIORNI_MS = 5 * 60 * 1000

function livelloEffettivo(base: StatoPiano, dichiarato: Livello, stato: StatoPianoNome, adesso: Date): StatoPiano {
  const inProva = stato === 'prova'
  const giorniProva = inProva && base.scadeIl
    ? Math.max(0, Math.ceil((base.scadeIl.getTime() - adesso.getTime() - TOLLERANZA_GIORNI_MS) / (24 * 60 * 60 * 1000)))
    : null
  return { ...base, livello: dichiarato, inProva, giorniProva }
}

export function haAccesso(stato: StatoPiano, feature: FeatureKey): boolean {
  return RANK[stato.livello] >= RANK[LIVELLO[feature]]
}

export function aprePaywall(stato: StatoPiano, feature: FeatureKey): boolean {
  return !haAccesso(stato, feature)
}

export function livelloMinimo(feature: FeatureKey): Livello {
  return LIVELLO[feature]
}

export function eFeature(chiave: string): chiave is FeatureKey {
  return Object.prototype.hasOwnProperty.call(LIVELLO, chiave)
}

export function vistaFunzione(feature: FeatureKey): 'badge' | 'nascosta' {
  return NASCOSTE.has(feature) ? 'nascosta' : 'badge'
}

export function mostraSegno(stato: StatoPiano, feature: FeatureKey): boolean {
  return !haAccesso(stato, feature) && vistaFunzione(feature) === 'badge'
}
