import type { SegnoSuggerimento } from './revisioneSuggerimenti'

export type NotaSuggerimento = {
  id: string
  email: string
  categoria: string
  testo: string
  salonId: string
  creato: number | null
}

export type VoceSuggerimento = {
  id: string
  email: string
  salonId: string
  creato: number | null
}

export type GruppoSuggerimento = {
  chiave: string
  categoria: string
  testo: string
  voci: VoceSuggerimento[]
}

export type FiltroCoda = 'nuovo' | 'interessante' | 'visto'

export function normalizzaTesto(testo: string): string {
  return testo.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function chiaveGruppo(categoria: string, testo: string): string {
  return `${categoria}\n${normalizzaTesto(testo)}`
}

export function raggruppaSuggerimenti(note: readonly NotaSuggerimento[]): GruppoSuggerimento[] {
  const gruppi = new Map<string, GruppoSuggerimento>()
  for (const nota of note) {
    const chiave = chiaveGruppo(nota.categoria, nota.testo)
    const presente = gruppi.get(chiave)
    const voce = { id: nota.id, email: nota.email, salonId: nota.salonId, creato: nota.creato }
    if (presente) {
      presente.voci.push(voce)
    } else {
      gruppi.set(chiave, { chiave, categoria: nota.categoria, testo: nota.testo.trim(), voci: [voce] })
    }
  }
  for (const gruppo of gruppi.values()) {
    gruppo.voci.sort((a, b) => (b.creato ?? 0) - (a.creato ?? 0))
  }
  return [...gruppi.values()].sort((a, b) => b.voci.length - a.voci.length || (b.voci[0]?.creato ?? 0) - (a.voci[0]?.creato ?? 0))
}

export function statoGruppo(chiave: string, segni: Readonly<Record<string, SegnoSuggerimento>>): FiltroCoda {
  return segni[chiave] ?? 'nuovo'
}

export function filtraGruppi(
  gruppi: readonly GruppoSuggerimento[],
  filtro: FiltroCoda,
  segni: Readonly<Record<string, SegnoSuggerimento>>,
): GruppoSuggerimento[] {
  return gruppi.filter((gruppo) => statoGruppo(gruppo.chiave, segni) === filtro)
}

export function contaStati(
  gruppi: readonly GruppoSuggerimento[],
  segni: Readonly<Record<string, SegnoSuggerimento>>,
): Record<FiltroCoda, number> {
  const conteggi: Record<FiltroCoda, number> = { nuovo: 0, interessante: 0, visto: 0 }
  for (const gruppo of gruppi) conteggi[statoGruppo(gruppo.chiave, segni)] += 1
  return conteggi
}

export function categorieConConteggio(note: readonly { categoria: string }[]): { categoria: string; totale: number }[] {
  const totali = new Map<string, number>()
  for (const nota of note) totali.set(nota.categoria, (totali.get(nota.categoria) ?? 0) + 1)
  return [...totali.entries()]
    .map(([categoria, totale]) => ({ categoria, totale }))
    .filter((voce) => voce.totale > 0)
    .sort((a, b) => b.totale - a.totale || a.categoria.localeCompare(b.categoria, 'it'))
}

export function saloniDelGruppo(gruppo: GruppoSuggerimento): string[] {
  const ids: string[] = []
  for (const voce of gruppo.voci) {
    if (!ids.includes(voce.salonId)) ids.push(voce.salonId)
  }
  return ids
}

const ORDINE: Record<FiltroCoda, number> = { interessante: 0, nuovo: 1, visto: 2 }

export function ordinaPerStato(
  gruppi: readonly GruppoSuggerimento[],
  segni: Readonly<Record<string, SegnoSuggerimento>>,
): GruppoSuggerimento[] {
  return [...gruppi].sort((a, b) => {
    const diff = ORDINE[statoGruppo(a.chiave, segni)] - ORDINE[statoGruppo(b.chiave, segni)]
    if (diff !== 0) return diff
    return b.voci.length - a.voci.length || (b.voci[0]?.creato ?? 0) - (a.voci[0]?.creato ?? 0)
  })
}

export type RigaPersona = {
  stato: FiltroCoda
  categoria: string
  testo: string
  volte: number
  email: string
  salonId: string
  creato: number | null
}

export function righeEsportazione(
  gruppi: readonly GruppoSuggerimento[],
  segni: Readonly<Record<string, SegnoSuggerimento>>,
): RigaPersona[] {
  const righe: RigaPersona[] = []
  for (const gruppo of ordinaPerStato(gruppi, segni)) {
    const stato = statoGruppo(gruppo.chiave, segni)
    for (const voce of gruppo.voci) {
      righe.push({
        stato,
        categoria: gruppo.categoria,
        testo: gruppo.testo,
        volte: gruppo.voci.length,
        email: voce.email,
        salonId: voce.salonId,
        creato: voce.creato,
      })
    }
  }
  return righe
}
