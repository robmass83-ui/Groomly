const OGGETTI = {
  it: 'Il piano Groomly è stato aggiornato',
  en: 'Your Groomly plan was updated',
  es: 'Tu plan de Groomly se ha actualizado',
} as const

export function oggettoAvviso(lingua: 'it' | 'en' | 'es'): string {
  return OGGETTI[lingua]
}

export function corpoAvviso(testo: string): string {
  return testo.trim()
}
