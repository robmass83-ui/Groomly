import { compatibili, postoLiberato, type CandidatoAttesa } from './attesa'
import { emailValida, eventoDi, unisciRiga, type RigaCoda } from './codaEmail'
import { linkPrenotazione } from './prenotazionePubblica'
import { puoChiedereRecensione, type PropostaRecensione } from './recensioni'
import { romeDay, romeIso } from './romeTime'
import type { SceltaServizio } from './serviziEmail'

export interface VisitaPromemoria {
  id: string
  dogId: string
  start: Date
  status: string
  nomeCane: string
  nomeCliente?: string
  email?: string
}

function giornoMeno(giorno: string, anticipo: number): string {
  const [anno, mese, giornoMese] = giorno.split('-').map(Number)
  const data = new Date(Date.UTC(anno, mese - 1, giornoMese))
  data.setUTCDate(data.getUTCDate() - anticipo)
  return data.toISOString().slice(0, 10)
}

function minutiOffset(iso: string): number {
  const match = /([+-])(\d{2}):(\d{2})$/.exec(iso)
  if (!match) return 0
  const segno = match[1] === '-' ? -1 : 1
  return segno * (Number(match[2]) * 60 + Number(match[3]))
}

function istanteRoma(giorno: string, ora: string): string {
  const [anno, mese, giornoMese] = giorno.split('-').map(Number)
  const [ore, minuti] = ora.split(':').map(Number)
  const civile = Date.UTC(anno, mese - 1, giornoMese, ore, minuti, 0)
  const sonda = new Date(Date.UTC(anno, mese - 1, giornoMese, 12, 0, 0))
  let utc = civile - minutiOffset(romeIso(sonda)) * 60_000
  const orologio = `${giorno}T${String(ore).padStart(2, '0')}:${String(minuti).padStart(2, '0')}:00`
  if (!romeIso(new Date(utc)).startsWith(orologio)) {
    utc = civile - minutiOffset(romeIso(new Date(utc))) * 60_000
  }
  return new Date(utc).toISOString()
}

function parteIlAutomatico(giornoVisita: string, scelta: SceltaServizio): string {
  const anticipo = scelta.anticipoGiorni ?? 1
  const ora = scelta.ora ?? '18:00'
  return istanteRoma(giornoMeno(giornoVisita, anticipo), ora)
}

function allineaParteIl(righe: readonly RigaCoda[], evento: string, parteIl: string | null): RigaCoda[] {
  return righe.map((riga) =>
    riga.evento === evento && riga.stato === 'in_coda' ? { ...riga, parteIl } : riga,
  )
}

function chiudiAperti(righe: readonly RigaCoda[], appointmentId: string, eventoTenuto?: string): RigaCoda[] {
  return righe.map((riga) => {
    if (riga.tipo !== 'promemoria' || riga.appointmentId !== appointmentId) return riga
    if (riga.stato === 'inviata' || riga.stato === 'chiusa') return riga
    if (eventoTenuto !== undefined && riga.evento === eventoTenuto) return riga
    return { ...riga, stato: 'chiusa' }
  })
}

function chiudiCaniInattivi(
  righe: readonly RigaCoda[],
  tipo: RigaCoda['tipo'],
  visite: readonly { dogId: string }[],
): RigaCoda[] {
  const cani = new Set(visite.map((visita) => visita.dogId))
  return righe.map((riga) =>
    riga.tipo === tipo && riga.stato === 'in_coda' && cani.has(riga.dogId) ? { ...riga, stato: 'chiusa' } : riga,
  )
}

export function righePromemoria(
  visite: readonly VisitaPromemoria[],
  scelta: SceltaServizio,
  esistenti: readonly RigaCoda[],
  caneAttivo = true,
): RigaCoda[] {
  if (!caneAttivo) return chiudiCaniInattivi(esistenti, 'promemoria', visite)
  if (scelta.modo === 'spento') return [...esistenti]

  let righe: RigaCoda[] = [...esistenti]
  for (const visita of visite) {
    if (visita.status !== 'programmato') {
      righe = chiudiAperti(righe, visita.id)
      continue
    }

    const giorno = romeDay(visita.start)
    const evento = eventoDi('promemoria', { appointmentId: visita.id, giorno })
    const parteIl = parteIlAutomatico(giorno, scelta)
    righe = allineaParteIl(chiudiAperti(righe, visita.id, evento), evento, parteIl)
    const email = visita.email ?? ''
    righe = unisciRiga(righe, {
      id: evento,
      tipo: 'promemoria',
      dogId: visita.dogId,
      appointmentId: visita.id,
      evento,
      parteIl,
      stato: 'in_coda',
      motivo: emailValida(email) ? '' : 'manca_email',
      email,
      nomeCane: visita.nomeCane,
      nomeCliente: visita.nomeCliente ?? '',
      inizio: visita.start.toISOString(),
    })
  }
  return righe
}

