import elenco from './licenze.json'

export type Licenza = { nome: string; versione: string; licenza: string }

export const LICENZE: readonly Licenza[] = elenco
