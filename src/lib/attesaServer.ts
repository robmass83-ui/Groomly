import * as enabled from '../data/firebase/enabled'

/** Quanto si aspetta il primo snapshot del server prima di mostrare la cache. */
export const ATTESA_SERVER_MS = 2500

/** Online, se dopo l'attesa del server non è arrivato niente e la cache è vuota, quanto si aspetta ancora prima di mostrare il salone vuoto. */
export const ATTESA_VUOTO_MS = 6000

export type MotivoRivela = 'rete' | 'tempo' | 'cloud'

/**
 * Online un salone senza cani né visite non resta in caricamento per sempre: se il server tace
 * (o l'ascolto è caduto) dopo un'altra attesa si mostra vuoto. Offline no: lì non si sa cosa c'è.
 */
export function attendiVuoto(mostraVuoto: () => void): (() => void) | null {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null
  const timer = window.setTimeout(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    mostraVuoto()
  }, ATTESA_VUOTO_MS)
  return () => window.clearTimeout(timer)
}

export function attendiServer(rivela: (motivo: MotivoRivela) => void): () => void {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) rivela('rete')
  const timer = window.setTimeout(() => rivela('tempo'), ATTESA_SERVER_MS)
  const offline = () => rivela('rete')
  window.addEventListener('offline', offline)
  let stopCloud: () => void = () => undefined
  try {
    if (typeof enabled.subscribeCloudUnavailable === 'function') {
      stopCloud = enabled.subscribeCloudUnavailable(() => rivela('cloud'))
    }
  } catch {
    stopCloud = () => undefined
  }
  return () => {
    window.clearTimeout(timer)
    window.removeEventListener('offline', offline)
    stopCloud()
  }
}
