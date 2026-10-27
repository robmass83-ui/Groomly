import { randomBytes } from 'node:crypto'
import { emailMessaggio } from '../../../src/i18n/emailHtml'
import type { Lingua } from '../../../src/i18n/lingua'
import { dovute, emailValida, type RigaCoda, type TipoCoda } from '../../../src/lib/codaEmail'
import { TETTO_EMAIL_GIORNO } from '../../../src/lib/promemoriaEmail'
import {
  linkPostoLibero,
  righeAttesa,
  righeAuguri,
  righePromemoria,
  righePronto,
  righeRecensione,
  type CaneAuguri,
  type CaneInAttesa,
  type VisitaPromemoria,
  type VisitaPronto,
  type VisitaRecensione,
} from '../../../src/lib/righeServizio'
import { romeDay, romeIso } from '../../../src/lib/romeTime'
import type { SceltaServizio } from '../../../src/lib/serviziEmail'
import type { PropostaRecensione } from '../../../src/lib/recensioni'
import { postBrevoHtml } from '../brevoMail'

const TOKEN = /^[A-Za-z0-9_-]{16,128}$/
const CHIAVI: TipoCoda[] = ['promemoria', 'pronto', 'auguri', 'recensione', 'attesa']

export interface RigaInvio extends RigaCoda {
  token?: string
  url?: string
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
}

export interface CaneMinuto {
  id: string
  nome: string
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

export async function inviaCoda(input: {
  apiKey: string
  righe: readonly RigaInvio[]
  emailOggi: number
  salonId?: string
  lingua?: Lingua
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
  const replyTo = input.replyTo && emailValida(input.replyTo.email) ? input.replyTo : undefined
  const token: EsitoCoda['token'] = []
  const riprova: string[] = []
  const spedite: string[] = []
  let inviate = 0
  for (const riga of nelTetto) {
    const gia = riga.token && TOKEN.test(riga.token) ? riga.token : ''
    const assegnato = gia || randomBytes(16).toString('hex')
    if (!gia) token.push({ id: riga.id, token: assegnato })
    const mail = emailMessaggio(lingua, riga.tipo, {
      nome: riga.nomeCane,
      salone: replyTo?.name,
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

function oraDi(data: Date): string {
  const iso = romeIso(data)
  return iso.slice(11, 16)
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
}): { accesi: TipoCoda[]; righe: RigaInvio[]; daSpedire: RigaInvio[] } {
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
      return { id: visita.id, dogId: visita.dogId, start: visita.start, status: visita.status, nomeCane: testi.nomeCane, email: testi.email }
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
        email: testi.email,
        noteProblema: visita.noteProblema === true,
      }
    }
    if (aperti.has('pronto')) {
      const scelta = sceltaDi(input.servizi, 'pronto')
      righe = conservaToken(righe, righePronto(delGruppo(true).map(comeChiusa), scelta, righe, true))
      righe = conservaToken(righe, righePronto(delGruppo(false).map(comeChiusa), scelta, righe, false))
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
      email: cane.email,
      birthMonth: cane.birthMonth,
      birthDay: cane.birthDay,
    })
    righe = conservaToken(righe, righeAuguri(input.cani.filter((cane) => cane.attivo).map(comeCane), scelta, righe, input.adesso, true))
    righe = conservaToken(righe, righeAuguri(input.cani.filter((cane) => !cane.attivo).map(comeCane), scelta, righe, input.adesso, false))
  }

  if (aperti.has('attesa')) {
    const scelta = sceltaDi(input.servizi, 'attesa')
    const comeAttesa = (voce: AttesaMinuto): CaneInAttesa => {
      const cane = perCane.get(voce.dogId)
      return {
        id: voce.id,
        dogId: voce.dogId,
        durataMin: voce.durataMin,
        preferenza: voce.preferenza,
        arrivato: voce.arrivato,
        nomeCane: cane?.nome ?? '',
        email: cane?.email,
        giorno: voce.giorno,
      }
    }
    const attive = input.attesa.filter((voce) => attivi.has(voce.dogId)).map(comeAttesa)
    for (const visita of input.visite) {
      const minuti = visita.minuti !== undefined && visita.minuti > 0 ? visita.minuti : 0
      righe = conservaToken(righe, righeAttesa({
        id: visita.id,
        status: visita.status,
        ora: oraDi(visita.start),
        minuti,
        giorno: romeDay(visita.start),
      }, attive, scelta, input.slug, righe, input.adesso, true))
    }
    const spente = input.cani.filter((cane) => !cane.attivo).map((cane) => ({
      id: cane.id,
      dogId: cane.id,
      durataMin: 0,
      preferenza: 'qualsiasi' as const,
      arrivato: input.adesso.toISOString(),
      nomeCane: cane.nome,
      email: cane.email,
    }))
    if (spente.length > 0) {
      righe = conservaToken(righe, righeAttesa({
        id: '_',
        status: 'disdetto',
        ora: '00:00',
        minuti: 0,
        giorno: romeDay(input.adesso),
      }, spente, scelta, input.slug, righe, input.adesso, false))
    }
    const buchi = new Map(input.visite.filter((visita) => visita.status === 'disdetto').map((visita) => [visita.id, visita]))
    righe = righe.map((riga) => {
      if (riga.tipo !== 'attesa' || !riga.appointmentId) return riga
      const buco = buchi.get(riga.appointmentId)
      if (!buco || buco.minuti === undefined || buco.minuti <= 0) return riga
      const url = linkPostoLibero(input.slug, romeDay(buco.start), oraDi(buco.start))
      return url ? { ...riga, url } : riga
    })
  }

  if (aperti.has('recensione') && input.linkRecensioni.startsWith('https://')) {
    const link = input.linkRecensioni
    righe = righe.map((riga) => (riga.tipo === 'recensione' ? { ...riga, url: link } : riga))
  }

  return { accesi, righe, daSpedire: righeDelGiro(righe, accesi) }
}
