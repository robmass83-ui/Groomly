import { SERVICE_SEED } from '../data/seed/services'
import type { Lingua } from './lingua'

// `Toelettatura` è la voce che il server mette quando la richiesta non ne ha.
const PREDEFINITI = new Set([...SERVICE_SEED.map((servizio) => servizio.name), 'Toelettatura'])

const TRADOTTI: Record<string, Record<Exclude<Lingua, 'it'>, string>> = {
  Bagno: { en: 'Bath', es: 'Baño', fr: 'Bain', de: 'Bad' },
  'Taglio / tosatura': { en: 'Trim / clip', es: 'Corte / esquilado', fr: 'Coupe / tonte', de: 'Schnitt / Schur' },
  'Bagno + taglio': { en: 'Bath and trim', es: 'Baño y corte', fr: 'Bain + coupe', de: 'Bad + Schnitt' },
  Stripping: { en: 'Stripping', es: 'Stripping', fr: 'Épilation', de: 'Trimmen' },
  'Gestione nodi': { en: 'Dematting', es: 'Nudos', fr: 'Démêlage', de: 'Entfilzen' },
  Dermatologico: { en: 'Medicated', es: 'Dermatológico', fr: 'Dermatologique', de: 'Dermatologisch' },
  Antiparassitario: { en: 'Flea treatment', es: 'Antiparasitario', fr: 'Antiparasitaire', de: 'Antiparasitär' },
  Toelettatura: { en: 'Grooming', es: 'Peluquería', fr: 'Toilettage', de: 'Fellpflege' },
  Unghie: { en: 'Nails', es: 'Uñas', fr: 'Griffes', de: 'Krallen' },
}

export function nomeServizioVisibile(lingua: Lingua, nomeSalvato: string): string {
  if (lingua === 'it' || !PREDEFINITI.has(nomeSalvato)) return nomeSalvato
  return TRADOTTI[nomeSalvato]?.[lingua] ?? nomeSalvato
}

export function nomeServizioIniziale(lingua: Lingua, nomeItaliano: string): string {
  return nomeServizioVisibile(lingua, nomeItaliano)
}
