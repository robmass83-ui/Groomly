import { SERVICE_SEED } from '../data/seed/services'
import type { Lingua } from './lingua'

const PREDEFINITI = new Set(SERVICE_SEED.map((servizio) => servizio.name))

const TRADOTTI: Record<string, { en: string; es: string }> = {
  Bagno: { en: 'Bath', es: 'Baño' },
  'Taglio / tosatura': { en: 'Trim / clip', es: 'Corte / esquilado' },
  'Bagno + taglio': { en: 'Bath and trim', es: 'Baño y corte' },
  Stripping: { en: 'Stripping', es: 'Stripping' },
  'Gestione nodi': { en: 'Dematting', es: 'Nudos' },
  Dermatologico: { en: 'Medicated', es: 'Dermatológico' },
  Antiparassitario: { en: 'Flea treatment', es: 'Antiparasitario' },
  Unghie: { en: 'Nails', es: 'Uñas' },
}

export function nomeServizioVisibile(lingua: Lingua, nomeSalvato: string): string {
  if (lingua === 'it' || !PREDEFINITI.has(nomeSalvato)) return nomeSalvato
  return TRADOTTI[nomeSalvato]?.[lingua] ?? nomeSalvato
}

export function nomeServizioIniziale(lingua: Lingua, nomeItaliano: string): string {
  return nomeServizioVisibile(lingua, nomeItaliano)
}
