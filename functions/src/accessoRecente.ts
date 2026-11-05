import { erroreServer } from './erroriServer'

export const RICONFERMA_MS = 15 * 60 * 1000

/** Le azioni distruttive vogliono un accesso recente. `auth_time` è in secondi e lo aggiorna la riautenticazione. */
export function controllaAccessoRecente(authTimeSec: unknown, adesso = Date.now()): void {
  if (typeof authTimeSec !== 'number' || adesso - authTimeSec * 1000 > RICONFERMA_MS) {
    throw erroreServer('failed-precondition', 'riconferma_richiesta')
  }
}

/** Solo per l'admin: chi non ha il claim lo ferma il controllo dell'azione, con «Accesso negato». */
export function controllaAdminRecente(token: { admin?: unknown; auth_time?: unknown } | undefined, adesso = Date.now()): void {
  if (token?.admin === true) controllaAccessoRecente(token.auth_time, adesso)
}
