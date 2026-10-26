export const CATEGORIE_SUGGERIMENTO = ['bug', 'critica', 'miglioramento', 'manca', 'lingua', 'altro'] as const

export type CategoriaSuggerimento = (typeof CATEGORIE_SUGGERIMENTO)[number]
