import type { Fascia } from './orari'

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

function sovrappone(inizio: Date, fine: Date, altroInizio: Date, altroFine: Date): boolean {
  return inizio.getTime() < altroFine.getTime() && altroInizio.getTime() < fine.getTime()
}

export function orariLiberi(input: {
  giorno: string
  fasce: readonly Fascia[]
  passoMin: number
  durataMin: number
  appuntamenti: readonly { inizio: Date; fine: Date; status: string; cane?: string }[]
  richieste: readonly { inizio: Date; fine: Date; status: string; scadeIl: Date }[]
  adesso: Date
}): string[] {
  const occupati = [
    ...input.appuntamenti.filter((voce) => voce.status === 'programmato'),
    ...input.richieste.filter((voce) => voce.status === 'nuova' && voce.scadeIl.getTime() > input.adesso.getTime()),
  ]
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

export function decisioneAntispam(input: { aperteTelefono: number; aperteSalone: number; esca: string }):
  | { ok: true; scrivi: boolean }
  | { ok: false; message: string } {
  if (input.esca.trim() !== '') return { ok: true, scrivi: false }
  if (input.aperteTelefono >= 2 || input.aperteSalone >= 20) return { ok: false, message: 'Troppe richieste' }
  return { ok: true, scrivi: true }
}
