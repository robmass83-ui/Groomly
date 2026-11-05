import type { InvitoBeta, StatoInvitoBeta } from './betaInvito'
import { STATI_INVITO_BETA } from './betaInvito'
import {
  FASCE_PREZZO,
  GIUDIZI_FUNZIONE,
  PAGHERESTI,
  TESTO_FEEDBACK_MAX,
  type FasciaPrezzo,
  type FeedbackBeta,
  type GiudizioFunzione,
  type Pagheresti,
} from './betaFeedback'
import type { LivelloElenco } from './funzioniPiano'
import {
  FONTI_PIANO,
  eFeature,
  fonteDi,
  livelloMinimo,
  statoPianoNome,
  tracciaBetaDi,
  type FeatureKey,
  type FontePiano,
  type StatoPianoNome,
  type TracciaBeta,
} from './piano'
import type { DirectoryEntry, SalonDirectory } from './salonDirectory'

// Logica pura dell'Admin Manager: niente DOM e niente Firebase, così si prova da sola.

const GIORNO = 86_400_000
const LIVELLI: readonly LivelloElenco[] = ['base', 'pro', 'salone', 'vip']

export type SalonRow = {
  salonId: string
  ownerName: string
  salonName: string
  livello: LivelloElenco
  piano?: 'base' | 'pro' | 'salone'
  fonte: FontePiano | null
  stato?: StatoPianoNome
  scadeIl?: string | null
  traccia: TracciaBeta
}

type ProItem = Omit<SalonRow, 'ownerName' | 'salonName' | 'livello'> & { uid: string; enabled: boolean; livello?: LivelloElenco }

function pianoLetto(value: unknown): 'base' | 'pro' | 'salone' | undefined {
  return value === 'base' || value === 'pro' || value === 'salone' ? value : undefined
}

function proItems(directory: SalonDirectory): ProItem[] {
  const listed = Array.isArray(directory.pro) ? directory.pro : []
  return listed.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    if (typeof item.uid !== 'string' || typeof item.salonId !== 'string') return []
    const grezzo = item as Record<string, unknown>
    const scadeIl = typeof grezzo.scadeIl === 'string' || grezzo.scadeIl === null ? grezzo.scadeIl : undefined
    return [{
      uid: item.uid,
      salonId: item.salonId,
      enabled: item.enabled === true,
      livello: item.livello && LIVELLI.includes(item.livello) ? item.livello : undefined,
      piano: pianoLetto(grezzo.piano),
      fonte: fonteDi(grezzo.fonte),
      stato: statoPianoNome(grezzo.stato),
      scadeIl,
      traccia: tracciaBetaDi(grezzo.traccia),
    }]
  })
}

function ownerOf(entries: DirectoryEntry[], salonId: string, memberUids: ReadonlySet<string>): DirectoryEntry | undefined {
  return entries.find((entry) => entry.uid === salonId) ?? entries.find((entry) => memberUids.has(entry.uid))
}

/** Una riga per salone (titolare e soci insieme); `salon/shared` e gli id non validi non ci sono mai. */
export function salonRows(directory: SalonDirectory, senzaNome: string): SalonRow[] {
  const items = proItems(directory)
  const rows: SalonRow[] = []
  const seen = new Set<string>()
  for (const item of items) {
    if (item.salonId.trim() === '' || item.salonId === 'shared' || item.salonId.includes('/')) continue
    if (seen.has(item.salonId)) continue
    seen.add(item.salonId)
    const memberUids = new Set(items.filter((candidate) => candidate.salonId === item.salonId).map((candidate) => candidate.uid))
    const owner = ownerOf(directory.entries, item.salonId, memberUids)
    rows.push({
      salonId: item.salonId,
      ownerName: owner?.ownerName ?? senzaNome,
      salonName: owner?.salonName ?? '',
      livello: item.livello ?? (item.enabled ? 'salone' : 'base'),
      piano: item.piano,
      fonte: item.fonte,
      stato: item.stato,
      scadeIl: item.scadeIl,
      traccia: item.traccia,
    })
  }
  return rows
}

export function nomeSalone(row: SalonRow): string {
  return row.salonName.trim() !== '' ? row.salonName : row.ownerName
}

