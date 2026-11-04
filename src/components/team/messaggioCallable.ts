import { AppError } from '../../data/errors'
import { codiceErroreServer, fraseErrore } from '../../i18n/errori'
import { leggiLinguaAttiva } from '../../i18n/linguaLocale'

/** Il testo di un errore di callable. `message` del server è in italiano: si legge solo il codice. */
export function messaggioCallable(error: unknown, fallito: string, riprova: string): string {
  const server = codiceErroreServer(error)
  if (server) return fraseErrore(leggiLinguaAttiva(), server.codice, server.valori)
  if (error instanceof AppError) return error.message
  if (error instanceof Error && error.message.trim() !== '') {
    const message = error.message.trim()
    const code = (error as { code?: unknown }).code
    if (typeof code === 'string' && /^(functions|auth)\//.test(code) && code !== 'functions/failed-precondition') return riprova
    if (/^[a-z-]+$/.test(message) || /\bINTERNAL\b|\[500\]|\bauth\/[\w-]+|functions\/(internal|unavailable|deadline-exceeded|unknown)/i.test(message)) return riprova
  }
  return fallito
}
