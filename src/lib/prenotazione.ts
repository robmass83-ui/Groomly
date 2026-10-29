import { BREVO_TEMPLATE } from './promemoriaEmail'
import { chiaveGiornoRoma, decisioneAntispam, giornoDopo, istanteRoma, oraRoma, ORIZZONTE_GIORNI } from './disponibilita'

export type StatoRichiesta = 'nuova' | 'accettata' | 'proposta' | 'rifiutata' | 'scaduta' | 'disdetta'

const DOPO: Record<StatoRichiesta, readonly StatoRichiesta[]> = {
  nuova: ['accettata', 'proposta', 'rifiutata', 'scaduta', 'disdetta'],
  accettata: ['disdetta'],
  proposta: ['accettata', 'rifiutata', 'scaduta', 'disdetta'],
  rifiutata: [],
  scaduta: [],
  disdetta: [],
}

export const EMAIL_PRENOTAZIONE_MAX = 320
export const NOME_PRENOTAZIONE_MAX = 80
export const TELEFONO_PRENOTAZIONE_MAX = 20

export function emailPrenotazioneValida(email: string): boolean {
  const pulita = email.trim()
  return pulita.length <= EMAIL_PRENOTAZIONE_MAX && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pulita)
}

export function cifreTelefono(phone: string): string {
  return phone.replace(/\D/g, '')
}

function nomePrenotazioneValido(nome: string): boolean {
  const pulito = nome.trim()
  return pulito.length >= 2 && pulito.length <= NOME_PRENOTAZIONE_MAX && !/[\u0000-\u001f]/.test(pulito)
}

function telefonoPrenotazioneValido(phone: string): boolean {
  const pulito = phone.trim()
  if (pulito.length === 0 || pulito.length > TELEFONO_PRENOTAZIONE_MAX) return false
  const cifre = cifreTelefono(pulito)
  return cifre.length >= 6 && cifre.length <= 15
}

function giornoEntroOrizzonte(giorno: string, adesso: Date): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(giorno)) return false
  const oggi = chiaveGiornoRoma(adesso)
  if (giorno < oggi) return false
  let ultimo = oggi
  for (let passo = 1; passo < ORIZZONTE_GIORNI; passo += 1) ultimo = giornoDopo(ultimo)
  return giorno <= ultimo
}

export function contaAperte(
  righe: readonly { phone?: unknown; email?: unknown }[],
  phone: string,
  email: string,
): { aperteTelefono: number; aperteEmail: number; aperteSalone: number } {
  const cifre = cifreTelefono(phone)
  const normale = email.trim().toLowerCase()
  let aperteTelefono = 0
  let aperteEmail = 0
  for (const riga of righe) {
    const tel = typeof riga.phone === 'string' ? cifreTelefono(riga.phone) : ''
    const mail = typeof riga.email === 'string' ? riga.email.trim().toLowerCase() : ''
    if (cifre.length >= 6 && tel === cifre) aperteTelefono += 1
    if (normale !== '' && mail === normale) aperteEmail += 1
  }
  return { aperteTelefono, aperteEmail, aperteSalone: righe.length }
}

export type IngressoRichiesta =
  | { ok: true; scrivi: false }
  | { ok: true; scrivi: true; nome: string; phone: string; email: string; giorno: string; ora: string }
  | { ok: false; message: string }

