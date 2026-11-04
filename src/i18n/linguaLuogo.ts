import type { Lingua } from './lingua'

const SPAGNA = new Set(['Europe/Madrid', 'Atlantic/Canary', 'Africa/Ceuta'])

export function linguaDalLuogo(fuso: string | null | undefined): Lingua | null {
  const zona = (fuso ?? '').trim()
  if (zona === 'Europe/Rome') return 'it'
  if (zona === 'Europe/London') return 'en'
  if (SPAGNA.has(zona)) return 'es'
  return null
}

/** La regola di prima: luogo, poi telefono fra le sole tre lingue di allora. Serve solo al passaggio. */
export function linguaVecchiaRegola(telefono: string | null | undefined, fuso: string | null | undefined): Lingua {
  const luogo = linguaDalLuogo(fuso)
  if (luogo) return luogo
  const base = (telefono ?? '').trim().toLowerCase().split('-')[0]
  return base === 'it' || base === 'es' ? base : 'en'
}