export interface VisitaPronto {
  id: string
  dogId: string
  status: string
  chiusoIl?: string | null
  nomeCane: string
  nomeCliente?: string
  email?: string
}

const QUINDICI_MINUTI = 15 * 60_000

function chiusuraSalvata(chiusoIl: string | null | undefined): chiusoIl is string {
  return typeof chiusoIl === 'string' && chiusoIl !== '' && !Number.isNaN(new Date(chiusoIl).getTime())
}

function parteIlDaChiusura(chiusoIl: string): string {
  return new Date(new Date(chiusoIl).getTime() + QUINDICI_MINUTI).toISOString()
}

function togliProntoAperto(righe: readonly RigaCoda[], appointmentId: string): RigaCoda[] {
  const evento = eventoDi('pronto', { appointmentId })
  return righe.filter((riga) => {
    if (riga.tipo !== 'pronto') return true
    if (riga.appointmentId !== appointmentId && riga.evento !== evento) return true
    return riga.stato !== 'in_coda' && riga.stato !== 'non_inviata'
  })
}

export function righePronto(
  visite: readonly VisitaPronto[],
  scelta: SceltaServizio,
  esistenti: readonly RigaCoda[],
  caneAttivo = true,
): RigaCoda[] {
  if (!caneAttivo) return chiudiCaniInattivi(esistenti, 'pronto', visite)
  if (scelta.modo === 'spento') return [...esistenti]

  let righe: RigaCoda[] = [...esistenti]
  for (const visita of visite) {
    if (visita.status === 'programmato' || visita.status === 'disdetto' || visita.status === 'non_venuto') {
      righe = togliProntoAperto(righe, visita.id)
      continue
    }
    if (visita.status !== 'completato' || !chiusuraSalvata(visita.chiusoIl)) continue

    const evento = eventoDi('pronto', { appointmentId: visita.id })
    if (scelta.modo === 'manuale') {
      righe = allineaParteIl(righe, evento, null)
      continue
    }
    const parteIl = parteIlDaChiusura(visita.chiusoIl)
    const email = visita.email ?? ''
    righe = allineaParteIl(righe, evento, parteIl)
    righe = unisciRiga(righe, {
      id: evento,
      tipo: 'pronto',
      dogId: visita.dogId,
      appointmentId: visita.id,
      evento,
      parteIl,
      stato: 'in_coda',
      motivo: emailValida(email) ? '' : 'manca_email',
      email,
      nomeCane: visita.nomeCane,
      nomeCliente: visita.nomeCliente ?? '',
      inizio: null,
    })
  }
  return righe
}

export function vaChiestoPronto(modo: string | undefined, email: string | undefined, caneAttivo: boolean): boolean {
  return modo === 'manuale' && caneAttivo && emailValida(email ?? '')
}

export function bozzaPronto(visita: VisitaPronto): RigaCoda {
  const evento = eventoDi('pronto', { appointmentId: visita.id })
  const email = visita.email ?? ''
  return {
    id: evento,
    tipo: 'pronto',
    dogId: visita.dogId,
    appointmentId: visita.id,
    evento,
    parteIl: null,
    stato: 'in_coda',
    motivo: emailValida(email) ? '' : 'manca_email',
    email,
    nomeCane: visita.nomeCane,
    nomeCliente: visita.nomeCliente ?? '',
    inizio: null,
  }
}

export interface CaneAuguri {
  id: string
  nome: string
  nomeCliente?: string
  email?: string
  birthMonth?: number
  birthDay?: number
}

function compleannoRoma(cane: CaneAuguri, adesso: Date): { anno: number; giorno: string } | null {
  if (cane.birthMonth === undefined || cane.birthDay === undefined) return null
  const giorno = romeDay(adesso)
  const [anno, mese, giornoMese] = giorno.split('-').map(Number)
  if (cane.birthMonth !== mese || cane.birthDay !== giornoMese) return null
  return { anno, giorno }
}

