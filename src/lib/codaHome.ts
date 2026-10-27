import type { RigaCoda, TipoCoda } from './codaEmail'
import type { PropostaRecensione } from './recensioni'
import {
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
} from './righeServizio'
import { romeDay, romeIso } from './romeTime'
import type { SceltaServizio } from './serviziEmail'

const CHIAVI: TipoCoda[] = ['promemoria', 'pronto', 'auguri', 'recensione', 'attesa']

export interface CaneCoda {
  id: string
  nome: string
  email?: string
  birthMonth?: number
  birthDay?: number
  attivo: boolean
}

export interface VisitaCoda {
  id: string
  dogId: string
  start: Date
  status: string
  minuti: number
  chiusoIl?: string | null
  noteProblema?: boolean
}

export interface AttesaCoda {
  id: string
  dogId: string
  durataMin: number
  preferenza: 'mattina' | 'pomeriggio' | 'qualsiasi'
  arrivato: string
  giorno?: string
}

function serviziAccesi(servizi: unknown): TipoCoda[] {
  if (!servizi || typeof servizi !== 'object') return []
  const record = servizi as Record<string, { modo?: unknown } | undefined>
  return CHIAVI.filter((chiave) => {
    const modo = record[chiave]?.modo
    return modo === 'manuale' || modo === 'automatico'
  })
}

function sceltaDi(servizi: unknown, tipo: TipoCoda): SceltaServizio {
  if (!servizi || typeof servizi !== 'object') return { modo: 'spento' }
  const raw = (servizi as Record<string, SceltaServizio | undefined>)[tipo]
  if (!raw || (raw.modo !== 'manuale' && raw.modo !== 'automatico')) return { modo: 'spento' }
  return raw
}

function oraDi(data: Date): string {
  return romeIso(data).slice(11, 16)
}

export function righeCodaSalone(input: {
  adesso: Date
  servizi: unknown
  esistenti: readonly RigaCoda[]
  visite: readonly VisitaCoda[]
  cani: readonly CaneCoda[]
  attesa: readonly AttesaCoda[]
  slug: string
  linkRecensioni: string
  proposte: readonly PropostaRecensione[]
}): RigaCoda[] {
  const aperti = new Set(serviziAccesi(input.servizi))
  const attivi = new Set(input.cani.filter((cane) => cane.attivo).map((cane) => cane.id))
  const perCane = new Map(input.cani.map((cane) => [cane.id, cane]))
  let righe: RigaCoda[] = input.esistenti.map((riga) => ({ ...riga }))

  const nomeEmail = (visita: VisitaCoda) => {
    const cane = perCane.get(visita.dogId)
    return {
      nomeCane: cane?.nome ?? '',
      email: cane?.email ?? '',
    }
  }

  const delGruppo = (attivo: boolean): VisitaCoda[] => {
    const viste = input.visite.filter((visita) => visita.dogId !== '' && attivi.has(visita.dogId) === attivo)
    if (attivo) return viste
    const gia = new Set(viste.map((visita) => visita.dogId))
    const extra = input.cani.filter((cane) => !cane.attivo && !gia.has(cane.id)).map((cane) => ({
      id: `cane:${cane.id}`,
      dogId: cane.id,
      start: input.adesso,
      status: 'programmato',
      minuti: 0,
      chiusoIl: null,
      noteProblema: false,
    }))
    return [...viste, ...extra]
  }

  if (aperti.has('promemoria')) {
    const scelta = sceltaDi(input.servizi, 'promemoria')
    const comeVisita = (visita: VisitaCoda): VisitaPromemoria => {
      const testi = nomeEmail(visita)
      return { id: visita.id, dogId: visita.dogId, start: visita.start, status: visita.status, nomeCane: testi.nomeCane, email: testi.email }
    }
    righe = righePromemoria(delGruppo(true).map(comeVisita), scelta, righe, true)
    righe = righePromemoria(delGruppo(false).map(comeVisita), scelta, righe, false)
  }

  if (aperti.has('pronto') || aperti.has('recensione')) {
    const comeChiusa = (visita: VisitaCoda): VisitaPronto & VisitaRecensione => {
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
      righe = righePronto(delGruppo(true).map(comeChiusa), scelta, righe, true)
      righe = righePronto(delGruppo(false).map(comeChiusa), scelta, righe, false)
    }
    if (aperti.has('recensione')) {
      const scelta = sceltaDi(input.servizi, 'recensione')
      righe = righeRecensione(delGruppo(true).map(comeChiusa), scelta, input.linkRecensioni, righe, input.adesso, input.proposte, true)
      righe = righeRecensione(delGruppo(false).map(comeChiusa), scelta, input.linkRecensioni, righe, input.adesso, input.proposte, false)
    }
  }

  if (aperti.has('auguri')) {
    const scelta = sceltaDi(input.servizi, 'auguri')
    const comeCane = (cane: CaneCoda): CaneAuguri => ({
      id: cane.id,
      nome: cane.nome,
      email: cane.email,
      birthMonth: cane.birthMonth,
      birthDay: cane.birthDay,
    })
    righe = righeAuguri(input.cani.filter((cane) => cane.attivo).map(comeCane), scelta, righe, input.adesso, true)
    righe = righeAuguri(input.cani.filter((cane) => !cane.attivo).map(comeCane), scelta, righe, input.adesso, false)
  }

  if (aperti.has('attesa')) {
    const scelta = sceltaDi(input.servizi, 'attesa')
    const comeAttesa = (voce: AttesaCoda): CaneInAttesa => {
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
      righe = righeAttesa({
        id: visita.id,
        status: visita.status,
        ora: oraDi(visita.start),
        minuti: visita.minuti > 0 ? visita.minuti : 0,
        giorno: romeDay(visita.start),
      }, attive, scelta, input.slug, righe, input.adesso, true)
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
      righe = righeAttesa({
        id: '_',
        status: 'disdetto',
        ora: '00:00',
        minuti: 0,
        giorno: romeDay(input.adesso),
      }, spente, scelta, input.slug, righe, input.adesso, false)
    }
  }

  return righe
}