export function ingressoRichiestaPubblica(input: {
  nome: string
  phone: string
  email: string
  giorno: string
  ora: string
  esca: string
  consenso: boolean
  aperteTelefono: number
  aperteEmail: number
  aperteSalone: number
  adesso: Date
}): IngressoRichiesta {
  if (input.esca.trim() !== '') return { ok: true, scrivi: false }
  // La casella privacy della pagina non basta: senza consenso il server non scrive la richiesta.
  if (!input.consenso) return { ok: false, message: 'Serve il consenso' }
  if (!nomePrenotazioneValido(input.nome) || !telefonoPrenotazioneValido(input.phone)) {
    return { ok: false, message: 'Richiesta non valida' }
  }
  if (!emailPrenotazioneValida(input.email)) return { ok: false, message: 'Email obbligatoria' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.giorno) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.ora)) {
    return { ok: false, message: 'Richiesta non valida' }
  }
  if (!giornoEntroOrizzonte(input.giorno, input.adesso)) return { ok: false, message: 'Richiesta non valida' }
  if (input.aperteEmail >= 2) return { ok: false, message: 'Troppe richieste' }
  const spam = decisioneAntispam({
    aperteTelefono: input.aperteTelefono,
    aperteSalone: input.aperteSalone,
    esca: '',
  })
  if (!spam.ok) return { ok: false, message: spam.message }
  return {
    ok: true,
    scrivi: true,
    nome: input.nome.trim(),
    phone: input.phone.trim(),
    email: input.email.trim().toLowerCase(),
    giorno: input.giorno,
    ora: input.ora,
  }
}

export function transizionePrenotazione(input: {
  attuale: StatoRichiesta
  prossimo: StatoRichiesta
  token: string
  tokenAtteso: string
}): { ok: boolean; stato: StatoRichiesta } {
  if (input.token === '' || input.token !== input.tokenAtteso) return { ok: false, stato: input.attuale }
  if (!DOPO[input.attuale].includes(input.prossimo)) return { ok: false, stato: input.attuale }
  return { ok: true, stato: input.prossimo }
}

export function templatePrenotazione(stato: StatoRichiesta): number {
  const mappa = {
    nuova: BREVO_TEMPLATE.ricevuta,
    accettata: BREVO_TEMPLATE.confermata,
    proposta: BREVO_TEMPLATE.proposta,
    rifiutata: BREVO_TEMPLATE.rifiutata,
    scaduta: BREVO_TEMPLATE.scaduta,
    disdetta: BREVO_TEMPLATE.disdetta,
  } as const
  return mappa[stato]
}

const DURATA_PUBBLICA_MIN = 60

/** Giorno e ora sono l’orologio di Roma. Senza di essi si tiene l’istante già assoluto, e una fine mancante dura un’ora. */
export function intervalloRichiesta(input: {
  giorno?: string
  ora?: string
  inizio?: string
  fine?: string
}): { inizio: Date; fine: Date; giorno: string; ora: string } | null {
  if (input.giorno && input.ora && /^\d{4}-\d{2}-\d{2}$/.test(input.giorno) && /^([01]\d|2[0-3]):[0-5]\d$/.test(input.ora)) {
    const inizio = istanteRoma(input.giorno, input.ora)
    return {
      inizio,
      fine: new Date(inizio.getTime() + DURATA_PUBBLICA_MIN * 60 * 1000),
      giorno: input.giorno,
      ora: input.ora,
    }
  }
  if (!input.inizio) return null
  const inizio = new Date(input.inizio)
  if (Number.isNaN(inizio.getTime())) return null
  const fineLetta = input.fine ? new Date(input.fine) : new Date(NaN)
  const fine = !Number.isNaN(fineLetta.getTime()) && fineLetta.getTime() > inizio.getTime()
    ? fineLetta
    : new Date(inizio.getTime() + DURATA_PUBBLICA_MIN * 60 * 1000)
  return { inizio, fine, giorno: '', ora: '' }
}

export function esitoEmailPrenotazione(apiKey: string | undefined): 'inviata' | 'non_inviata' {
  return apiKey && apiKey.trim() !== '' ? 'inviata' : 'non_inviata'
}

function marcaRoma(data: Date): string {
  const giorno = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(data)
  return `${giorno.replaceAll('-', '')}T${oraRoma(data).replace(':', '')}00`
}

export function icsRoma(input: { inizio: Date; fine: Date; titolo: string }): string {
  return [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    `DTSTART;TZID=Europe/Rome:${marcaRoma(input.inizio)}`,
    `DTEND;TZID=Europe/Rome:${marcaRoma(input.fine)}`,
    `SUMMARY:${input.titolo.replace(/[\r\n]/g, ' ')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n')
}
