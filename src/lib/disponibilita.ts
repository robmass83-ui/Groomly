import { orariCompilati, type Fascia, type Giorno, type OrariSettimana } from './orari'

const GIORNI = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export function oraRoma(data: Date): string {
  const parti = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(data)
  const ore = parti.find((parte) => parte.type === 'hour')?.value ?? '00'
  const minuti = parti.find((parte) => parte.type === 'minute')?.value ?? '00'
  return `${ore}:${minuti}`
}

export function istanteRoma(giorno: string, ora: string): Date {
  const [anno, mese, giornoMese] = giorno.split('-').map(Number)
  const [ore, minuti] = ora.split(':').map(Number)
  let utc = Date.UTC(anno, (mese ?? 1) - 1, giornoMese, (ore ?? 0) - 1, minuti ?? 0)
  for (let giro = 0; giro < 4; giro += 1) {
    const visto = oraRoma(new Date(utc))
    const [vh, vm] = visto.split(':').map(Number)
    const delta = ((ore ?? 0) * 60 + (minuti ?? 0)) - ((vh ?? 0) * 60 + (vm ?? 0))
    if (delta === 0) break
    utc += delta * 60 * 1000
  }
  return new Date(utc)
}

function minutiDi(hhmm: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function hhmm(minuti: number): string {
  return `${String(Math.floor(minuti / 60)).padStart(2, '0')}:${String(minuti % 60).padStart(2, '0')}`
}

export function giornoRoma(giorno: string): number {
  const nome = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Rome', weekday: 'short' }).format(istanteRoma(giorno, '12:00'))
  return GIORNI.indexOf(nome as typeof GIORNI[number])
}

type Occupante = { inizio: Date; fine: Date; status: string; provvisorio?: boolean; scadeIl?: Date }

function sovrappone(inizio: Date, fine: Date, altroInizio: Date, altroFine: Date): boolean {
  return inizio.getTime() < altroFine.getTime() && altroInizio.getTime() < fine.getTime()
}

function occupanti(appuntamenti: readonly Occupante[], richieste: readonly Occupante[], adesso: Date): Occupante[] {
  return [
    ...appuntamenti.filter((voce) => {
      if (voce.status !== 'programmato') return false
      if (voce.provvisorio && voce.scadeIl && voce.scadeIl.getTime() <= adesso.getTime()) return false
      return true
    }),
    ...richieste.filter((voce) => voce.status === 'nuova'),
  ]
}

export function intervalloLibero(
  inizio: Date,
  fine: Date,
  adesso: Date,
  appuntamenti: readonly Occupante[],
  richieste: readonly Occupante[],
): boolean {
  return !occupanti(appuntamenti, richieste, adesso).some((voce) => sovrappone(inizio, fine, voce.inizio, voce.fine))
}

export function orariLiberi(input: {
  giorno: string
  fasce: readonly Fascia[]
  passoMin: number
  durataMin: number
  appuntamenti: readonly { inizio: Date; fine: Date; status: string; cane?: string; provvisorio?: boolean; scadeIl?: Date }[]
  richieste: readonly { inizio: Date; fine: Date; status: string; scadeIl?: Date }[]
  adesso: Date
}): string[] {
  const occupati = occupanti(input.appuntamenti, input.richieste, input.adesso)
  const liberi: string[] = []
  for (const fascia of input.fasce) {
    const da = minutiDi(fascia.da)
    const a = minutiDi(fascia.a)
    if (da === null || a === null || input.passoMin <= 0 || input.durataMin <= 0) continue
    for (let cursore = da; cursore + input.durataMin <= a; cursore += input.passoMin) {
      const inizio = istanteRoma(input.giorno, hhmm(cursore))
      const fine = new Date(inizio.getTime() + input.durataMin * 60 * 1000)
      const preso = occupati.some((voce) => sovrappone(inizio, fine, voce.inizio, voce.fine))
      if (!preso) liberi.push(hhmm(cursore))
    }
  }
  return liberi
}

/** Se la richiesta non ha una fine utile, occupa un'ora: altrimenti non blocca lo slot. */
export function fineOccupata(inizio: Date, fine: Date, minimoMin = 60): Date {
  if (fine.getTime() > inizio.getTime()) return fine
  return new Date(inizio.getTime() + minimoMin * 60 * 1000)
}

export function chiaveGiornoRoma(adesso: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(adesso)
}

export function giornoDopo(giorno: string): string {
  const [anno, mese, giornoMese] = giorno.split('-').map(Number)
  const data = new Date(Date.UTC(anno, (mese ?? 1) - 1, (giornoMese ?? 1) + 1))
  const y = data.getUTCFullYear()
  const m = String(data.getUTCMonth() + 1).padStart(2, '0')
  const d = String(data.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const ORIZZONTE_GIORNI = 42

export function elencaGiorni(dal: string, quanti: number): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dal)) return []
  const n = Math.min(ORIZZONTE_GIORNI, Math.max(0, Math.floor(quanti)))
  const giorni: string[] = []
  let giorno = dal
  for (let indice = 0; indice < n; indice += 1) {
    giorni.push(giorno)
    giorno = giornoDopo(giorno)
  }
  return giorni
}

