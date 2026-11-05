import { linguaValida, type Lingua } from '../../i18n/lingua'
import { STATI_ASSISTENZA, type DocAssistenza, type EsitoEmailRisposta, type FonteAssistenza, type RispostaAssistenza, type StatoAssistenza } from '../../lib/assistenza'
import { tipoAvviso, type TipoAvviso, type Traduzioni } from '../../lib/avvisiSistema'
import { leggiConfigTour, type ConfigTour } from '../../lib/tourBenvenuto'
import { invitoBetaDi } from '../../lib/betaInvito'
import { leggiConfigPiani, type ConfigPiani } from '../../lib/configPiani'
import { contatoriDi, estensioniDi, feedbackBetaDi, type ContatoriAdmin, type FeedbackLetto, type InvitoAdmin } from '../../lib/adminManager'
import { callCallableData, database, loadFirestore } from './client'
import { firebaseEnabled } from './enabled'
import { erroreApp } from '../errors'

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

export type SchedaAggregata = { cani: number; appuntamenti: number; appuntamenti30: number; persone: number; versioneApp: string | null; lingua: Lingua | null }

export async function callSchedaSaloneAdmin(salonId: string): Promise<SchedaAggregata> {
  const d = oggetto(await callCallableData('schedaSaloneAdmin', { salonId }))
  const numero = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0)
  return {
    cani: numero(d.cani),
    appuntamenti: numero(d.appuntamenti),
    appuntamenti30: numero(d.appuntamenti30),
    persone: numero(d.persone),
    versioneApp: typeof d.versioneApp === 'string' ? d.versioneApp : null,
    lingua: linguaValida(d.lingua),
  }
}

export type ModelloAssistenza = { id: string; titolo: string; testo: string }

function rispostaDi(value: unknown): RispostaAssistenza | null {
  const r = oggetto(value)
  if (typeof r.testo !== 'string' || typeof r.quando !== 'string') return null
  const email = r.email === 'inviata' || r.email === 'non_inviata' || r.email === 'limite' ? r.email : null
  return { testo: r.testo, quando: r.quando, email }
}

/** I documenti di Assistenza, per chiave: una richiesta che non c'è non è ancora stata toccata. */
export async function elencoAssistenza(): Promise<Record<string, DocAssistenza>> {
  if (!firebaseEnabled()) throw erroreApp('auth_offline')
  const db = await database()
  const { collection, getDocs } = await loadFirestore()
  const snap = await getDocs(collection(db, 'assistenza'))
  return Object.fromEntries(snap.docs.flatMap((doc) => {
    const d = doc.data()
    const stato = STATI_ASSISTENZA.find((s) => s === d.stato)
    if (!stato) return []
    const risposte = (Array.isArray(d.risposte) ? d.risposte : []).flatMap((r) => rispostaDi(r) ?? [])
    return [[doc.id, { stato, risposte }]]
  }))
}

export async function elencoModelliAssistenza(): Promise<ModelloAssistenza[]> {
  if (!firebaseEnabled()) throw erroreApp('auth_offline')
  const db = await database()
  const { collection, getDocs } = await loadFirestore()
  const snap = await getDocs(collection(db, 'assistenzaModelli'))
  return snap.docs.flatMap((doc) => {
    const { titolo, testo } = doc.data()
    return typeof titolo === 'string' && typeof testo === 'string' ? [{ id: doc.id, titolo, testo }] : []
  })
}

export async function callAvviaAssistenza(): Promise<string> {
  const { dal } = oggetto(await callCallableData('avviaAssistenza', {}))
  return typeof dal === 'string' ? dal : ''
}

export async function callRispondiAssistenza(input: { fonte: FonteAssistenza; id: string; testo: string; anchEmail: boolean; idRichiesta: string }): Promise<EsitoEmailRisposta> {
  const { email } = oggetto(await callCallableData('rispondiAssistenza', input))
  return email === 'inviata' || email === 'non_inviata' || email === 'limite' ? email : null
}

