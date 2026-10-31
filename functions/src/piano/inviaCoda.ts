import { randomBytes } from 'node:crypto'
import { emailMessaggio, escapaHtml, mailPostoLibero } from '../../../src/i18n/emailHtml'
import { dataConOra } from '../../../src/i18n/format'
import type { Lingua } from '../../../src/i18n/lingua'
import { dovute, emailValida, type RigaCoda, type TipoCoda } from '../../../src/lib/codaEmail'
import { oraAncoraDavanti, type BucoAttesa, type IscrittoAttesa } from '../../../src/lib/listaAttesa'
import { haAccesso, statoPiano, type FeatureKey, type ProMain } from '../../../src/lib/piano'
import { TETTO_EMAIL_GIORNO } from '../../../src/lib/promemoriaEmail'
import {
  righeAuguri,
  righePromemoria,
  righePronto,
  righeRecensione,
  type CaneAuguri,
  type VisitaPromemoria,
  type VisitaPronto,
  type VisitaRecensione,
} from '../../../src/lib/righeServizio'
import { romeIso } from '../../../src/lib/romeTime'
import { soloAutomatico, type SceltaServizio } from '../../../src/lib/serviziEmail'
import type { PropostaRecensione } from '../../../src/lib/recensioni'
import { postBrevoHtml } from '../brevoMail'
import { offerteDaCreare } from './offerteAttesa'

const TOKEN = /^[A-Za-z0-9_-]{16,128}$/
const CHIAVI: TipoCoda[] = ['promemoria', 'pronto', 'auguri', 'recensione', 'attesa']

export interface RigaInvio extends RigaCoda {
  token?: string
  url?: string
}

export interface OffertaAttesaDoc {
  id: string
  token: string
  appointmentId: string
  iscrittoId: string
  inizio: string
  inviataIl: string | null
  url: string
}

export interface EsitoCoda {
  inviate: number
  riprova: string[]
  attese: string[]
  spedite: string[]
  token: { id: string; token: string }[]
}

export interface VisitaMinuto {
  id: string
  dogId: string
  start: Date
  status: string
  nomeCane: string
  email?: string
  minuti?: number
  chiusoIl?: string | null
  noteProblema?: boolean
  updatedAt?: Date
}

export interface CaneMinuto {
  id: string
  nome: string
  nomeCliente?: string
  email?: string
  birthMonth?: number
  birthDay?: number
  attivo: boolean
}

export interface AttesaMinuto {
  id: string
  dogId: string
  durataMin: number
  preferenza: 'mattina' | 'pomeriggio' | 'qualsiasi'
  arrivato: string
  giorno?: string
}

export function serviziAccesi(servizi: unknown): TipoCoda[] {
  if (!servizi || typeof servizi !== 'object') return []
  const record = servizi as Record<string, { modo?: unknown } | undefined>
  return CHIAVI.filter((chiave) => {
    const modo = record[chiave]?.modo
    return modo === 'manuale' || modo === 'automatico'
  })
}

const FUNZIONE_DI: Record<TipoCoda, FeatureKey> = {
  promemoria: 'promemoriaAuto',
  pronto: 'pronto',
  auguri: 'compleanno',
  recensione: 'recensioni',
  attesa: 'listaAttesa',
}

// Le email automatiche seguono il piano: se il livello non le comprende, la coda non spedisce.
export function serviziPerPiano(servizi: unknown, pro: ProMain | undefined, adesso: Date): unknown {
  if (!servizi || typeof servizi !== 'object') return servizi
  const stato = statoPiano(pro, adesso)
  const copia: Record<string, unknown> = { ...(servizi as Record<string, unknown>) }
  for (const chiave of CHIAVI) {
    if (haAccesso(stato, FUNZIONE_DI[chiave])) continue
    const attuale = copia[chiave]
    copia[chiave] = { ...(attuale && typeof attuale === 'object' ? attuale : {}), modo: 'spento' }
  }
  return copia
}

