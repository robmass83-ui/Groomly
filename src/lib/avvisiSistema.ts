import { LINGUE, type Lingua } from '../i18n/lingua'

/** Comunicazioni di Groomly a tutti i saloni: le scrivono solo gli operatori. */
export const TIPI_AVVISO = ['importante', 'aggiornamento', 'manutenzione', 'novita'] as const
export type TipoAvviso = (typeof TIPI_AVVISO)[number]

export type Traduzioni = Partial<Record<Lingua, { titolo: string; testo: string }>>

export type AvvisoSistema = {
  id: string
  tipo: TipoAvviso
  titolo: string
  testo: string
  creato: number
  traduzioni?: Traduzioni
}

export const TITOLO_MAX = 120
export const TESTO_MAX = 2000

export function tipoAvviso(value: unknown): TipoAvviso {
  return TIPI_AVVISO.includes(value as TipoAvviso) ? value as TipoAvviso : 'novita'
}

export function traduzioniDi(value: unknown): Traduzioni | undefined {
  if (!value || typeof value !== 'object') return undefined
  const grezze = value as Record<string, { titolo?: unknown; testo?: unknown } | null | undefined>
  const traduzioni: Traduzioni = {}
  for (const lingua of LINGUE) {
    const voce = grezze[lingua]
    if (typeof voce?.titolo === 'string' && typeof voce.testo === 'string') traduzioni[lingua] = { titolo: voce.titolo, testo: voce.testo }
  }
  return Object.keys(traduzioni).length > 0 ? traduzioni : undefined
}

/** Il testo nella lingua dell'account; senza una traduzione con titolo resta l'italiano. */
export function testoPerLingua(avviso: { titolo: string; testo: string; traduzioni?: Traduzioni }, lingua: Lingua): { titolo: string; testo: string } {
  const voce = avviso.traduzioni?.[lingua]
  return voce && voce.titolo.trim() !== '' ? { titolo: voce.titolo, testo: voce.testo } : { titolo: avviso.titolo, testo: avviso.testo }
}

/** Gli avvisi a tutti e quelli del solo account, in una lista dal più nuovo. */
export function unisciAvvisi(globali: readonly AvvisoSistema[], account: readonly AvvisoSistema[]): AvvisoSistema[] {
  return [...globali, ...account].sort((a, b) => b.creato - a.creato)
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
