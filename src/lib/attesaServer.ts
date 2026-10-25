import * as enabled from '../data/firebase/enabled'

/** Quanto si aspetta il primo snapshot del server prima di mostrare la cache. */
export const ATTESA_SERVER_MS = 2500

export type MotivoRivela = 'rete' | 'tempo' | 'cloud'

export function attendiServer(rivela: (motivo: MotivoRivela) => void): () => void {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) rivela('rete')
  const timer = window.setTimeout(() => rivela('tempo'), ATTESA_SERVER_MS)
  const offline = () => rivela('rete')
  window.addEventListener('offline', offline)
  let stopCloud = () => undefined
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