export function righeDelGiro(righe: readonly RigaInvio[], accesi: readonly TipoCoda[]): RigaInvio[] {
  const aperti = new Set(accesi)
  return righe.flatMap((riga) => {
    if (!aperti.has(riga.tipo)) return []
    if (riga.stato === 'non_inviata') return [{ ...riga, stato: 'in_coda' as const }]
    return [{ ...riga }]
  })
}

function linkSilenzio(salonId: string, token: string): string {
  const query = new URLSearchParams({ mode: 'silenzio', salon: salonId, token })
  return `https://groomlyapp.it/azione?${query.toString()}`
}

function inAttesa(riga: RigaCoda): boolean {
  return riga.motivo === 'manca_email' || riga.motivo === 'pagina_assente' || !emailValida(riga.email)
}

function dataRoma(iso: string): Date | null {
  const istante = new Date(iso)
  if (iso === '' || Number.isNaN(istante.getTime())) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(romeIso(istante))
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]))
}

export async function inviaCoda(input: {
  apiKey: string
  righe: readonly RigaInvio[]
  emailOggi: number
  salonId?: string
  lingua?: Lingua
  salone?: string
  replyTo?: { email: string; name: string }
  fetchImpl?: typeof fetch
  adesso?: Date
  subito?: boolean
}): Promise<EsitoCoda> {
  const scelte = input.subito
    ? input.righe.filter((riga) => riga.stato === 'in_coda' || riga.stato === 'non_inviata')
    : dovute(input.righe, input.adesso ?? new Date())
  const attese: string[] = []
  const pronte: RigaInvio[] = []
  for (const riga of scelte) {
    if (inAttesa(riga)) attese.push(riga.id)
    else pronte.push(riga)
  }
  const nelTetto = pronte.slice(0, Math.max(0, TETTO_EMAIL_GIORNO - input.emailOggi))
  if (!input.apiKey) {
    return { inviate: 0, riprova: nelTetto.map((riga) => riga.id), attese, spedite: [], token: [] }
  }

  const lingua = input.lingua ?? 'it'
  const salonePassato = input.salone ?? ''
  const replyTo = input.replyTo && emailValida(input.replyTo.email) ? input.replyTo : undefined
  const token: EsitoCoda['token'] = []
  const riprova: string[] = []
  const spedite: string[] = []
  let inviate = 0
  for (const riga of nelTetto) {
    const gia = riga.token && TOKEN.test(riga.token) ? riga.token : ''
    const assegnato = gia || randomBytes(16).toString('hex')
    if (!gia) token.push({ id: riga.id, token: assegnato })
    const orologio = riga.tipo === 'promemoria' && riga.inizio ? dataRoma(riga.inizio) : null
    const quando = orologio ? dataConOra(lingua, orologio) : ''
    const mail = emailMessaggio(lingua, riga.tipo, {
      cliente: riga.nomeCliente ?? '',
      cane: riga.nomeCane,
      salone: replyTo?.name && replyTo.name !== 'Groomly' ? replyTo.name : salonePassato,
      quando,
      rispondi: Boolean(replyTo),
      url: riga.url,
      silenzio: input.salonId ? linkSilenzio(input.salonId, assegnato) : undefined,
    })
    try {
      await postBrevoHtml(input.apiKey, riga.email, mail.oggetto, mail.html, input.fetchImpl ?? fetch, replyTo)
      inviate += 1
      spedite.push(riga.id)
    } catch {
      riprova.push(riga.id)
    }
  }
  return { inviate, riprova, attese, spedite, token }
}

function corpoHtmlPostoLibero(testo: string, url: string): string {
  const html = escapaHtml(testo).replaceAll('\n', '<br>')
  const indirizzo = escapaHtml(url)
  return html.replace(indirizzo, `<a href="${indirizzo}">${indirizzo}</a>`)
}