export function righeAuguri(
  cani: readonly CaneAuguri[],
  scelta: SceltaServizio,
  esistenti: readonly RigaCoda[],
  adesso: Date,
  caneAttivo = true,
): RigaCoda[] {
  if (!caneAttivo) return chiudiCaniInattivi(esistenti, 'auguri', cani.map((cane) => ({ dogId: cane.id })))
  if (scelta.modo === 'spento') return [...esistenti]

  let righe: RigaCoda[] = [...esistenti]
  for (const cane of cani) {
    const oggi = compleannoRoma(cane, adesso)
    if (!oggi) continue
    const evento = eventoDi('auguri', { dogId: cane.id, anno: oggi.anno })
    const parteIl = istanteRoma(oggi.giorno, scelta.ora ?? '09:00')
    const email = cane.email ?? ''
    righe = allineaParteIl(righe, evento, parteIl)
    righe = unisciRiga(righe, {
      id: evento,
      tipo: 'auguri',
      dogId: cane.id,
      appointmentId: null,
      evento,
      parteIl,
      stato: 'in_coda',
      motivo: emailValida(email) ? '' : 'manca_email',
      email,
      nomeCane: cane.nome,
      nomeCliente: cane.nomeCliente ?? '',
      inizio: null,
    })
  }
  return righe
}

export interface VisitaRecensione {
  id: string
  dogId: string
  status: string
  chiusoIl?: string | null
  nomeCane: string
  nomeCliente?: string
  email?: string
  noteProblema?: boolean
}

function togliRecensioneAperta(righe: readonly RigaCoda[], appointmentId: string): RigaCoda[] {
  const evento = eventoDi('recensione', { appointmentId })
  return righe.filter((riga) => {
    if (riga.tipo !== 'recensione') return true
    if (riga.appointmentId !== appointmentId && riga.evento !== evento) return true
    return riga.stato !== 'in_coda' && riga.stato !== 'non_inviata'
  })
}

function richiesteRecensioneOggi(righe: readonly RigaCoda[], adesso: Date, appointmentId: string): number {
  const oggi = romeDay(adesso)
  const evento = eventoDi('recensione', { appointmentId })
  let totale = 0
  for (const riga of righe) {
    if (riga.tipo !== 'recensione' || riga.stato === 'chiusa') continue
    if (riga.appointmentId === appointmentId || riga.evento === evento) continue
    if (riga.parteIl === null) {
      totale += 1
      continue
    }
    const istante = new Date(riga.parteIl)
    if (Number.isNaN(istante.getTime())) continue
    if (romeDay(istante) === oggi) totale += 1
  }
  return totale
}

export function righeRecensione(
  visite: readonly VisitaRecensione[],
  scelta: SceltaServizio,
  link: string,
  esistenti: readonly RigaCoda[],
  adesso: Date,
  proposte: readonly PropostaRecensione[] = [],
  caneAttivo = true,
): RigaCoda[] {
  if (!caneAttivo) return chiudiCaniInattivi(esistenti, 'recensione', visite)
  if (scelta.modo === 'spento') return [...esistenti]

  let righe: RigaCoda[] = [...esistenti]
  for (const visita of visite) {
    if (visita.status === 'programmato' || visita.status === 'disdetto' || visita.status === 'non_venuto') {
      righe = togliRecensioneAperta(righe, visita.id)
    }
  }
  for (const visita of visite) {
    if (visita.status !== 'completato' || !chiusuraSalvata(visita.chiusoIl)) continue
    const email = visita.email ?? ''
    if (visita.noteProblema === true || !emailValida(email) || link.trim() === '') {
      righe = togliRecensioneAperta(righe, visita.id)
      continue
    }
    const evento = eventoDi('recensione', { appointmentId: visita.id })
    const parteIl = scelta.modo === 'automatico' ? parteIlDaChiusura(visita.chiusoIl) : null
    if (!puoChiedereRecensione({
      link,
      proposte,
      dogId: visita.dogId,
      adesso,
      noteProblemaOggi: false, // se era vera, la riga è già stata tolta sopra
      richiesteOggi: richiesteRecensioneOggi(righe, adesso, visita.id),
    })) continue
    righe = allineaParteIl(righe, evento, parteIl)
    righe = unisciRiga(righe, {
      id: evento,
      tipo: 'recensione',
      dogId: visita.dogId,
      appointmentId: visita.id,
      evento,
      parteIl,
      stato: 'in_coda',
      motivo: '',
      email,
      nomeCane: visita.nomeCane,
      nomeCliente: visita.nomeCliente ?? '',
      inizio: null,
    })
  }
  return righe
}

