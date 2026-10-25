const ANNO_MS = 365 * 24 * 60 * 60 * 1000

export type PropostaRecensione = { dogId: string; at: string }

export function puoChiedereRecensione(input: {
  link: string
  proposte: readonly PropostaRecensione[]
  dogId: string
  adesso: Date
  noteProblemaOggi: boolean
  richiesteOggi: number
}): boolean {
  if (input.link.trim() === '') return false
  if (input.noteProblemaOggi) return false
  if (input.richiesteOggi >= 5) return false
  const ultima = input.proposte
    .filter((proposta) => proposta.dogId === input.dogId)
    .map((proposta) => new Date(proposta.at).getTime())
    .filter((time) => !Number.isNaN(time))
    .sort((a, b) => b - a)[0]
  if (ultima !== undefined && input.adesso.getTime() - ultima < ANNO_MS) return false
  return true
}

export const TESTO_RECENSIONE = 'Se ti è piaciuto il lavoro, una recensione su Google ci aiuta. Grazie.'
