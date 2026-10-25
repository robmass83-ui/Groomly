import { BREVO_TEMPLATE } from './promemoriaEmail'
import { oraRoma } from './disponibilita'

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