/** Senza orari settimanali il salone, in app, accetta dalle 08:00 alle 19:00. Qui l'ultima partenza da un'ora ci sta. */
export const FASCIA_SENZA_ORARI: readonly Fascia[] = [{ da: '08:00', a: '20:00' }]

function fasciaValida(value: unknown): value is Fascia {
  if (!value || typeof value !== 'object') return false
  const da = (value as { da?: unknown }).da
  const a = (value as { a?: unknown }).a
  return typeof da === 'string' && typeof a === 'string' && /^\d{2}:\d{2}$/.test(da) && /^\d{2}:\d{2}$/.test(a)
}

export function fascePubbliche(orari: unknown, giorno: string): Fascia[] {
  if (!orari || typeof orari !== 'object' || Array.isArray(orari) || !orariCompilati(orari as OrariSettimana)) {
    return FASCIA_SENZA_ORARI.map((fascia) => ({ ...fascia }))
  }
  const indice = giornoRoma(giorno) as Giorno
  const fasce = (orari as OrariSettimana)[indice]
  if (!Array.isArray(fasce)) return []
  return fasce.filter(fasciaValida)
}

export function orariPrenotabili(input: {
  giorno: string
  fasce: readonly Fascia[]
  passoMin: number
  durataMin: number
  chiuso: boolean
  appuntamenti: readonly { inizio: Date; fine: Date; status: string; cane?: string; provvisorio?: boolean; scadeIl?: Date }[]
  richieste: readonly { inizio: Date; fine: Date; status: string; scadeIl?: Date }[]
  adesso: Date
}): string[] {
  if (input.chiuso) return []
  return orariLiberi(input).filter((ora) => istanteRoma(input.giorno, ora).getTime() > input.adesso.getTime())
}

export function calendarioPrenotabile(input: {
  dal: string
  quanti: number
  orari: unknown
  chiusure: readonly { startDay: string; endDay: string }[]
  passoMin: number
  durataMin: number
  appuntamenti: readonly { inizio: Date; fine: Date; status: string; provvisorio?: boolean; scadeIl?: Date }[]
  richieste: readonly { inizio: Date; fine: Date; status: string; scadeIl?: Date }[]
  adesso: Date
}): Record<string, string[]> {
  const oggi = chiaveGiornoRoma(input.adesso)
  const ultimo = elencaGiorni(oggi, ORIZZONTE_GIORNI).at(-1) ?? oggi
  const risultato: Record<string, string[]> = {}
  for (const giorno of elencaGiorni(input.dal, input.quanti)) {
    if (giorno < oggi || giorno > ultimo) continue
    const chiuso = input.chiusure.some((chiusura) => chiusura.startDay <= giorno && giorno <= chiusura.endDay)
    const orari = orariPrenotabili({
      giorno,
      fasce: fascePubbliche(input.orari, giorno),
      passoMin: input.passoMin,
      durataMin: input.durataMin,
      chiuso,
      appuntamenti: input.appuntamenti,
      richieste: input.richieste,
      adesso: input.adesso,
    })
    if (orari.length > 0) risultato[giorno] = orari
  }
  return risultato
}

/**
 * `aperteMittente` conta le richieste aperte dalla stessa connessione; `aperteSalone` conta i mittenti diversi, non i documenti:
 * chi manda da un solo indirizzo occupa al massimo un posto del tetto del salone, qualunque email e telefono scriva.
 */
export function decisioneAntispam(input: { aperteTelefono: number; aperteSalone: number; aperteMittente?: number; esca: string }):
  | { ok: true; scrivi: boolean }
  | { ok: false; message: string } {
  if (input.esca.trim() !== '') return { ok: true, scrivi: false }
  if (input.aperteTelefono >= 2 || (input.aperteMittente ?? 0) >= 2 || input.aperteSalone >= 20) {
    return { ok: false, message: 'Troppe richieste' }
  }
  return { ok: true, scrivi: true }
}
