import { chiaveGiornoRoma, istanteRoma } from './disponibilita'

function giornoDopo(giorno: string): string {
  return chiaveGiornoRoma(new Date(istanteRoma(giorno, '12:00').getTime() + 26 * 60 * 60 * 1000))
}

export function tempoRisposta(adesso: Date, inizio: Date): { minuti: number; scade: Date } | null {
  if (inizio.getTime() <= adesso.getTime()) return null
  const oggi = chiaveGiornoRoma(adesso)
  const giorno = chiaveGiornoRoma(inizio)
  let minuti = 60
  if (giorno === oggi) minuti = 15
  else if (giorno === giornoDopo(oggi)) minuti = 60
  else if (inizio.getTime() - adesso.getTime() > 48 * 60 * 60 * 1000) minuti = 24 * 60
  const scade = new Date(Math.min(adesso.getTime() + minuti * 60 * 1000, inizio.getTime()))
  if (scade.getTime() <= adesso.getTime()) return null
  return { minuti, scade }
}
