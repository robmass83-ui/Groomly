import { Package, type LucideIcon } from 'lucide-react'
import type { Chiave } from '../i18n/t'

export type VoceAltro = {
  to: string
  titolo: Chiave
  dettaglio: Chiave
  icona: LucideIcon
  visibile?: (ruolo: string | undefined) => boolean
}

/** Le funzioni della pagina Altro: una nuova funzione è una riga qui. */
export const VOCI_ALTRO: VoceAltro[] = [
  { to: '/altro/magazzino', titolo: 'magTitolo', dettaglio: 'magDettaglio', icona: Package },
]

export function vociVisibili(voci: VoceAltro[], ruolo: string | undefined): VoceAltro[] {
  return voci.filter((voce) => voce.visibile?.(ruolo) ?? true)
}