export async function inviaOfferteAttesa(input: {
  apiKey: string
  offerte: readonly OffertaAttesaDoc[]
  iscritti: readonly IscrittoAttesa[]
  emailOggi: number
  lingua?: Lingua
  salone?: string
  replyTo?: { email: string; name: string }
  fetchImpl?: typeof fetch
  adesso?: Date
  salva?: (offerta: OffertaAttesaDoc) => Promise<void>
}): Promise<{ inviate: number; offerte: OffertaAttesaDoc[]; scritturaFallita: boolean }> {
  const adesso = input.adesso ?? new Date()
  const offerte = input.offerte.map((offerta) => ({ ...offerta }))
  if (!input.apiKey) return { inviate: 0, offerte, scritturaFallita: false }

  const lingua = input.lingua ?? 'it'
  const salone = input.salone ?? ''
  const replyTo = input.replyTo && emailValida(input.replyTo.email) ? input.replyTo : undefined
  const perId = new Map(input.iscritti.map((iscritto) => [iscritto.id, iscritto]))
  let margine = Math.max(0, TETTO_EMAIL_GIORNO - input.emailOggi)
  let inviate = 0
  for (const offerta of offerte) {
    if (offerta.inviataIl) continue
    if (margine <= 0) break
    const iscritto = perId.get(offerta.iscrittoId)
    if (!iscritto || !emailValida(iscritto.email)) continue
    const inizio = dataRoma(offerta.inizio)
    const mail = mailPostoLibero({
      lingua,
      nomeSalone: replyTo?.name && replyTo.name !== 'Groomly' ? replyTo.name : salone,
      quando: inizio ? dataConOra(lingua, inizio) : '',
      url: offerta.url,
    })
    margine -= 1
    try {
      await postBrevoHtml(
        input.apiKey,
        iscritto.email.trim(),
        mail.oggetto,
        corpoHtmlPostoLibero(mail.testo, offerta.url),
        input.fetchImpl ?? fetch,
        replyTo,
      )
      offerta.inviataIl = adesso.toISOString()
      inviate += 1
    } catch {
      offerta.inviataIl = null
      continue
    }
    if (input.salva) {
      try {
        await input.salva({ ...offerta })
      } catch {
        // Lo stato non è salvato: ci si ferma, così il resto della lista non riceve due mail.
        return { inviate, offerte, scritturaFallita: true }
      }
    }
  }
  return { inviate, offerte, scritturaFallita: false }
}

export function applicaEsito(righe: readonly RigaInvio[], esito: EsitoCoda): RigaInvio[] {
  const spedite = new Set(esito.spedite)
  const riprova = new Set(esito.riprova)
  const token = new Map(esito.token.map((voce) => [voce.id, voce.token]))
  return righe.map((riga) => {
    const nuovo = token.get(riga.id)
    const prossima: RigaInvio = nuovo ? { ...riga, token: nuovo } : { ...riga }
    if (spedite.has(riga.id)) return { ...prossima, stato: 'inviata', motivo: '' }
    if (riprova.has(riga.id)) return { ...prossima, stato: 'non_inviata', motivo: prossima.motivo || 'posta' }
    return prossima
  })
}

function sceltaDi(servizi: unknown, tipo: TipoCoda): SceltaServizio {
  if (!servizi || typeof servizi !== 'object') return { modo: 'spento' }
  const raw = (servizi as Record<string, SceltaServizio | undefined>)[tipo]
  if (!raw || (raw.modo !== 'manuale' && raw.modo !== 'automatico')) return { modo: 'spento' }
  if (soloAutomatico(tipo) && raw.modo === 'manuale') return { ...raw, modo: 'automatico' }
  return raw
}

function conservaToken(prima: readonly RigaInvio[], dopo: readonly RigaCoda[]): RigaInvio[] {
  const note = new Map(prima.map((riga) => [riga.id, riga]))
  return dopo.map((riga) => {
    const vecchia = note.get(riga.id)
    return {
      ...riga,
      ...(vecchia?.token ? { token: vecchia.token } : {}),
      ...(vecchia?.url ? { url: vecchia.url } : {}),
    }
  })
}

