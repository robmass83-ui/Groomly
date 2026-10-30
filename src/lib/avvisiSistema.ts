/** Comunicazioni di Groomly a tutti i saloni: le scrivono solo gli operatori. */
export const TIPI_AVVISO = ['importante', 'aggiornamento', 'manutenzione', 'novita'] as const
export type TipoAvviso = (typeof TIPI_AVVISO)[number]

export type AvvisoSistema = {
  id: string
  tipo: TipoAvviso
  titolo: string
  testo: string
  creato: number
}

export const TITOLO_MAX = 120
export const TESTO_MAX = 2000

export function tipoAvviso(value: unknown): TipoAvviso {
  return TIPI_AVVISO.includes(value as TipoAvviso) ? value as TipoAvviso : 'novita'
}

export function nonLetti(avvisi: readonly AvvisoSistema[], lettiFino: number): number {
  return avvisi.filter((avviso) => avviso.creato > lettiFino).length
}

/** Gli importanti ancora da leggere restano in alto; tutti gli altri vanno nella lista, dal più nuovo. */
export function dividiAvvisi(avvisi: readonly AvvisoSistema[], lettiFino: number): { evidenza: AvvisoSistema[]; altri: AvvisoSistema[] } {
  const ordinati = [...avvisi].sort((a, b) => b.creato - a.creato)
  const evidenza = ordinati.filter((avviso) => avviso.tipo === 'importante' && avviso.creato > lettiFino)
  return { evidenza, altri: ordinati.filter((avviso) => !evidenza.includes(avviso)) }
}

/** Dopo l'apertura vale come letto tutto ciò che si è visto. */
export function lettiDopoApertura(avvisi: readonly AvvisoSistema[], lettiFino: number): number {
  return avvisi.reduce((max, avviso) => Math.max(max, avviso.creato), lettiFino)
}