/** Giorni interi da `adesso` a `iso`, arrotondati per eccesso (0 se è già passato). */
export function giorniA(iso: string, adesso: Date): number {
  const fine = Date.parse(iso)
  if (!Number.isFinite(fine)) return 0
  return Math.max(0, Math.ceil((fine - adesso.getTime()) / GIORNO))
}

function futuro(iso: string | null | undefined, adesso: Date): boolean {
  if (!iso) return false
  const t = Date.parse(iso)
  return Number.isFinite(t) && t > adesso.getTime()
}

export type StatoBeta = 'in-beta' | 'invitato' | 'chiuso' | 'mai'

/** Fine della beta: la traccia (aggiornata da estendi) o la scadenza del piano se la fonte è beta. */
export function fineBetaDi(row: Pick<SalonRow, 'traccia' | 'fonte' | 'scadeIl'> | undefined): string | null {
  if (!row) return null
  if (row.traccia.betaFinoAl) return row.traccia.betaFinoAl
  return row.fonte === 'beta' && row.scadeIl ? row.scadeIl : null
}

export function statoBetaDi(invito: InvitoBeta | undefined, row: SalonRow | undefined, adesso: Date): StatoBeta {
  if (row?.fonte === 'beta' && row.stato !== 'scaduto' && futuro(fineBetaDi(row), adesso)) return 'in-beta'
  if (!invito) return 'mai'
  if (invito.stato === 'invitato') return futuro(invito.scadeInvitoIl, adesso) ? 'invitato' : 'chiuso'
  if (invito.stato === 'accettato') return futuro(fineBetaDi(row), adesso) ? 'in-beta' : 'chiuso'
  return 'chiuso'
}

export type PianoAvvisami = 'plus' | 'salone'
const PIANI_AVVISAMI: readonly PianoAvvisami[] = ['plus', 'salone']
export type InfoSalone = { ultimaAttivita?: string; citta?: string; avvisami?: PianoAvvisami[] }
export type FiltroAttivita = 'attivi7' | 'inattivi'
export type Filtri = { testo: string; piani: LivelloElenco[]; beta: StatoBeta[]; attivita: FiltroAttivita[]; avvisami: PianoAvvisami[] }
export type RigaLista = { row: SalonRow; livello: LivelloElenco; beta: StatoBeta; info: InfoSalone }

export const FILTRI_VUOTI: Filtri = { testo: '', piani: [], beta: [], attivita: [], avvisami: [] }

