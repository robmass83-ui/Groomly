export const LINGUE = ['it', 'en', 'es', 'fr', 'de'] as const

export type Lingua = (typeof LINGUE)[number]

/** Ogni lingua col suo nome, uguale in tutte le lingue dell'app. */
export const NOMI_LINGUA: Record<Lingua, string> = {
  it: 'Italiano',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
}

export const LOCALE_INTL: Record<Lingua, string> = {
  it: 'it-IT',
  en: 'en-GB',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
}

export function linguaValida(value: unknown): Lingua | null {
  return LINGUE.find((lingua) => lingua === value) ?? null
}

export function linguaDelTelefono(tag: string | null | undefined): Lingua {
  return linguaValida((tag ?? '').trim().toLowerCase().split('-')[0]) ?? 'en'
}
