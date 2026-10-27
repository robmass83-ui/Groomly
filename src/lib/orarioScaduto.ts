import { closeDueAt } from './appointments'

export interface VisitaOrario {
  id: string
  nome: string
  status: string
  fine: Date
}

const ORA_ROMA = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Rome',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** La programmata già finita, la più vecchia, che questo telefono non ha ancora avvisato. */
export function visitaDaAvvisare(
  visite: readonly VisitaOrario[],
  ora: Date,
  giaAvvisate: ReadonlySet<string>,
): VisitaOrario | null {
  const adesso = ora.getTime()
  let scelta: VisitaOrario | null = null
  for (const visita of visite) {
    if (visita.status !== 'programmato') continue
    if (giaAvvisate.has(visita.id)) continue
    const fine = visita.fine.getTime()
    if (Number.isNaN(fine) || fine > adesso) continue
    if (!scelta || fine < scelta.fine.getTime()) scelta = visita
  }
  return scelta
}

/** Visite ancora programmate, non già avvisate, finite o che finiscono entro la giornata. */
export function visiteDaProgrammare(
  visite: readonly VisitaOrario[],
  ora: Date,
  giaAvvisate: ReadonlySet<string>,
): VisitaOrario[] {
  const adesso = ora.getTime()
  const finoA = adesso + 18 * 60 * 60 * 1000
  const nonPrimaDi = adesso - 12 * 60 * 60 * 1000
  return visite
    .filter((visita) => {
      if (visita.status !== 'programmato' || giaAvvisate.has(visita.id)) return false
      const fine = visita.fine.getTime()
      return !Number.isNaN(fine) && fine <= finoA && fine >= nonPrimaDi
    })
    .sort((a, b) => a.fine.getTime() - b.fine.getTime())
}

export function idNotifica(id: string): number {
  let n = 0
  for (const carattere of id) n = (n * 33 + carattere.charCodeAt(0)) % 20000
  return 100 + n
}

/** Orologio di Roma, ore e minuti. */
export function oraRoma(fine: Date): string {
  let ora = ''
  let minuti = ''
  for (const parte of ORA_ROMA.formatToParts(fine)) {
    if (parte.type === 'hour') ora = parte.value === '24' ? '00' : parte.value
    if (parte.type === 'minute') minuti = parte.value
  }
  return `${ora}:${minuti}`
}

/** Se la visita non ha già una fine, la calcola da inizio e servizi. */
export function fineDellaVisita(visita: {
  fine?: Date | null
  start: Date
  services: { durationMin: number }[]
}): Date | null {
  if (visita.fine instanceof Date && !Number.isNaN(visita.fine.getTime())) return visita.fine
  if (!(visita.start instanceof Date) || Number.isNaN(visita.start.getTime())) return null
  if (visita.services.length === 0) return null
  return closeDueAt(visita.start, visita.services)
}