function piano(testo: string): string {
  return testo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function giorniDaAttivita(info: InfoSalone, adesso: Date): number | null {
  if (!info.ultimaAttivita) return null
  const t = Date.parse(info.ultimaAttivita)
  if (!Number.isFinite(t)) return null
  return Math.max(0, Math.floor((adesso.getTime() - t) / GIORNO))
}

export function soddisfaAttivita(riga: RigaLista, filtro: FiltroAttivita, adesso: Date): boolean {
  const giorni = giorniDaAttivita(riga.info, adesso)
  if (giorni === null) return false
  return filtro === 'attivi7' ? giorni <= 7 : giorni > 30
}

/** Filtri dell'elenco: gruppi diversi in E, valori dello stesso gruppo in O. */
export function filtraSaloni(righe: readonly RigaLista[], filtri: Filtri, adesso: Date): RigaLista[] {
  const cerca = piano(filtri.testo)
  return righe.filter((riga) => {
    if (cerca !== '') {
      const dove = piano([riga.row.salonName, riga.row.ownerName, riga.info.citta ?? ''].join(' '))
      if (!dove.includes(cerca)) return false
    }
    if (filtri.piani.length > 0 && !filtri.piani.includes(riga.livello)) return false
    if (filtri.beta.length > 0 && !filtri.beta.includes(riga.beta)) return false
    if (filtri.attivita.length > 0 && !filtri.attivita.some((f) => soddisfaAttivita(riga, f, adesso))) return false
    if (filtri.avvisami.length > 0 && !filtri.avvisami.some((p) => riga.info.avvisami?.includes(p))) return false
    return true
  })
}

export type VoceDaFare =
  | { tipo: 'invito-scade'; salonId: string; giorni: number }
  | { tipo: 'beta-finisce'; salonId: string; data: string; giorni: number }
  | { tipo: 'feedback'; salonId: string; feedbackId: string; voto: number; pagheresti: Pagheresti; quanto: FasciaPrezzo | null }
  | { tipo: 'suggerimenti'; n: number }

export const MAX_DA_FARE = 5

export function daFareOggi(input: {
  inviti: readonly InvitoBeta[]
  fineBeta: Readonly<Record<string, string>>
  feedback: readonly FeedbackLetto[]
  feedbackVisti: ReadonlySet<string>
  suggerimentiDaVedere: number
}, adesso: Date): VoceDaFare[] {
  const scadenze: VoceDaFare[] = []
  for (const invito of input.inviti) {
    if (invito.stato === 'invitato' && futuro(invito.scadeInvitoIl, adesso)) {
      const giorni = giorniA(invito.scadeInvitoIl, adesso)
      if (giorni <= 3) scadenze.push({ tipo: 'invito-scade', salonId: invito.salonId, giorni })
    }
    if (invito.stato === 'accettato') {
      const fine = input.fineBeta[invito.salonId]
      if (fine && futuro(fine, adesso)) {
        const giorni = giorniA(fine, adesso)
        if (giorni <= 7) scadenze.push({ tipo: 'beta-finisce', salonId: invito.salonId, data: fine, giorni })
      }
    }
  }
  scadenze.sort((a, b) => ('giorni' in a ? a.giorni : 0) - ('giorni' in b ? b.giorni : 0))
  const nuovi: VoceDaFare[] = input.feedback
    .filter((f) => !input.feedbackVisti.has(f.id) && adesso.getTime() - Date.parse(f.creatoIl) < 3 * GIORNO)
    .map((f) => ({ tipo: 'feedback', salonId: f.salonId, feedbackId: f.id, voto: f.voto, pagheresti: f.pagheresti, quanto: f.quanto }))
  const voci = [...scadenze, ...nuovi]
  if (input.suggerimentiDaVedere > 0) voci.push({ tipo: 'suggerimenti', n: input.suggerimentiDaVedere })
  return voci.slice(0, MAX_DA_FARE)
}

export type EstensioneBeta = { il: string; giorni: number; scadeIl: string }
/** Invito letto dall'operatore: in più le estensioni che B1 tiene nel documento. */
export type InvitoAdmin = InvitoBeta & { estensioni?: EstensioneBeta[] }

/** Estensioni di `betaInviti/{id}` (aggiunta di B1), lettura difensiva. */
export function estensioniDi(doc: unknown): EstensioneBeta[] {
  const grezzo = doc && typeof doc === 'object' ? (doc as Record<string, unknown>).estensioni : null
  if (!Array.isArray(grezzo)) return []
  return grezzo.flatMap((voce) => {
    if (!voce || typeof voce !== 'object') return []
    const v = voce as Record<string, unknown>
    if (typeof v.il !== 'string' || typeof v.scadeIl !== 'string' || typeof v.giorni !== 'number' || !Number.isFinite(v.giorni)) return []
    return [{ il: v.il, giorni: v.giorni, scadeIl: v.scadeIl }]
  })
}

export type CausaPiano =
  | { tipo: 'vip' }
  | { tipo: 'beta'; dal: string | null; fino: string | null }
  | { tipo: 'prova'; fino: string | null }
  | { tipo: 'manuale' }
  | { tipo: 'play' }
  | { tipo: 'go' }

/** Perché il salone ha il piano che ha. */
export function perchePiano(row: SalonRow, livello: LivelloElenco): CausaPiano {
  if (livello === 'vip') return { tipo: 'vip' }
  if (livello === 'base') return { tipo: 'go' }
  if (row.fonte === 'beta') return { tipo: 'beta', dal: row.traccia.betaDal ?? null, fino: fineBetaDi(row) }
  if (row.fonte === 'prova' || row.stato === 'prova') return { tipo: 'prova', fino: row.scadeIl ?? null }
  if (row.fonte === 'play') return { tipo: 'play' }
  return { tipo: 'manuale' }
}

export type FeedbackLetto = Omit<FeedbackBeta, 'voto'> & { id: string; voto: 1 | 2 | 3 | 4 | 5 }

function stringa(value: unknown, max = TESTO_FEEDBACK_MAX): string {
  return typeof value === 'string' ? value.slice(0, max) : ''
}

/** Lettura difensiva di betaFeedback/{id}: un documento malformato si scarta. */
export function feedbackBetaDi(id: string, doc: unknown): FeedbackLetto | null {
  if (!doc || typeof doc !== 'object') return null
  const d = doc as Record<string, unknown>
  const salonId = stringa(d.salonId)
  const piano = d.piano === 'pro' || d.piano === 'salone' ? d.piano : null
  const voto = typeof d.voto === 'number' && Number.isInteger(d.voto) && d.voto >= 1 && d.voto <= 5 ? d.voto as 1 | 2 | 3 | 4 | 5 : null
  const pagheresti = PAGHERESTI.find((p) => p === d.pagheresti)
  const creatoIl = stringa(d.creatoIl)
  if (salonId.trim() === '' || !piano || voto === null || !pagheresti || !Number.isFinite(Date.parse(creatoIl))) return null
  const funzioni: Partial<Record<FeatureKey, GiudizioFunzione>> = {}
  if (d.funzioni && typeof d.funzioni === 'object') {
    for (const [chiave, giudizio] of Object.entries(d.funzioni as Record<string, unknown>)) {
      const g = GIUDIZI_FUNZIONE.find((v) => v === giudizio)
      if (eFeature(chiave) && g) funzioni[chiave] = g
    }
  }
  return {
    id,
    salonId,
    uid: stringa(d.uid),
    piano,
    voto,
    funzioni,
    nonVa: stringa(d.nonVa),
    manca: stringa(d.manca),
    pagheresti,
    quanto: pagheresti === 'no' ? null : FASCE_PREZZO.find((f) => f === d.quanto) ?? null,
    ricontatto: d.ricontatto === true,
    fineBeta: d.fineBeta === true,
    versioneApp: stringa(d.versioneApp, 40),
    creatoIl,
  }
}

export type RiepilogoFeedback = {
  totale: number
  media: number | null
  voti: Record<1 | 2 | 3 | 4 | 5, number>
  pagheresti: Record<Pagheresti, number>
  quanto: Record<FasciaPrezzo, number>
  funzioni: Partial<Record<FeatureKey, Record<GiudizioFunzione, number>>>
}

export function riepilogoFeedback(lista: readonly FeedbackLetto[]): RiepilogoFeedback {
  const voti = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  const pagheresti = { si: 0, forse: 0, no: 0 }
  const quanto = { 'meno-5': 0, '5-10': 0, '10-20': 0, 'piu-20': 0 }
  const funzioni: RiepilogoFeedback['funzioni'] = {}
  let somma = 0
  for (const f of lista) {
    voti[f.voto] += 1
    somma += f.voto
    pagheresti[f.pagheresti] += 1
    if (f.quanto) quanto[f.quanto] += 1
    for (const [chiave, giudizio] of Object.entries(f.funzioni) as [FeatureKey, GiudizioFunzione][]) {
      const conta = funzioni[chiave] ?? { utile: 0, 'poco-utile': 0, 'non-usata': 0 }
      conta[giudizio] += 1
      funzioni[chiave] = conta
    }
  }
  return {
    totale: lista.length,
    media: lista.length === 0 ? null : Math.round((somma / lista.length) * 10) / 10,
    voti,
    pagheresti,
    quanto,
    funzioni,
  }
}

export type ContatoriAdmin = {
  saloni: { totali: number; attivi7: number; attivi30: number }
  perPiano: Record<LivelloElenco, number>
  perFonte: Record<FontePiano | 'nessuna', number>
  inviti: Record<StatoInvitoBeta, number>
  avvisami: Record<string, number>
  feedback: { totali: number; pagheresti: Record<Pagheresti, number> }
  /** Saloni con la beta in corso (aggiunta di B1); null se il server non lo manda. */
  inBeta: number | null
  /** Attività (e città, se arriva) per salone: da `ultimoAccesso` di B1 o da `perSalone`. Null se il server non manda nessuno dei due. */
  perSalone: Record<string, InfoSalone> | null
  emailOggi: number
  nuoviSaloni: string[]
  feedbackOrfani: number
}

function numero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0
}

