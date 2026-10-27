import { FieldValue, getFirestore, type DocumentData } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import type { TipoEmail } from '../../../src/i18n/emailHtml'
import type { Lingua } from '../../../src/i18n/lingua'
import { oraRoma } from '../../../src/lib/disponibilita'
import { pianoRichiesta, type ComandoRichiesta, type PianoRichiesta, type RichiestaDoc, type SceltaAnimale } from '../../../src/lib/pianoRichiesta'
import { ruoloDelProprietario } from '../../../src/lib/ruoloProprietario'
import { linguaClientiSalon, spedisciHtml } from '../postaHtml'
import { postiLiberiPer } from './postiLiberi'

const STATI: readonly RichiestaDoc['status'][] = ['nuova', 'accettata', 'proposta', 'rifiutata', 'scaduta']
const FOTO_PREFISSI = ['data:image/jpeg;base64,', 'data:image/png;base64,', 'data:image/webp;base64,'] as const
const FOTO_MAX_CHARS = 160000
const URL_RISPOSTA = 'https://europe-west1-groomly-3128b.cloudfunctions.net/rispondiRichiesta'

export type EmailStato = 'inviata' | 'non_inviata'

export type ErroreGestione = 'stato' | 'scelta' | 'orario' | 'token' | 'scaduta' | 'email' | 'appuntamento'

export type EsitoGestione =
  | { ok: true; stato: RichiestaDoc['status']; emailStato: EmailStato | null; appointmentId: string; dogId: string }
  | { ok: false; errore: ErroreGestione }

export type EsitoScrittura =
  | { ok: true; appointmentId: string; dogId: string }
  | { ok: false; errore: 'stato' | 'appuntamento' | 'orario' }