export async function callImpostaStatoAssistenza(input: { fonte: FonteAssistenza; id: string; stato: StatoAssistenza }): Promise<void> {
  await callCallableData('impostaStatoAssistenza', input)
}

export async function callSalvaModelloAssistenza(input: { id?: string; titolo: string; testo: string }): Promise<string> {
  const { id } = oggetto(await callCallableData('salvaModelloAssistenza', input))
  return typeof id === 'string' ? id : ''
}

export async function callEliminaModelloAssistenza(id: string): Promise<void> {
  await callCallableData('eliminaModelloAssistenza', { id })
}

export type TipoEmailComunicazione = 'nessuna' | 'promozionale' | 'servizio'
export type InputComunicazione = {
  tipo: TipoAvviso
  salonIds: string[] | 'tutti'
  testi: { it: { titolo: string; testo: string } } & Traduzioni
  email: TipoEmailComunicazione
  idRichiesta: string
}
export type AnteprimaComunicazione = { account: number; email: number; inItaliano: number; senzaConsenso: number; restanoOggi: number; massimo: number; bloccata: boolean }
export type VoceComunicazione = {
  id: string
  quando: string
  tipo: TipoAvviso
  titolo: string
  saloni: number | 'tutti'
  emailTipo: TipoEmailComunicazione
  account: number
  email: number
  inviate: number
  eliminata: boolean
  inCorso: boolean
}

function intero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export async function callAnteprimaComunicazione(input: Omit<InputComunicazione, 'idRichiesta'>): Promise<AnteprimaComunicazione> {
  const d = oggetto(await callCallableData('anteprimaComunicazione', input))
  return {
    account: intero(d.account),
    email: intero(d.email),
    inItaliano: intero(d.inItaliano),
    senzaConsenso: intero(d.senzaConsenso),
    restanoOggi: intero(d.restanoOggi),
    massimo: intero(d.massimo),
    bloccata: d.bloccata === true,
  }
}

export async function callInviaComunicazione(input: InputComunicazione): Promise<{ inviate: number; nonInviate: number }> {
  const d = oggetto(await callCallableData('inviaComunicazione', input))
  return { inviate: intero(d.inviate), nonInviate: intero(d.nonInviate) }
}

export async function callRiprendiComunicazione(id: string): Promise<{ inviate: number; nonInviate: number }> {
  const d = oggetto(await callCallableData('riprendiComunicazione', { id }))
  return { inviate: intero(d.inviate), nonInviate: intero(d.nonInviate) }
}

export async function callEliminaComunicazione(id: string): Promise<void> {
  await callCallableData('eliminaComunicazione', { id })
}

export async function elencoComunicazioni(): Promise<VoceComunicazione[]> {
  if (!firebaseEnabled()) throw erroreApp('auth_offline')
  const db = await database()
  const { collection, getDocs, limit, orderBy, query } = await loadFirestore()
  const snap = await getDocs(query(collection(db, 'comunicazioni'), orderBy('quando', 'desc'), limit(50)))
  return snap.docs.map((doc) => {
    const d = doc.data()
    return {
      id: doc.id,
      quando: typeof d.quando === 'string' ? d.quando : '',
      tipo: tipoAvviso(d.tipo),
      titolo: typeof oggetto(d.testo).titolo === 'string' ? oggetto(d.testo).titolo as string : '',
      saloni: d.salonIds === 'tutti' ? 'tutti' : Array.isArray(d.salonIds) ? d.salonIds.length : 0,
      emailTipo: d.emailTipo === 'promozionale' || d.emailTipo === 'servizio' ? d.emailTipo : 'nessuna',
      account: intero(d.account),
      email: intero(d.email),
      inviate: intero(d.inviate),
      eliminata: d.eliminata === true,
      inCorso: typeof d.inCorsoFino === 'number' && d.inCorsoFino > Date.now(),
    }
  })
}

