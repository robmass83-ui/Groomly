import type { LivelloElenco } from './funzioniPiano'
import type { StatoPiano } from './piano'

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

export type StatoScheda =
  | { tipo: 'attesa' }
  | { tipo: 'go'; provaDisponibile: boolean }
  | { tipo: 'prova'; giorni: number }
  | { tipo: 'plus' }
  | { tipo: 'salone' }
  | { tipo: 'vip' }

// Cosa mostra la scorciatoia Abbonamento. La prova la avvia solo il titolare, e una volta sola.
export function statoScheda(
  piano: { stato: StatoPiano; livelloNome?: LivelloElenco; provaUsata: boolean; pronto?: boolean },
  titolare: boolean,
): StatoScheda {
  if (piano.pronto === false) return { tipo: 'attesa' }
  if (piano.livelloNome === 'vip') return { tipo: 'vip' }
  if (piano.stato.livello === 'salone') return { tipo: 'salone' }
  if (piano.stato.livello === 'pro') {
    return piano.stato.inProva ? { tipo: 'prova', giorni: piano.stato.giorniProva ?? 0 } : { tipo: 'plus' }
  }
  return { tipo: 'go', provaDisponibile: titolare && !piano.provaUsata }
}
