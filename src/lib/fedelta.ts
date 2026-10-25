export const TIMBRI_PER_PREMIO = 10
export const NOTA_PREMIO = 'Premio fedeltà'

export type VisitaFedelta = {
  id: string
  status: string
  premio?: boolean
}

export type Tessera = {
  timbri: string[]
  premiDisponibili: number
}

export function ricalcolaFedelta(visite: readonly VisitaFedelta[]): Tessera {
  const completati = visite.filter((visita) => visita.status === 'completato')
  const usati = completati.filter((visita) => visita.premio).length
  const timbri = completati.filter((visita) => !visita.premio).map((visita) => visita.id)
  return {
    timbri,
    premiDisponibili: Math.max(0, Math.floor(timbri.length / TIMBRI_PER_PREMIO) - usati),
  }
}

export function usaPremio<T extends { price: number }>(righe: readonly T[]): { righe: T[]; nota: string } {
  return {
    righe: righe.map((riga, index) => (index === 0 ? { ...riga, price: 0 } : riga)),
    nota: NOTA_PREMIO,
  }
}
