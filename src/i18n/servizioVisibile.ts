import { SERVICE_SEED } from '../data/seed/services'
import type { Lingua } from './lingua'

const PREDEFINITI = new Set(SERVICE_SEED.map((servizio) => servizio.name))

const TRADOTTI: Record<string, Record<Exclude<Lingua, 'it'>, string>> = {
  Bagno: { en: 'Bath', es: 'Baño', fr: 'Bath', de: 'Bath' }, // LINGUE: da tradurre
  'Taglio / tosatura': { en: 'Trim / clip', es: 'Corte / esquilado', fr: 'Trim / clip', de: 'Trim / clip' }, // LINGUE: da tradurre
  'Bagno + taglio': { en: 'Bath and trim', es: 'Baño y corte', fr: 'Bath and trim', de: 'Bath and trim' }, // LINGUE: da tradurre
  Stripping: { en: 'Stripping', es: 'Stripping', fr: 'Stripping', de: 'Stripping' }, // LINGUE: da tradurre
  'Gestione nodi': { en: 'Dematting', es: 'Nudos', fr: 'Dematting', de: 'Dematting' }, // LINGUE: da tradurre
  Dermatologico: { en: 'Medicated', es: 'Dermatológico', fr: 'Medicated', de: 'Medicated' }, // LINGUE: da tradurre
  Antiparassitario: { en: 'Flea treatment', es: 'Antiparasitario', fr: 'Flea treatment', de: 'Flea treatment' }, // LINGUE: da tradurre
  Unghie: { en: 'Nails', es: 'Uñas', fr: 'Nails', de: 'Nails' }, // LINGUE: da tradurre
}

export function nomeServizioVisibile(lingua: Lingua, nomeSalvato: string): string {
  if (lingua === 'it' || !PREDEFINITI.has(nomeSalvato)) return nomeSalvato
  return TRADOTTI[nomeSalvato]?.[lingua] ?? nomeSalvato
}

export function nomeServizioIniziale(lingua: Lingua, nomeItaliano: string): string {
  return nomeServizioVisibile(lingua, nomeItaliano)
}
