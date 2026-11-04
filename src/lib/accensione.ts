import { chiaveGiornoRoma } from './disponibilita'

// Controllo pre-accensione degli abbonamenti: lo calcola il server, il pannello admin lo mostra.
export const GIORNI_ANNUNCIO = 15
export const PACCHETTI_ATTESI = 6

export type VoceControllo =
  | { id: 'chiave'; ok: boolean }
  | { id: 'offering'; ok: boolean; trovati: number; attesi: number; mancanti: string[]; errore?: 'senza-accesso' | 'rete' }
  | { id: 'webhook'; ok: boolean; ultimoEventoIl: string | null }
  | { id: 'annuncio'; ok: boolean; inviatoIl: string | null; pagamentiDal: string | null; mancanoGiorni: number }
  | { id: 'conferma'; ok: boolean; confermatoIl: string | null }

export type Controllo = { voci: VoceControllo[]; pronti: number; tuttoVerde: boolean; attivi: boolean }

// Giorni di calendario (ora di Roma) da `da` ad `a`: negativo se `a` è prima.
export function giorniRoma(da: Date, a: Date): number {
  const utc = (giorno: string) => {
    const [anno, mese, g] = giorno.split('-').map(Number)
    return Date.UTC(anno, mese - 1, g)
  }
  return Math.round((utc(chiaveGiornoRoma(a)) - utc(chiaveGiornoRoma(da))) / 86_400_000)
}
