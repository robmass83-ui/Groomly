import { backupStatusLabel } from './backupDoc'

export function millisecondiFrequenza(frequenza: string | undefined): number {
  if (frequenza === 'settimana') return 7 * 24 * 60 * 60 * 1000
  if (frequenza === 'mese') return 30 * 24 * 60 * 60 * 1000
  return 24 * 60 * 60 * 1000
}

export const ORARIO_BACKUP = '21:00'

function giorniFrequenza(frequenza: string | undefined): number {
  if (frequenza === 'settimana') return 7
  if (frequenza === 'mese') return 30
  return 1
}

function orarioValido(orario: string | undefined): [number, number] {
  const match = /^(\d{1,2}):(\d{2})$/.exec(orario ?? '')
  const ore = match ? Number(match[1]) : Number.NaN
  const minuti = match ? Number(match[2]) : Number.NaN
  if (ore >= 0 && ore <= 23 && minuti >= 0 && minuti <= 59) return [ore, minuti]
  return [21, 0]
}

/**
 * Il prossimo backup automatico: all'orario scelto, nel primo giorno dopo l'ultima copia
 * che la frequenza permette. Se quell'istante è già passato, il backup è dovuto adesso.
 */
export function prossimoBackup(ultimo: string | null, frequenza: string | undefined, orario: string | undefined, now: Date): number {
  const [ore, minuti] = orarioValido(orario)
  const then = ultimo ? Date.parse(ultimo) : Number.NaN
  const giorno = Number.isNaN(then) ? new Date(now) : new Date(then)
  if (!Number.isNaN(then)) giorno.setDate(giorno.getDate() + giorniFrequenza(frequenza))
  giorno.setHours(ore, minuti, 0, 0)
  return Math.max(giorno.getTime(), now.getTime())
}

export function chiaveErroreDrive(uid: string): string {
  return `groomly.users.${uid}.driveUltimoErrore`
}

export function statoDrive(input: {
  ultimo: string | null
  errore: boolean
  frequenza?: string
  now: Date
}): { testo: string; tono: 'ok' | 'warn' | 'bad' } | null {
  if (!input.ultimo && !input.errore) return null
  if (!input.ultimo || input.errore) return { testo: 'Errore', tono: 'bad' }
  const then = Date.parse(input.ultimo)
  if (Number.isNaN(then)) return { testo: 'Errore', tono: 'bad' }
  const testo = backupStatusLabel(input.ultimo, input.now)
  const limite = millisecondiFrequenza(input.frequenza) + 24 * 60 * 60 * 1000
  return { testo, tono: input.now.getTime() - then > limite ? 'warn' : 'ok' }
}

export function bannerBackup(input: {
  ultimo: string | null
  errore: boolean
  frequenza?: string
  now: Date
}): string | null {
  if (!input.errore) return null
  const then = input.ultimo ? Date.parse(input.ultimo) : Number.NaN
  if (input.ultimo && !Number.isNaN(then) && input.now.getTime() - then < millisecondiFrequenza(input.frequenza) * 2) return null
  return 'Il backup automatico non funziona. Aprilo in Impostazioni.'
}
