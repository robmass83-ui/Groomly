import type { DocumentData, Firestore } from 'firebase-admin/firestore'
import { linguaValida, type Lingua } from '../../../src/i18n/lingua'
import { eVip } from '../../../src/lib/funzioniPiano'
import { fonteDi, statoPiano, statoPianoNome, tracciaBetaDi, type ProMain } from '../../../src/lib/piano'
import { operatoreAutorizzato } from '../../../src/lib/salonPath'
import { erroreServer } from '../erroriServer'
import type { CodiceErrore } from '../../../src/i18n/errori'

export type TipoAvvisoBeta = 'invito' | 'invito-ritirato' | 'revoca' | 'estensione' | 'feedback' | 'fine-7' | 'fine-1' | 'finita'

// salons/{id}/avvisi/beta: l'ultimo evento della beta, lo legge solo il titolare. I testi li traduce l'app.
export interface AvvisoBeta {
  tipo: TipoAvvisoBeta
  piano: 'pro' | 'salone'
  scadeIl: string | null
  giorni: number | null
  testo: string | null
  at: string
  letto: boolean
}

export type TokenOperatore = { operatorEmail: string; admin?: boolean }

export const GIORNO_MS = 24 * 60 * 60 * 1000

export function nega(codice: CodiceErrore): never {
  throw erroreServer('failed-precondition', codice)
}

export function salonIdValido(id: unknown): id is string {
  return typeof id === 'string' && id !== '' && !id.includes('/') && id !== 'shared'
}

export function richiediOperatore(token: TokenOperatore): void {
  if (!operatoreAutorizzato({ admin: token.admin })) nega('accesso_negato')
}

export function proMainDi(dati: DocumentData | undefined): ProMain | undefined {
  if (!dati) return undefined
  const piano = dati.piano === 'base' || dati.piano === 'pro' || dati.piano === 'salone' ? dati.piano : undefined
  const stato = statoPianoNome(dati.stato)
  const scadeIl = typeof dati.scadeIl === 'string' || dati.scadeIl === null ? dati.scadeIl : undefined
  return {
    ...(piano ? { piano } : {}),
    ...(stato ? { stato } : {}),
    fonte: fonteDi(dati.fonte),
    ...(scadeIl !== undefined ? { scadeIl } : {}),
    ...tracciaBetaDi(dati),
  }
}

function vivo(doc: ProMain | undefined, adesso: Date): boolean {
  return statoPiano(doc, adesso).livello !== 'base'
}

export function betaInCorso(doc: ProMain | undefined, adesso: Date): boolean {
  return doc?.fonte === 'beta' && vivo(doc, adesso)
}

// Un piano acceso che la beta non deve sostituire: tutto tranne prova e beta (il VIP si salta prima, a parte).
export function pianoCheBlocca(doc: ProMain | undefined, adesso: Date): boolean {
  if (!doc || eVip(doc) || !vivo(doc, adesso)) return false
  return doc.fonte !== 'prova' && doc.fonte !== 'beta'
}

export function avviso(
  tipo: TipoAvvisoBeta,
  piano: 'pro' | 'salone',
  adesso: Date,
  extra: { scadeIl?: string | null; giorni?: number | null; testo?: string | null } = {},
): AvvisoBeta {
  return {
    tipo,
    piano,
    scadeIl: extra.scadeIl ?? null,
    giorni: extra.giorni ?? null,
    testo: extra.testo ?? null,
    at: adesso.toISOString(),
    letto: false,
  }
}

export function percorsoAvviso(salonId: string): string {
  return `salons/${salonId}/avvisi/beta`
}

/** Testo facoltativo ripulito: vuoto diventa null, oltre il massimo è un errore. */
export function testoFacoltativo(valore: unknown, max: number, errore: CodiceErrore): string | null {
  if (valore === undefined || valore === null) return null
  if (typeof valore !== 'string') nega(errore)
  const pulito = valore.trim()
  if (pulito.length > max) nega(errore)
  return pulito === '' ? null : pulito
}

export function giorniValidi(valore: unknown): valore is number {
  return typeof valore === 'number' && Number.isInteger(valore) && valore >= 1 && valore <= 365
}

export type Contatto = { email: string; lingua: Lingua; nome: string }

/** Email e lingua del titolare (accounts/{salonId}) e nome del salone, per avvisi ed email. */
export async function contattoTitolare(db: Firestore, salonId: string): Promise<Contatto> {
  const [account, settings] = await Promise.all([
    db.doc(`accounts/${salonId}`).get(),
    db.doc(`salons/${salonId}/settings/main`).get(),
  ])
  const dati = account.data()
  const business = settings.data()?.business as { salonName?: unknown } | undefined
  return {
    email: typeof dati?.email === 'string' ? dati.email.trim() : '',
    lingua: linguaValida(dati?.lingua) ?? 'it',
    nome: typeof business?.salonName === 'string' ? business.salonName.trim() : '',
  }
}

/** Il salone di chi chiama, se ne è il titolare. */
export async function titolareDi(db: Firestore, uid: string, negato: CodiceErrore = 'accesso_negato'): Promise<string> {
  if (!salonIdValido(uid)) nega(negato)
  const dati = (await db.doc(`accounts/${uid}`).get()).data()
  const ruolo = dati?.role
  if (!dati || dati.salonId !== uid || (ruolo !== undefined && ruolo !== null && ruolo !== '' && ruolo !== 'titolare')) nega(negato)
  return uid
}