function testo(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function linkRisposta(salonId: string, id: string, token: string, azione: 'conferma' | 'rifiuta'): string {
  return `${URL_RISPOSTA}?${new URLSearchParams({ salonId, id, token, azione }).toString()}`
}

export function leggiRichiesta(data: DocumentData): RichiestaDoc | null {
  const status = STATI.find((voce) => voce === data.status)
  if (!status) return null
  const specie = data.specie === 'gatto' || data.specie === 'altro' ? data.specie : 'cane'
  const taglia = data.taglia === 'piccola' || data.taglia === 'grande' ? data.taglia : 'media'
  const appointmentId = testo(data.appointmentId)
  const sceltaAnimale = testo(data.sceltaAnimale)
  const scadeIl = testo(data.scadeIl)
  return {
    status,
    token: typeof data.token === 'string' ? data.token : '',
    nome: testo(data.nome),
    phone: testo(data.phone),
    email: testo(data.email),
    cane: testo(data.cane),
    razza: testo(data.razza),
    specie,
    taglia,
    foto: Array.isArray(data.foto) ? data.foto.filter((item): item is string => typeof item === 'string') : [],
    start: testo(data.start),
    end: testo(data.end),
    ...(sceltaAnimale ? { sceltaAnimale } : {}),
    ...(appointmentId ? { appointmentId } : {}),
    ...(scadeIl ? { scadeIl } : {}),
  }
}

export function idValido(valore: string): boolean {
  return valore !== '' && valore !== 'shared' && !valore.includes('/') && valore.length <= 200
}

export async function nomeSalone(salonId: string): Promise<string> {
  const data = (await getFirestore().doc(`salons/${salonId}/settings/main`).get()).data()
  const business = data?.business && typeof data.business === 'object' ? data.business as Record<string, unknown> : {}
  return testo(business.salonName)
}

// true: non più in cura, si riattiva; false: attivo; null: non selezionabile (deceduto).
// Uno stato assente o sconosciuto vale «attivo», come in dogFromDoc.
export function archivioDelCane(stato: unknown): boolean | null {
  if (stato === 'deceduto') return null
  return stato === 'non_in_cura'
}

// null: il profilo non c'è o è deceduto, quindi la scelta non vale e non si scrive niente.
export async function animaleInArchivio(salonId: string, dogId: string): Promise<boolean | null> {
  if (!idValido(dogId)) return null
  const snap = await getFirestore().doc(`salons/${salonId}/dogs/${dogId}`).get()
  if (!snap.exists) return null
  return archivioDelCane(snap.data()?.status)
}

function giornoMail(lingua: Lingua, data: Date): string {
  const locale = lingua === 'en' ? 'en-GB' : lingua === 'es' ? 'es-ES' : 'it-IT'
  const parti = new Intl.DateTimeFormat(locale, {
    timeZone: 'Europe/Rome',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).formatToParts(data)
  const valore = (tipo: Intl.DateTimeFormatPartTypes) => parti.find((parte) => parte.type === tipo)?.value ?? ''
  const mese = lingua === 'es' ? `de ${valore('month')}` : valore('month')
  return `${valore('weekday')} ${valore('day')} ${mese}`
}

/** Orari della proposta, già nella forma che il corpo della mail inserisce. Null se un istante non si legge. */
export function orariMailProposta(
  lingua: Lingua,
  inizio: string,
  fine: string,
  chiesto: string,
  scadeIl: string,
): { quando: string; invece: string; entro: string } | null {
  const da = new Date(inizio)
  const a = new Date(fine)
  const chiestoIl = new Date(chiesto)
  const limite = new Date(scadeIl)
  if ([da, a, chiestoIl, limite].some((data) => Number.isNaN(data.getTime()))) return null
  const quando = `${giornoMail(lingua, da)}, ${oraRoma(da)}\u2013${oraRoma(a)}`
  const invece = lingua === 'en'
    ? `${giornoMail(lingua, chiestoIl)} at ${oraRoma(chiestoIl)}`
    : lingua === 'es'
      ? `${giornoMail(lingua, chiestoIl)} a las ${oraRoma(chiestoIl)}`
      : `${giornoMail(lingua, chiestoIl)} alle ${oraRoma(chiestoIl)}`
  const ora = oraRoma(limite)
  const entro = lingua === 'en' ? ora : lingua === 'es' ? `las ${ora}` : `le ${ora}`
  return { quando, invece, entro }
}

/** Orario della conferma, nella stessa forma della proposta. Vuoto se una data non si legge. */
function quandoConferma(lingua: Lingua, richiesta: RichiestaDoc): { quando?: string } {
  const da = new Date(richiesta.start)
  const a = new Date(richiesta.end)
  if (Number.isNaN(da.getTime()) || Number.isNaN(a.getTime())) return {}
  return { quando: `${giornoMail(lingua, da)}, ${oraRoma(da)}\u2013${oraRoma(a)}` }
}

export async function inviaMailRichiesta(input: {
  apiKey: string
  salonId: string
  tipo: TipoEmail
  richiesta: RichiestaDoc
  url?: string
  urlRifiuta?: string
  inizio?: string
  fine?: string
  scadeIl?: string
}): Promise<boolean> {
  if (!input.apiKey || !input.richiesta.email) return false
  try {
    const salone = await nomeSalone(input.salonId)
    const lingua = await linguaClientiSalon(input.salonId)
    const tempi = input.tipo === 'proposta'
      ? orariMailProposta(lingua, input.inizio ?? '', input.fine ?? '', input.richiesta.start, input.scadeIl ?? '')
      : null
    const dati = {
      nome: input.richiesta.cane,
      ...(input.tipo === 'conferma' ? quandoConferma(lingua, input.richiesta) : {}),
      ...(salone ? { salone } : {}),
      ...(input.url ? { url: input.url } : {}),
      ...(input.urlRifiuta ? { urlRifiuta: input.urlRifiuta } : {}),
      ...(tempi ?? {}),
    }
    await spedisciHtml(input.apiKey, input.tipo, lingua, input.richiesta.email, dati)
    return true
  } catch {
    return false
  }
}

function fotoUsabile(foto: string): boolean {
  return foto.length < FOTO_MAX_CHARS && FOTO_PREFISSI.some((prefisso) => foto.startsWith(prefisso))
}

function chiaveRicerca(richiesta: RichiestaDoc, nome: string): string {
  const base = [nome, richiesta.razza, richiesta.nome].join(' ').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
  let cifre = richiesta.phone.trim()
  if (cifre.startsWith('+39')) cifre = cifre.slice(3)
  else if (cifre.startsWith('0039')) cifre = cifre.slice(4)
  cifre = cifre.replace(/\D/g, '')
  return [base, cifre.length >= 3 ? cifre : ''].filter((parte) => parte !== '').join(' ')
}

function documentoCane(id: string, richiesta: RichiestaDoc, adesso: Date): Record<string, unknown> {
  const nome = richiesta.cane || richiesta.nome || 'Animale'
  const ms = adesso.getTime()
  const [prima, ...altre] = richiesta.foto
  const gallery = altre.flatMap((photo, indice) => (fotoUsabile(photo) ? [{ id: `richiesta-${indice + 2}`, photo, takenAt: ms }] : []))
  return {
    id,
    name: nome,
    species: richiesta.specie,
    breed: richiesta.razza,
    ageCategory: 'adulto',
    size: richiesta.taglia,
    temperament: 'bravo',
    clientType: 'occasionale',
    ...(prima && fotoUsabile(prima) ? { photo: prima } : {}),
    contact: { name: richiesta.nome, phone: richiesta.phone, ...(richiesta.email ? { email: richiesta.email } : {}) },
    contacts: [{ id: 'primary', name: richiesta.nome, role: ruoloDelProprietario(richiesta.nome), phone: richiesta.phone, isPrimary: true }],
    tags: [],
    servicePrices: [],
    hiddenServiceIds: [],
    customFields: [],
    gallery,
    status: 'attivo',
    daRevisionare: true,
    searchKey: chiaveRicerca(richiesta, nome),
    createdAt: ms,
    updatedAt: ms,
  }
}

function dataValida(valore: string | undefined): Date | null {
  if (!valore) return null
  const data = new Date(valore)
  return Number.isNaN(data.getTime()) ? null : data
}

// Scrive in una transazione: richiesta, visita e profilo cambiano insieme, e solo se la richiesta
// è ancora nello stato che l'handler ha letto. Le mail di conferma, rifiuto e scadenza partono dopo.
export async function applicaPiano(input: {
  salonId: string
  id: string
  richiesta: RichiestaDoc
  piano: PianoRichiesta
  adesso: Date
  emailStato?: EmailStato
}): Promise<EsitoScrittura> {
  const { salonId, id, richiesta, piano, adesso } = input
  const db = getFirestore()
  const base = `salons/${salonId}`
  const ref = db.doc(`${base}/richieste/${id}`)
  const scelta = piano.richiesta.sceltaAnimale ?? richiesta.sceltaAnimale
  const dogEsistente = scelta && scelta !== 'nuovo' ? scelta : ''
  const inizio = dataValida(piano.inizio ?? richiesta.start)
  const fine = dataValida(piano.fine ?? richiesta.end)
  if (piano.appuntamento === 'crea' && (!inizio || !fine)) return { ok: false, errore: 'orario' }
  const ms = adesso.getTime()
  return db.runTransaction(async (tx): Promise<EsitoScrittura> => {
    const corrente = (await tx.get(ref)).data()
    if (!corrente || corrente.status !== richiesta.status) return { ok: false, errore: 'stato' }
    const visitaRef = piano.appuntamento === 'crea'
      ? db.collection(`${base}/appointments`).doc()
      : richiesta.appointmentId ? db.doc(`${base}/appointments/${richiesta.appointmentId}`) : null
    if (piano.appuntamento === 'conferma' && (!visitaRef || !(await tx.get(visitaRef)).exists)) {
      return { ok: false, errore: 'appuntamento' }
    }
    const caneRef = piano.cane === 'crea' ? db.collection(`${base}/dogs`).doc() : null
    const dogId = caneRef ? caneRef.id : dogEsistente

    if (caneRef) tx.set(caneRef, documentoCane(caneRef.id, richiesta, adesso))
    if (piano.cane === 'riattiva' && dogEsistente) {
      tx.update(db.doc(`${base}/dogs/${dogEsistente}`), { status: 'attivo', archivedAt: FieldValue.delete(), updatedAt: ms })
    }
    if (piano.appuntamento === 'crea' && visitaRef && inizio && fine) {
      tx.set(visitaRef, {
        id: visitaRef.id,
        dogId,
        start: inizio.getTime(),
        end: fine.getTime(),
        services: [{ serviceId: 'prenotazione', name: 'Toelettatura', durationMin: 60, price: 0 }],
        status: 'programmato',
        kind: 'pelosetto',
        richiestaId: id,
        ...(piano.scadeIl ? { provvisorio: true, scadeIl: piano.scadeIl } : {}),
        ...(dogId ? {} : { ospiteNome: richiesta.cane || richiesta.nome || 'Animale' }),
        createdAt: ms,
        updatedAt: ms,
      })
    }
    if (piano.appuntamento === 'conferma' && visitaRef) {
      tx.update(visitaRef, {
        provvisorio: FieldValue.delete(),
        scadeIl: FieldValue.delete(),
        updatedAt: ms,
        ...(caneRef ? { dogId } : {}),
      })
    }
    if (piano.appuntamento === 'cancella' && visitaRef) tx.delete(visitaRef)

    tx.set(ref, {
      ...piano.richiesta,
      ...(piano.appuntamento === 'crea' && visitaRef ? { appointmentId: visitaRef.id } : {}),
      ...(input.emailStato ? { emailStato: input.emailStato } : {}),
    }, { merge: true })
    return { ok: true, appointmentId: visitaRef?.id ?? '', dogId }
  })
}

// Conferma, rifiuto e scadenza: la mail parte dopo la scrittura. Se fallisce la visita resta com'è.
export async function mailDopoScrittura(input: {
  apiKey: string
  salonId: string
  id: string
  richiesta: RichiestaDoc
  piano: PianoRichiesta
}): Promise<EmailStato | null> {
  const { piano } = input
  if (piano.mail !== 'conferma' && piano.mail !== 'rifiuto' && piano.mail !== 'liberato' && piano.mail !== 'scadenza') return null
  const inviata = await inviaMailRichiesta({
    apiKey: input.apiKey,
    salonId: input.salonId,
    tipo: piano.mail,
    richiesta: input.richiesta,
  })
  const emailStato: EmailStato = inviata ? 'inviata' : 'non_inviata'
  await getFirestore().doc(`salons/${input.salonId}/richieste/${input.id}`).set({ emailStato }, { merge: true })
  return emailStato
}

function comandoDa(azione: string, scelta: string, giorno: string, ora: string): ComandoRichiesta {
  if (azione === 'rifiuta') return { azione: 'rifiuta' }
  if (azione !== 'accetta' && azione !== 'proponi') throw new HttpsError('invalid-argument', 'Richiesta non valida')
  const animale: SceltaAnimale = scelta === 'nuovo' ? { tipo: 'nuovo' } : { tipo: 'esistente', dogId: scelta }
  return azione === 'accetta' ? { azione, scelta: animale } : { azione, scelta: animale, giorno, ora }
}

export async function gestisciPrenotazionePer(input: {
  salonId: string
  id: string
  azione: string
  scelta: string
  giorno: string
  ora: string
}, apiKey: string, adesso = new Date()): Promise<EsitoGestione> {
  if (!idValido(input.salonId) || !idValido(input.id)) throw new HttpsError('invalid-argument', 'Richiesta non valida')
  const comando = comandoDa(input.azione, input.scelta, input.giorno, input.ora)
  const ref = getFirestore().doc(`salons/${input.salonId}/richieste/${input.id}`)
  const data = (await ref.get()).data()
  if (!data) throw new HttpsError('not-found', 'Richiesta assente')
  const richiesta = leggiRichiesta(data)
  if (!richiesta) return { ok: false, errore: 'stato' }

  let animaleArchivio = false
  if ((comando.azione === 'accetta' || comando.azione === 'proponi') && comando.scelta.tipo === 'esistente') {
    const archivio = await animaleInArchivio(input.salonId, comando.scelta.dogId)
    if (archivio === null) return { ok: false, errore: 'scelta' }
    animaleArchivio = archivio
  }

  let orarioLibero = false
  if (comando.azione === 'proponi') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(comando.giorno) || !/^\d{2}:\d{2}$/.test(comando.ora)) return { ok: false, errore: 'orario' }
    orarioLibero = (await postiLiberiPer(input.salonId, comando.giorno, 60)).orari.includes(comando.ora)
  }

  const piano = pianoRichiesta({ richiesta, comando, token: '', adesso, orarioLibero, animaleArchivio })
  if (!piano.ok) return { ok: false, errore: piano.errore }

  // La proposta parte prima di scrivere: se la mail non va, la richiesta resta «nuova» e nessuna visita nasce.
  if (piano.mail === 'proposta') {
    const inviata = await inviaMailRichiesta({
      apiKey,
      salonId: input.salonId,
      tipo: 'proposta',
      richiesta,
      url: linkRisposta(input.salonId, input.id, richiesta.token, 'conferma'),
      urlRifiuta: linkRisposta(input.salonId, input.id, richiesta.token, 'rifiuta'),
      inizio: piano.inizio,
      fine: piano.fine,
      scadeIl: piano.scadeIl,
    })
    if (!inviata) return { ok: false, errore: 'email' }
  }

  const scritto = await applicaPiano({
    salonId: input.salonId,
    id: input.id,
    richiesta,
    piano,
    adesso,
    ...(piano.mail === 'proposta' ? { emailStato: 'inviata' as const } : {}),
  })
  if (!scritto.ok) return { ok: false, errore: scritto.errore }
  const emailStato = piano.mail === 'proposta'
    ? 'inviata' as const
    : await mailDopoScrittura({ apiKey, salonId: input.salonId, id: input.id, richiesta, piano })
  return {
    ok: true,
    stato: piano.richiesta.status,
    emailStato,
    appointmentId: scritto.appointmentId,
    dogId: scritto.dogId,
  }
}
