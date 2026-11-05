import { chiaveGiornoRoma } from './disponibilita'

export type Coorte = { settimana: string; saloni: number; rimasti7: number; rimasti30: number }

export type StatisticheGiorno = {
  giorno: string
  saloni: number
  nuovi: number
  attivi1: number
  attivi7: number
  attivi30: number
  attivati: number
  appuntamenti: number
  mediaAppuntamenti: number
  coorti: Coorte[]
  avvisami: { plus: number; salon: number }
  esclusi: number
  calcolatoIl: string
}

const GIORNO_MS = 86_400_000
const NUMERI = ['saloni', 'nuovi', 'attivi1', 'attivi7', 'attivi30', 'attivati', 'appuntamenti', 'mediaAppuntamenti', 'esclusi'] as const

function utcDi(giorno: string): number {
  const [anno, mese, data] = giorno.split('-').map(Number) as [number, number, number]
  return Date.UTC(anno, mese - 1, data)
}

function chiaveUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export function giornoPrecedenteRoma(adesso: Date): string {
  return chiaveUtc(utcDi(chiaveGiornoRoma(adesso)) - GIORNO_MS)
}

// A mezzanotte Roma è avanti di una o due ore: conta quella che apre davvero il giorno.
function mezzanotteRoma(giorno: string): number {
  const base = utcDi(giorno)
  const due = base - 2 * 3_600_000
  return chiaveGiornoRoma(new Date(due)) === giorno ? due : base - 3_600_000
}

/** Inizio compreso e fine esclusa: il giorno del cambio d'ora non dura 24 ore. */
export function limitiGiornoRoma(giorno: string): [number, number] {
  return [mezzanotteRoma(giorno), mezzanotteRoma(chiaveUtc(utcDi(giorno) + GIORNO_MS))]
}

export function lunediRoma(data: Date): string {
  const giorno = utcDi(chiaveGiornoRoma(data))
  const dallaDomenica = new Date(giorno).getUTCDay()
  return chiaveUtc(giorno - ((dallaDomenica + 6) % 7) * GIORNO_MS)
}

function numero(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function coorteDi(value: unknown): Coorte | undefined {
  if (!value || typeof value !== 'object') return undefined
  const { settimana, saloni, rimasti7, rimasti30 } = value as Record<string, unknown>
  if (typeof settimana !== 'string' || !numero(saloni) || !numero(rimasti7) || !numero(rimasti30)) return undefined
  return { settimana, saloni, rimasti7, rimasti30 }
}

export function leggiStatistiche(value: unknown): StatisticheGiorno | undefined {
  if (!value || typeof value !== 'object') return undefined
  const dati = value as Record<string, unknown>
  if (typeof dati.giorno !== 'string' || typeof dati.calcolatoIl !== 'string' || !NUMERI.every((campo) => numero(dati[campo]))) return undefined
  const avvisami = dati.avvisami as Record<string, unknown> | undefined
  if (!numero(avvisami?.plus) || !numero(avvisami?.salon)) return undefined
  const coorti = Array.isArray(dati.coorti) ? dati.coorti.map(coorteDi).filter((voce) => voce !== undefined) : []
  return {
    ...Object.fromEntries(NUMERI.map((campo) => [campo, dati[campo]])) as Record<(typeof NUMERI)[number], number>,
    giorno: dati.giorno,
    coorti,
    avvisami: { plus: avvisami.plus, salon: avvisami.salon },
    calcolatoIl: dati.calcolatoIl,
  }
}
