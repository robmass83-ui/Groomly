import type { Lingua } from './lingua'

const SPAGNA = new Set(['Europe/Madrid', 'Atlantic/Canary', 'Africa/Ceuta'])

export function linguaDalLuogo(fuso: string | null | undefined): Lingua | null {
  const zona = (fuso ?? '').trim()
  if (zona === 'Europe/Rome') return 'it'
  if (zona === 'Europe/London') return 'en'
  if (SPAGNA.has(zona)) return 'es'
  return null
}