export const LIMITE_REGISTRO = 50
export type VoceRegistro = { id: string; quando: string; azione: string; salonId: string | null; dettagli: Record<string, unknown> }

/** Il registro delle azioni, dal più recente: `dopo` è il `quando` dell'ultima voce già vista. */
export async function elencoAdminLog(filtro: { dopo?: string; azione?: string; salonId?: string }): Promise<VoceRegistro[]> {
  if (!firebaseEnabled()) throw erroreApp('auth_offline')
  const db = await database()
  const { collection, getDocs, limit, orderBy, query, startAfter, where } = await loadFirestore()
  const snap = await getDocs(query(
    collection(db, 'adminLog'),
    ...(filtro.azione ? [where('azione', '==', filtro.azione)] : []),
    ...(filtro.salonId ? [where('salonId', '==', filtro.salonId)] : []),
    orderBy('quando', 'desc'),
    ...(filtro.dopo ? [startAfter(filtro.dopo)] : []),
    limit(LIMITE_REGISTRO),
  ))
  return snap.docs.map((doc) => {
    const d = doc.data()
    return {
      id: doc.id,
      quando: typeof d.quando === 'string' ? d.quando : '',
      azione: typeof d.azione === 'string' ? d.azione : '',
      salonId: typeof d.salonId === 'string' ? d.salonId : null,
      dettagli: oggetto(d.dettagli),
    }
  })
}

export const LIMITE_FEEDBACK_ADMIN = 400

function invitoAdminDi(salonId: string, data: Record<string, unknown>): InvitoAdmin | null {
  const invito = invitoBetaDi({ salonId, ...data })
  return invito ? { ...invito, estensioni: estensioniDi(data) } : null
}

export async function elencoInvitiBeta(): Promise<InvitoAdmin[]> {
  if (!firebaseEnabled()) throw erroreApp('auth_offline')
  const db = await database()
  const { collection, getDocs } = await loadFirestore()
  const snap = await getDocs(collection(db, 'betaInviti'))
  return snap.docs.flatMap((doc) => {
    const invito = invitoAdminDi(doc.id, doc.data())
    return invito ? [invito] : []
  })
}

/** Inviti passati di un salone, dal più recente. */
export async function storicoInvitoBeta(salonId: string): Promise<InvitoAdmin[]> {
  if (!firebaseEnabled()) throw erroreApp('auth_offline')
  const db = await database()
  const { collection, getDocs } = await loadFirestore()
  const snap = await getDocs(collection(db, 'betaInviti', salonId, 'storico'))
  return snap.docs
    .flatMap((doc) => {
      const invito = invitoAdminDi(salonId, doc.data())
      return invito ? [invito] : []
    })
    .sort((a, b) => b.invitatoIl.localeCompare(a.invitatoIl))
}

export async function elencoFeedbackBeta(): Promise<FeedbackLetto[]> {
  if (!firebaseEnabled()) throw erroreApp('auth_offline')
  const db = await database()
  const { collection, getDocs, limit, orderBy, query } = await loadFirestore()
  const snap = await getDocs(query(collection(db, 'betaFeedback'), orderBy('creatoIl', 'desc'), limit(LIMITE_FEEDBACK_ADMIN)))
  return snap.docs.flatMap((doc) => {
    const letto = feedbackBetaDi(doc.id, doc.data())
    return letto ? [letto] : []
  })
}

export type ConfigGlobale = { mostraPiani: boolean; abbonamentiAttivi: boolean; piani: ConfigPiani; tour: ConfigTour }

export function configGlobaleDi(data: unknown): ConfigGlobale {
  const d = oggetto(data)
  return { mostraPiani: d.mostraPiani === true, abbonamentiAttivi: d.abbonamentiAttivi === true, piani: leggiConfigPiani(d), tour: leggiConfigTour(d) }
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
