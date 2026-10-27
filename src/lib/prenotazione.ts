import { BREVO_TEMPLATE } from './promemoriaEmail'
import { istanteRoma, oraRoma } from './disponibilita'

export type StatoRichiesta = 'nuova' | 'accettata' | 'proposta' | 'rifiutata' | 'scaduta' | 'disdetta'

const DOPO: Record<StatoRichiesta, readonly StatoRichiesta[]> = {
  nuova: ['accettata', 'proposta', 'rifiutata', 'scaduta', 'disdetta'],
  accettata: ['disdetta'],
  proposta: ['accettata', 'rifiutata', 'scaduta', 'disdetta'],
  rifiutata: [],
  scaduta: [],
  disdetta: [],
}

export function emailPrenotazioneValida(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
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
