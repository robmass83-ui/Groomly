export type Livello = 'base' | 'pro' | 'salone'
export type StatoPianoNome = 'attivo' | 'prova' | 'grazia' | 'sospeso' | 'disdetto' | 'scaduto'
export type FontePiano = 'play' | 'prova' | 'omaggio' | 'manuale'

export type FeatureKey =
  | 'reportPassati' | 'export' | 'copieCloud'
  | 'promemoriaAuto' | 'richiamo' | 'pronto' | 'compleanno'
  | 'pagella' | 'prezzoSuggerito' | 'aumentoListino' | 'collage' | 'senzaFirma'
  | 'prenotazioni' | 'listaAttesa' | 'recensioni' | 'fedelta' | 'schedaCliente' | 'statistiche'
  | 'team' | 'postiExtra'

export interface ProMain {
  piano?: Livello
  stato?: StatoPianoNome
  fonte?: FontePiano | null
  scadeIl?: string | null
  rinnovoAutomatico?: boolean
  seatsIncluded?: number
  seatsExtra?: number
  seats?: number
  provaUsata?: boolean
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
const VISTA: Record<FeatureKey, 'badge' | 'anteprima' | 'nascosta'> = {
  reportPassati: 'badge',
  export: 'badge',
  copieCloud: 'badge',
  promemoriaAuto: 'badge',
  richiamo: 'anteprima',
  pronto: 'badge',
  compleanno: 'badge',
  pagella: 'anteprima',
  prezzoSuggerito: 'nascosta',
  aumentoListino: 'badge',
  collage: 'anteprima',
  senzaFirma: 'badge',
  prenotazioni: 'badge',
  listaAttesa: 'badge',
  recensioni: 'badge',
  fedelta: 'badge',
  schedaCliente: 'badge',
  statistiche: 'anteprima',
  team: 'badge',
  postiExtra: 'badge',
}
const LIVELLO: Record<FeatureKey, Livello> = {
  reportPassati: 'pro',
  export: 'pro',
  copieCloud: 'pro',
  promemoriaAuto: 'pro',
  richiamo: 'pro',
  pronto: 'pro',
  compleanno: 'pro',
  pagella: 'pro',
  prezzoSuggerito: 'pro',
  aumentoListino: 'pro',
  collage: 'pro',
  senzaFirma: 'pro',
  prenotazioni: 'pro',
  listaAttesa: 'pro',
  recensioni: 'pro',
  fedelta: 'pro',
  schedaCliente: 'pro',
  statistiche: 'pro',
  team: 'salone',
  postiExtra: 'salone',
}

const OFFLINE_MS = 72 * 60 * 60 * 1000
const PROPOSTA_MS = 7 * 24 * 60 * 60 * 1000

function livelloDi(value: unknown): Livello {
  return value === 'pro' || value === 'salone' ? value : 'base'
}

function dataDi(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
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

function livelloEffettivo(base: StatoPiano, dichiarato: Livello, stato: StatoPianoNome, adesso: Date): StatoPiano {
  const inProva = stato === 'prova'
  const giorniProva = inProva && base.scadeIl
    ? Math.max(0, Math.ceil((base.scadeIl.getTime() - adesso.getTime()) / (24 * 60 * 60 * 1000)))
    : null
  return { ...base, livello: dichiarato, inProva, giorniProva }
}

export function haAccesso(stato: StatoPiano, feature: FeatureKey): boolean {
  return RANK[stato.livello] >= RANK[LIVELLO[feature]]
}

export function aprePaywall(stato: StatoPiano, feature: FeatureKey): boolean {
  return !haAccesso(stato, feature)
}

export function propostaVisibile(mostraPiani: boolean, stato: StatoPiano): boolean {
  return mostraPiani === true && stato.livello === 'base'
}

export function livelloMinimo(feature: FeatureKey): Livello {
  return LIVELLO[feature]
}

export function mostraBadge(cfg: { mostraPiani?: boolean }, stato: StatoPiano, feature: FeatureKey): boolean {
  if (cfg.mostraPiani !== true) return false
  if (haAccesso(stato, feature)) return false
  return VISTA[feature] === 'badge'
}

export function puoProporre(ui: { ultimaProposta?: string }, creatoIl: Date, adesso: Date): boolean {
  if (adesso.getTime() - creatoIl.getTime() < PROPOSTA_MS) return false
  const ultima = dataDi(ui.ultimaProposta)
  if (ultima && adesso.getTime() - ultima.getTime() < PROPOSTA_MS) return false
  return true
}
