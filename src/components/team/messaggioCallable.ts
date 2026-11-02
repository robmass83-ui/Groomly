export function messaggioCallable(error: unknown, fallito: string, riprova: string): string {
  if (error instanceof Error && error.message.trim() !== '') {
    const message = error.message.trim()
    if (/\[500\]|\bINTERNAL\b|functions\/(internal|unavailable|deadline-exceeded|unknown)|\bauth\/[\w-]+/i.test(message)) return riprova
    const split = message.indexOf(': ')
    const testo = split > 0 && /^[a-z0-9/-]+$/.test(message.slice(0, split)) ? message.slice(split + 2) : message
    const pulito = testo.replace(/\s*\[\d{3}\]\s*$/, '').trim()
    return pulito === '' ? fallito : pulito
  }
  return fallito
}