function oggetto(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function conteggi<K extends string>(chiavi: readonly K[], value: unknown): Record<K, number> {
  const grezzo = oggetto(value)
  return Object.fromEntries(chiavi.map((k) => [k, numero(grezzo[k])])) as Record<K, number>
}

/** Esito di `contatoriAdmin` letto in modo difensivo. */
export function contatoriDi(data: unknown): ContatoriAdmin {
  const d = oggetto(data)
  const saloni = oggetto(d.saloni)
  const feedback = oggetto(d.feedback)
  const avvisami: Record<string, number> = {}
  for (const [chiave, n] of Object.entries(oggetto(d.avvisami))) {
    if (typeof n === 'number' && Number.isFinite(n) && n > 0) avvisami[chiave] = n
  }
  let perSalone: Record<string, InfoSalone> | null = null
  if (d.ultimoAccesso && typeof d.ultimoAccesso === 'object') {
    perSalone = {}
    for (const [id, quando] of Object.entries(d.ultimoAccesso as Record<string, unknown>)) {
      perSalone[id] = typeof quando === 'string' && Number.isFinite(Date.parse(quando)) ? { ultimaAttivita: quando } : {}
    }
  }
  if (d.perSalone && typeof d.perSalone === 'object') {
    perSalone = perSalone ?? {}
    for (const [id, info] of Object.entries(d.perSalone as Record<string, unknown>)) {
      if (!info || typeof info !== 'object') continue
      const i = info as Record<string, unknown>
      const letta: InfoSalone = {}
      if (typeof i.ultimaAttivita === 'string') letta.ultimaAttivita = i.ultimaAttivita
      if (typeof i.citta === 'string' && i.citta.trim() !== '') letta.citta = i.citta.trim()
      perSalone[id] = { ...perSalone[id], ...letta }
    }
  }
  for (const [id, chiavi] of Object.entries(oggetto(d.interesse))) {
    if (!Array.isArray(chiavi)) continue
    const piani = PIANI_AVVISAMI.filter((p) => chiavi.some((c) => typeof c === 'string' && pianoDellaChiave(c) === p))
    if (piani.length > 0) perSalone = { ...perSalone, [id]: { ...perSalone?.[id], avvisami: piani } }
  }
  return {
    saloni: { totali: numero(saloni.totali), attivi7: numero(saloni.attivi7), attivi30: numero(saloni.attivi30) },
    perPiano: conteggi(LIVELLI, d.perPiano),
    perFonte: conteggi([...FONTI_PIANO, 'nessuna'] as const, d.perFonte),
    inviti: conteggi(STATI_INVITO_BETA, d.inviti),
    avvisami,
    feedback: { totali: numero(feedback.totali), pagheresti: conteggi(PAGHERESTI, feedback.pagheresti) },
    inBeta: typeof d.inBeta === 'number' && Number.isFinite(d.inBeta) && d.inBeta >= 0 ? d.inBeta : null,
    perSalone,
    emailOggi: numero(d.emailOggi),
    nuoviSaloni: Array.isArray(d.nuoviSaloni) ? d.nuoviSaloni.filter((id): id is string => typeof id === 'string') : [],
    feedbackOrfani: numero(d.feedbackOrfani),
  }
}

export type VoceAvvisami = { chiave: string; n: number; piano: PianoAvvisami }

export function pianoDellaChiave(chiave: string): PianoAvvisami {
  if (chiave === 'piano-salone') return 'salone'
  if (chiave === 'piano-plus') return 'plus'
  return eFeature(chiave) && livelloMinimo(chiave) === 'salone' ? 'salone' : 'plus'
}

/** Avvisami per funzione, dal più chiesto, al massimo `max`. */
export function vociAvvisami(avvisami: Readonly<Record<string, number>>, max = 6): VoceAvvisami[] {
  return Object.entries(avvisami)
    .filter(([, n]) => n > 0)
    .map(([chiave, n]) => ({ chiave, n, piano: pianoDellaChiave(chiave) }))
    .sort((a, b) => b.n - a.n || a.chiave.localeCompare(b.chiave))
    .slice(0, max)
}

/** Funzioni da mostrare nel riepilogo feedback di un piano: quelle del piano (senza le nascoste) più quelle nelle risposte. */
export function funzioniDelPiano(piano: 'pro' | 'salone' | 'tutti', risposte: Partial<Record<FeatureKey, unknown>>, tutte: readonly FeatureKey[]): FeatureKey[] {
  const base = tutte.filter((f) => piano === 'tutti' || livelloMinimo(f) === piano)
  const extra = (Object.keys(risposte) as FeatureKey[]).filter((f) => !base.includes(f))
  return [...base, ...extra]
}
