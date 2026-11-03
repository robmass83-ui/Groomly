/** `left` in px del fumetto dentro il grafico: centrato sulla barra, ma sempre dentro i bordi. */
export function posizioneFumetto({ centroBarra, larghezzaFumetto, larghezzaGrafico, margine = 4 }: {
  centroBarra: number
  larghezzaFumetto: number
  larghezzaGrafico: number
  margine?: number
}): number {
  const massimo = larghezzaGrafico - larghezzaFumetto - margine
  if (massimo < margine) return margine
  return Math.min(Math.max(centroBarra - larghezzaFumetto / 2, margine), massimo)
}
