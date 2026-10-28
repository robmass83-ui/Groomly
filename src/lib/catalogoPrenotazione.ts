export type TagliaPrenotazione = 'piccola' | 'media' | 'grande'

export type VoceCatalogo = {
  id: string
  nome: string
  kind: 'principale' | 'extra'
  minuti: Record<TagliaPrenotazione, number>
  prezzo: Record<TagliaPrenotazione, number>
}

export type SceltaCatalogo = {
  voci: VoceCatalogo[]
  durataMin: number
  totaleIndicativo: number
}

const TAGLIE: TagliaPrenotazione[] = ['piccola', 'media', 'grande']

export function pubblicabile(voce: VoceCatalogo): boolean {
  return TAGLIE.every((taglia) => voce.minuti[taglia] >= 1 && voce.prezzo[taglia] > 0)
}

export function scegliCatalogo(
  catalogo: readonly VoceCatalogo[],
  ids: readonly string[],
  taglia: TagliaPrenotazione,
): SceltaCatalogo | null {
  if (ids.length === 0 || ids.length > 8) return null
  const voci = ids.map((id) => catalogo.find((voce) => voce.id === id))
  if (voci.some((voce) => !voce || !pubblicabile(voce))) return null
  const scelte = voci as VoceCatalogo[]
  if (scelte.filter((voce) => voce.kind === 'principale').length !== 1) return null
  return {
    voci: scelte,
    durataMin: scelte.reduce((sum, voce) => sum + voce.minuti[taglia], 0),
    totaleIndicativo: scelte.reduce((sum, voce) => sum + voce.prezzo[taglia], 0),
  }
}