export interface BucoAttesa {
  id: string
  status: string
  ora: string
  minuti: number
  giorno: string
}

export interface CaneInAttesa extends CandidatoAttesa {
  dogId: string
  nomeCane: string
  nomeCliente?: string
  email?: string
  giorno?: string
}

export function linkPostoLibero(slug: string, giorno: string, ora: string): string {
  const base = linkPrenotazione(slug)
  if (base === '') return ''
  return `${base}?giorno=${giorno}&ora=${ora}`
}

function chiudiAttesaInCoda(righe: readonly RigaCoda[], idDisdetta: string): RigaCoda[] {
  const prefisso = `attesa:${idDisdetta}:`
  return righe.map((riga) =>
    (riga.stato === 'in_coda' || riga.stato === 'non_inviata') && riga.evento.startsWith(prefisso)
      ? { ...riga, stato: 'chiusa' }
      : riga,
  )
}

function stessoGiornoOSenza(candidato: CaneInAttesa, giorno: string): boolean {
  return candidato.giorno === undefined || candidato.giorno === giorno
}

export function righeAttesa(
  buco: BucoAttesa,
  attesa: readonly CaneInAttesa[],
  scelta: SceltaServizio,
  slug: string,
  esistenti: readonly RigaCoda[],
  adesso: Date,
  caneAttivo = true,
): RigaCoda[] {
  if (!caneAttivo) return chiudiCaniInattivi(esistenti, 'attesa', attesa)
  if (scelta.modo === 'spento') return [...esistenti]

  const libero = postoLiberato(buco)
  if (libero === null) return chiudiAttesaInCoda(esistenti, buco.id)

  const prefisso = `attesa:${buco.id}:`
  if (esistenti.some((riga) => riga.evento.startsWith(prefisso) && riga.stato === 'inviata')) {
    return chiudiAttesaInCoda(esistenti, buco.id)
  }

  const nelGiorno = attesa.filter((candidato) => stessoGiornoOSenza(candidato, buco.giorno))
  const perId = new Map(nelGiorno.map((candidato) => [candidato.id, candidato]))
  const scelti = compatibili(libero.minuti, libero.ora, nelGiorno).flatMap((candidato) => {
    const completo = perId.get(candidato.id)
    return completo ? [completo] : []
  })

  const slugOk = linkPrenotazione(slug) !== ''
  const ammessi = new Set(scelti.map((candidato) => candidato.dogId))
  let righe: RigaCoda[] = esistenti.map((riga) => {
    if (!riga.evento.startsWith(prefisso)) return riga
    if (riga.stato !== 'in_coda' && riga.stato !== 'non_inviata') return riga
    return ammessi.has(riga.dogId) ? riga : { ...riga, stato: 'chiusa' }
  })
  for (const candidato of scelti) {
    const evento = eventoDi('attesa', { appointmentId: buco.id, dogId: candidato.dogId })
    const email = candidato.email ?? ''
    const gia = righe.find((riga) => riga.evento === evento)
    const calcolato = slugOk && scelta.modo === 'automatico' ? new Date(adesso.getTime() + QUINDICI_MINUTI).toISOString() : null
    const parteIl = gia && gia.parteIl !== null && (gia.stato === 'in_coda' || gia.stato === 'non_inviata') ? gia.parteIl : calcolato
    righe = unisciRiga(righe, {
      id: evento,
      tipo: 'attesa',
      dogId: candidato.dogId,
      appointmentId: buco.id,
      evento,
      parteIl,
      stato: 'in_coda',
      motivo: slugOk ? (emailValida(email) ? '' : 'manca_email') : 'pagina_assente',
      email,
      nomeCane: candidato.nomeCane,
      nomeCliente: candidato.nomeCliente ?? '',
      inizio: null,
    })
    if (!slugOk || scelta.modo !== 'automatico') {
      righe = righe.map((riga) =>
        riga.evento === evento && riga.stato === 'in_coda' ? { ...riga, parteIl: null } : riga,
      )
    }
  }
  return righe
}
