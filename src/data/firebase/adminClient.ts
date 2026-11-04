import { invitoBetaDi, type InvitoBeta } from '../../lib/betaInvito'
import { leggiConfigPiani, type ConfigPiani } from '../../lib/configPiani'
import { contatoriDi, feedbackBetaDi, type ContatoriAdmin, type FeedbackLetto } from '../../lib/adminManager'
import { callCallableData, database, loadFirestore } from './client'
import { firebaseEnabled } from './enabled'
import { AppError } from '../errors'

// Callable e letture riservate agli operatori (Admin Manager). Firme: «Contratti» di 2026-11-04-beta-fondamenta-design.md.

export type MotivoSaltato = 'vip' | 'shared' | 'gia-invitato' | 'piano-attivo' | 'non-trovato'
export type EsitoInvito = { invitati: string[]; saltati: { salonId: string; motivo: MotivoSaltato }[] }
const MOTIVI: readonly MotivoSaltato[] = ['vip', 'shared', 'gia-invitato', 'piano-attivo', 'non-trovato']

function oggetto(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

export async function callInvitaBeta(input: { salonIds: string[]; piano: 'pro' | 'salone'; giorni: number; messaggio?: string }): Promise<EsitoInvito> {
  const data = oggetto(await callCallableData('invitaBeta', {
    salonIds: input.salonIds,
    piano: input.piano,
    giorni: input.giorni,
    ...(input.messaggio ? { messaggio: input.messaggio } : {}),
  }))
  const invitati = Array.isArray(data.invitati) ? data.invitati.filter((id): id is string => typeof id === 'string') : []
  const saltati = (Array.isArray(data.saltati) ? data.saltati : []).flatMap((voce) => {
    const v = oggetto(voce)
    const motivo = MOTIVI.find((m) => m === v.motivo)
    return typeof v.salonId === 'string' && motivo ? [{ salonId: v.salonId, motivo }] : []
  })
  return { invitati, saltati }
}

export async function callRevocaBeta(input: { salonId: string; testo?: string }): Promise<{ ok: true; emailStato: 'inviata' | 'non_inviata' | null }> {
  const data = oggetto(await callCallableData('revocaBeta', { salonId: input.salonId, ...(input.testo ? { testo: input.testo } : {}) }))
  const emailStato = data.emailStato === 'inviata' || data.emailStato === 'non_inviata' ? data.emailStato : null
  return { ok: true, emailStato }
}

export async function callEstendiBeta(input: { salonId: string; giorni: number }): Promise<{ ok: true; scadeIl: string }> {
  const data = oggetto(await callCallableData('estendiBeta', { salonId: input.salonId, giorni: input.giorni }))
  return { ok: true, scadeIl: typeof data.scadeIl === 'string' ? data.scadeIl : '' }
}

export async function callSegnaEarlyAdopter(input: { salonId: string; valore: boolean }): Promise<void> {
  await callCallableData('segnaEarlyAdopter', { salonId: input.salonId, valore: input.valore })
}

export async function callContatoriAdmin(): Promise<ContatoriAdmin> {
  return contatoriDi(await callCallableData('contatoriAdmin', {}))
}

/** Callable di B1 (firma della spec A2): scrive `mostraPiani` nella radice di config/globale. */
export async function callImpostaMostraPiani(valore: boolean): Promise<void> {
  await callCallableData('impostaMostraPiani', { valore })
}

/** Fase 4 (B4 implementa la function): annuncio dei pagamenti a tutti. */
export async function callAnnunciaPagamenti(data: string): Promise<{ ok: true; email: number }> {
  const esito = oggetto(await callCallableData('annunciaPagamenti', { data }))
  return { ok: true, email: typeof esito.email === 'number' ? esito.email : 0 }
}

export const LIMITE_FEEDBACK_ADMIN = 400

export async function elencoInvitiBeta(): Promise<InvitoBeta[]> {
  if (!firebaseEnabled()) throw new AppError('Connessione assente', 'auth_offline')
  const db = await database()
  const { collection, getDocs } = await loadFirestore()
  const snap = await getDocs(collection(db, 'betaInviti'))
  return snap.docs.flatMap((doc) => {
    const invito = invitoBetaDi({ salonId: doc.id, ...doc.data() })
    return invito ? [invito] : []
  })
}

/** Inviti passati di un salone, dal più recente. */
export async function storicoInvitoBeta(salonId: string): Promise<InvitoBeta[]> {
  if (!firebaseEnabled()) throw new AppError('Connessione assente', 'auth_offline')
  const db = await database()
  const { collection, getDocs } = await loadFirestore()
  const snap = await getDocs(collection(db, 'betaInviti', salonId, 'storico'))
  return snap.docs
    .flatMap((doc) => {
      const invito = invitoBetaDi({ salonId, ...doc.data() })
      return invito ? [invito] : []
    })
    .sort((a, b) => b.invitatoIl.localeCompare(a.invitatoIl))
}

export async function elencoFeedbackBeta(): Promise<FeedbackLetto[]> {
  if (!firebaseEnabled()) throw new AppError('Connessione assente', 'auth_offline')
  const db = await database()
  const { collection, getDocs, limit, orderBy, query } = await loadFirestore()
  const snap = await getDocs(query(collection(db, 'betaFeedback'), orderBy('creatoIl', 'desc'), limit(LIMITE_FEEDBACK_ADMIN)))
  return snap.docs.flatMap((doc) => {
    const letto = feedbackBetaDi(doc.id, doc.data())
    return letto ? [letto] : []
  })
}

export type ConfigGlobale = { mostraPiani: boolean; abbonamentiAttivi: boolean; piani: ConfigPiani }

export function configGlobaleDi(data: unknown): ConfigGlobale {
  const d = oggetto(data)
  return { mostraPiani: d.mostraPiani === true, abbonamentiAttivi: d.abbonamentiAttivi === true, piani: leggiConfigPiani(d) }
}

export async function listenConfigGlobale(onData: (config: ConfigGlobale) => void): Promise<() => void> {
  if (!firebaseEnabled()) {
    onData(configGlobaleDi(null))
    return () => undefined
  }
  const db = await database()
  const { doc, onSnapshot } = await loadFirestore()
  return onSnapshot(doc(db, 'config', 'globale'), (snap) => {
    onData(configGlobaleDi(snap.exists() ? snap.data() : null))
  }, () => onData(configGlobaleDi(null)))
}
