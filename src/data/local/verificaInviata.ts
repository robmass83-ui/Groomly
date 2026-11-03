import { RESEND_WAIT_SECONDS } from '../../lib/authGate'

const chiave = (email: string) => `groomly.verificaInviata.${email.trim().toLowerCase()}`

/** Segna l'invio dell'email di conferma: serve a far ripartire il conto alla rovescia dal punto giusto. */
export function segnaVerificaInviata(email: string, ora: number = Date.now()): void {
  if (!email) return
  try {
    localStorage.setItem(chiave(email), String(ora))
  } catch {
    // Senza spazio locale il conto parte da zero: si può solo rimandare.
  }
}

export function verificaInviataIl(email: string): number | null {
  if (!email) return null
  try {
    const grezzo = localStorage.getItem(chiave(email))
    if (grezzo === null) return null
    const valore = Number(grezzo)
    return Number.isFinite(valore) ? valore : null
  } catch {
    return null
  }
}

/** Secondi che mancano al prossimo invio possibile: 0 se non risulta nessun invio recente. */
export function secondiDaAspettare(inviataIl: number | null, ora: number): number {
  if (inviataIl === null) return 0
  return Math.min(RESEND_WAIT_SECONDS, Math.max(0, Math.ceil(RESEND_WAIT_SECONDS - (ora - inviataIl) / 1000)))
}
