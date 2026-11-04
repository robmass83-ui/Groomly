import type { Lingua } from '../i18n/lingua'

const OGGETTI = {
  it: 'Il piano Groomly è stato aggiornato',
  en: 'Your Groomly plan was updated',
  es: 'Tu plan de Groomly se ha actualizado',
  // LINGUE: da tradurre
  fr: 'Your Groomly plan was updated',
  de: 'Your Groomly plan was updated',
} as const

export function oggettoAvviso(lingua: Lingua): string {
  return OGGETTI[lingua]
}

export function corpoAvviso(testo: string): string {
  return testo.trim()
}

export function htmlAvviso(testo: string): string {
  return corpoAvviso(testo)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>')
}
