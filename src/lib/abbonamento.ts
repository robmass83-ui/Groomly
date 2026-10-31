import type { LivelloElenco } from './funzioniPiano'

export type PianoVetrina = 'go' | 'plus' | 'salone'

// Prezzi segnaposto finché il pagamento dal Play Store non c'è.
export const PREZZI: Record<'plus' | 'salone', string> = { plus: '9,99 €', salone: '19,99 €' }

export const COLORE_PIANO: Record<PianoVetrina, string> = { go: 'var(--pri-solid)', plus: '#7B3FE4', salone: '#C99200' }
export const COLORE_PIANO_SCURO: Record<'plus' | 'salone', string> = { plus: '#4F2BB8', salone: '#8F6400' }

const RANGO_LIVELLO: Record<LivelloElenco, number> = { base: 0, pro: 1, salone: 2, vip: 2 }
const RANGO_PIANO: Record<PianoVetrina, number> = { go: 0, plus: 1, salone: 2 }

export function pianoAttivo(livello: LivelloElenco | undefined, piano: PianoVetrina): boolean {
  return RANGO_LIVELLO[livello ?? 'base'] >= RANGO_PIANO[piano]
}

export function ePianoVetrina(value: string | undefined): value is PianoVetrina {
  return value === 'go' || value === 'plus' || value === 'salone'
}
