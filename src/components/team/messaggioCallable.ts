export function messaggioCallable(error: unknown, fallito: string, riprova: string): string {
  if (error instanceof Error && error.message.trim() !== '') {
    const message = error.message.trim()
    const code = (error as { code?: unknown }).code
    if (typeof code === 'string' && /^(functions|auth)\//.test(code) && code !== 'functions/failed-precondition') return riprova
    // Il testo del server è l'unico che dice qualcosa a chi legge: tutto il resto (codici nudi, INTERNAL) è un errore generico.
    if (/^[a-z-]+$/.test(message) || /\bINTERNAL\b|\[500\]|\bauth\/[\w-]+|functions\/(internal|unavailable|deadline-exceeded|unknown)/i.test(message)) return riprova
    const split = message.indexOf(': ')
    const testo = split > 0 && /^[a-z0-9/-]+$/.test(message.slice(0, split)) ? message.slice(split + 2) : message
    const pulito = testo.replace(/\s*\[\d{3}\]\s*$/, '').trim()
    return pulito === '' ? fallito : pulito
  }
  return fallito
}
