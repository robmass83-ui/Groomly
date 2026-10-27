export const CATEGORIE_SUGGERIMENTO = [
  'bug',
  'critica',
  'miglioramento',
  'manca',
  'agenda',
  'animali',
  'listino',
  'incassi',
  'account',
  'lingua',
  'altro',
] as const

export type CategoriaSuggerimento = (typeof CATEGORIE_SUGGERIMENTO)[number]
