import { assigneeOf } from './salonAccess'
import type { SalonMember } from './salonRoster'

/** Prime lettere di nome e cognome in maiuscolo (al massimo due). */
export function iniziali(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .filter((parte) => parte !== '')
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toLocaleUpperCase('it-IT'))
    .join('')
}

/** `null` = tutte le visite; altrimenti solo quelle assegnate a quella persona. */
export function filtraPerPersona<T extends { assigneeUid?: string | null }>(items: T[], persona: string | null, ownerUid: string): T[] {
  if (persona === null) return items
  return items.filter((item) => assigneeOf(item, ownerUid) === persona)
}

export function personaDellaVisita(item: { assigneeUid?: string | null }, persone: SalonMember[], ownerUid: string): SalonMember | undefined {
  const uid = assigneeOf(item, ownerUid)
  return persone.find((persona) => persona.uid === uid)
}

const chiave = (salonId: string) => `groomly.filtroPersona.${salonId}`

export function leggiFiltroPersona(salonId: string): string | null {
  try {
    const valore = localStorage.getItem(chiave(salonId))
    return valore ? valore : null
  } catch {
    return null
  }
}

export function ricordaFiltroPersona(salonId: string, persona: string | null): void {
  try {
    if (persona === null) localStorage.removeItem(chiave(salonId))
    else localStorage.setItem(chiave(salonId), persona)
  } catch {
    // La scelta resta valida finché la pagina è aperta.
  }
}