export function righeDelMinuto(input: {
  adesso: Date
  servizi: unknown
  esistenti: readonly RigaInvio[]
  visite: readonly VisitaMinuto[]
  cani: readonly CaneMinuto[]
  attesa: readonly AttesaMinuto[]
  slug: string
  linkRecensioni: string
  proposte: readonly PropostaRecensione[]
  iscritti?: readonly IscrittoAttesa[]
  offerte?: readonly { id: string; inviataIl?: string | null; token?: string; url?: string }[]
  buchi?: readonly BucoAttesa[]
  tokenDi?: () => string
}): { accesi: TipoCoda[]; righe: RigaInvio[]; daSpedire: RigaInvio[]; offerteAttesa: OffertaAttesaDoc[] } {
  const accesi = serviziAccesi(input.servizi)
  const aperti = new Set(accesi)
  const attivi = new Set(input.cani.filter((cane) => cane.attivo).map((cane) => cane.id))
  const perCane = new Map(input.cani.map((cane) => [cane.id, cane]))
  let righe: RigaInvio[] = input.esistenti.map((riga) => ({ ...riga }))

  const nomeEmail = (visita: VisitaMinuto) => {
    const cane = perCane.get(visita.dogId)
    return {
      nomeCane: visita.nomeCane || cane?.nome || '',
      email: visita.email || cane?.email || '',
      nomeCliente: cane?.nomeCliente ?? '',
    }
  }

  const delGruppo = (attivo: boolean): VisitaMinuto[] => {
    const viste = input.visite.filter((visita) => visita.dogId !== '' && attivi.has(visita.dogId) === attivo)
    if (attivo) return viste
    const gia = new Set(viste.map((visita) => visita.dogId))
    const extra = input.cani.filter((cane) => !cane.attivo && !gia.has(cane.id)).map((cane) => ({
      id: `cane:${cane.id}`,
      dogId: cane.id,
      start: input.adesso,
      status: 'programmato',
      nomeCane: cane.nome,
      email: cane.email,
    }))
    return [...viste, ...extra]
  }

  if (aperti.has('promemoria')) {
    const scelta = sceltaDi(input.servizi, 'promemoria')
    const comeVisita = (visita: VisitaMinuto): VisitaPromemoria => {
      const testi = nomeEmail(visita)
      return { id: visita.id, dogId: visita.dogId, start: visita.start, status: visita.status, nomeCane: testi.nomeCane, nomeCliente: testi.nomeCliente, email: testi.email }
    }
    righe = conservaToken(righe, righePromemoria(delGruppo(true).map(comeVisita), scelta, righe, true))
    righe = conservaToken(righe, righePromemoria(delGruppo(false).map(comeVisita), scelta, righe, false))
  }

  if (aperti.has('pronto') || aperti.has('recensione')) {
    const comeChiusa = (visita: VisitaMinuto): VisitaPronto & VisitaRecensione => {
      const testi = nomeEmail(visita)
      return {
        id: visita.id,
        dogId: visita.dogId,
        status: visita.status,
        chiusoIl: visita.chiusoIl,
        nomeCane: testi.nomeCane,
        nomeCliente: testi.nomeCliente,
        email: testi.email,
        noteProblema: visita.noteProblema === true,
      }
    }
    if (aperti.has('pronto')) {
      const scelta = sceltaDi(input.servizi, 'pronto')
      righe = conservaToken(righe, righePronto(delGruppo(true).map(comeChiusa), scelta, righe, true, input.adesso))
      righe = conservaToken(righe, righePronto(delGruppo(false).map(comeChiusa), scelta, righe, false, input.adesso))
    }
    if (aperti.has('recensione')) {
      const scelta = sceltaDi(input.servizi, 'recensione')
      righe = conservaToken(righe, righeRecensione(delGruppo(true).map(comeChiusa), scelta, input.linkRecensioni, righe, input.adesso, input.proposte, true))
      righe = conservaToken(righe, righeRecensione(delGruppo(false).map(comeChiusa), scelta, input.linkRecensioni, righe, input.adesso, input.proposte, false))
    }
  }

  if (aperti.has('auguri')) {
    const scelta = sceltaDi(input.servizi, 'auguri')
    const comeCane = (cane: CaneMinuto): CaneAuguri => ({
      id: cane.id,
      nome: cane.nome,
      nomeCliente: cane.nomeCliente,
      email: cane.email,
      birthMonth: cane.birthMonth,
      birthDay: cane.birthDay,
    })
    righe = conservaToken(righe, righeAuguri(input.cani.filter((cane) => cane.attivo).map(comeCane), scelta, righe, input.adesso, true))
    righe = conservaToken(righe, righeAuguri(input.cani.filter((cane) => !cane.attivo).map(comeCane), scelta, righe, input.adesso, false))
  }

  if (aperti.has('attesa')) {
    righe = righe.map((riga) =>
      riga.tipo === 'attesa' && (riga.stato === 'in_coda' || riga.stato === 'non_inviata')
        ? { ...riga, stato: 'chiusa' }
        : riga,
    )
  }

  if (aperti.has('recensione') && input.linkRecensioni.startsWith('https://')) {
    const link = input.linkRecensioni
    righe = righe.map((riga) => (riga.tipo === 'recensione' ? { ...riga, url: link } : riga))
  }

  const offerteAttesa: OffertaAttesaDoc[] = []
  const iscritti = input.iscritti ?? []
  if (aperti.has('attesa') && input.slug !== '' && iscritti.length > 0) {
    const dalleVisite: BucoAttesa[] = input.visite
      .filter((visita) => visita.status === 'disdetto' || (visita.status === 'non_venuto' && oraAncoraDavanti(visita.start, input.adesso)))
      .map((visita) => ({
        appointmentId: visita.id,
        inizio: visita.start,
        nomeCaneDisdetto: visita.nomeCane || perCane.get(visita.dogId)?.nome || '',
        ...(visita.updatedAt ? { apertoIl: visita.updatedAt } : {}),
      }))
    const viste = new Set(dalleVisite.map((buco) => buco.appointmentId))
    const programmate = input.visite.filter((visita) => visita.status === 'programmato')
    // Un posto che un'altra visita programmata copre già non è più libero: non si offre a nessuno.
    const preso = (buco: BucoAttesa): boolean => programmate.some((visita) => {
      if (visita.id === buco.appointmentId) return false
      const inizio = visita.start.getTime()
      const orario = buco.inizio.getTime()
      if (orario === inizio) return true
      return orario >= inizio && orario < inizio + (visita.minuti ?? 0) * 60_000
    })
    const buchi = [...dalleVisite, ...(input.buchi ?? []).filter((buco) => !viste.has(buco.appointmentId))]
      .filter((buco) => !preso(buco))
    const salvate = new Map((input.offerte ?? []).map((offerta) => [offerta.id, offerta]))
    const inviate = [...salvate.values()].filter((offerta) => typeof offerta.inviataIl === 'string' && offerta.inviataIl !== '')
    const tokenDi = input.tokenDi ?? (() => randomBytes(32).toString('hex'))
    for (const nuova of offerteDaCreare({ buchi, iscritti, esistenti: inviate, adesso: input.adesso })) {
      const nota = salvate.get(nuova.id)
      const riuso = nota && typeof nota.token === 'string' && TOKEN.test(nota.token) && typeof nota.url === 'string' && nota.url !== ''
      const token = riuso ? nota.token as string : tokenDi()
      offerteAttesa.push({
        ...nuova,
        token,
        inviataIl: null,
        url: riuso ? nota.url as string : `https://groomlyapp.it/s/${input.slug}?attesa=${token}`,
      })
    }
  }

  return { accesi, righe, daSpedire: righeDelGiro(righe, accesi), offerteAttesa }
}
