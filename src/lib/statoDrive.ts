import { backupStatusLabel } from './backupDoc'

export function millisecondiFrequenza(frequenza: string | undefined): number {
  if (frequenza === 'settimana') return 7 * 24 * 60 * 60 * 1000
  if (frequenza === 'mese') return 30 * 24 * 60 * 60 * 1000
  return 24 * 60 * 60 * 1000
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
