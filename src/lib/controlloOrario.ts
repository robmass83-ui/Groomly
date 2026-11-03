import type { Appointment } from '../types/models'
import { fineVisita, onLocalDay, rangesOverlap, STATO_PROGRAMMATO } from './appointments'
import { chiusuraSuperata, orariCompilati, proponibile, type OrariSettimana } from './orari'
import { appointmentKind } from './personal'
import { assigneeOf } from './salonAccess'

export type PersonaControllo = { uid: string; ownerUid: string }

function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** Come sul sito: occupa l'ora solo una visita in programma. Disdetta, saltata o già chiusa lascia l'ora libera. */
export function visiteCheOccupano(visite: Appointment[], giorno: Date, opzioni: { ignoraId?: string; persona?: PersonaControllo }): Appointment[] {
  const delGiorno = onLocalDay(
    visite.filter((item) => item.id !== opzioni.ignoraId && appointmentKind(item) !== 'personale' && item.status === STATO_PROGRAMMATO),
    giorno,
  )
  const { persona } = opzioni
  return persona ? delGiorno.filter((item) => assigneeOf(item, persona.ownerUid) === persona.uid) : delGiorno
}

export function sovrapposte(inizio: Date, fine: Date, occupanti: Appointment[]): Appointment[] {
  return occupanti
    .filter((item) => rangesOverlap(inizio, fine, item.start, fineVisita(item)))
    .sort((a, b) => a.start.getTime() - b.start.getTime() || a.id.localeCompare(b.id))
}

export type EsitoOrario = { sovrapposte: Appointment[]; chiudeAlle: string | null; fuoriOrario: boolean }

export function controlloOrario(input: { inizio: Date; fine: Date; visite: Appointment[]; ignoraId?: string; persona?: PersonaControllo; orari?: OrariSettimana }): EsitoOrario {
  const occupanti = visiteCheOccupano(input.visite, input.inizio, { ignoraId: input.ignoraId, persona: input.persona })
  return {
    sovrapposte: sovrapposte(input.inizio, input.fine, occupanti),
    chiudeAlle: chiusuraSuperata(input.orari, input.inizio, input.fine),
    fuoriOrario: orariCompilati(input.orari) && !proponibile(input.orari, input.inizio, clock(input.inizio)),
  }
}
