export type VisitaStat = {
  status: 'programmato' | 'completato' | 'disdetto' | 'non_venuto'
  incasso: number
  minutiEffettivi?: number
  minutiPrevisti: number
  dogId: string
  start: Date
}

export function euroOra(visite: readonly VisitaStat[]): number | null {
  let incasso = 0
  let minuti = 0
  for (const visita of visite) {
    if (visita.status !== 'completato') continue
    const durata = visita.minutiEffettivi && visita.minutiEffettivi > 0 ? visita.minutiEffettivi : visita.minutiPrevisti
    if (durata <= 0) continue
    incasso += visita.incasso
    minuti += durata
  }
  if (minuti <= 0) return null
  return incasso / (minuti / 60)
}

export function previsione(visite: readonly VisitaStat[]): number {
  const chiusi = visite.filter((visita) => visita.status === 'completato' || visita.status === 'non_venuto')
  const nonVenuti = chiusi.filter((visita) => visita.status === 'non_venuto').length
  const tasso = chiusi.length === 0 ? 0 : nonVenuti / chiusi.length
  const incassato = visite.filter((visita) => visita.status === 'completato').reduce((sum, visita) => sum + visita.incasso, 0)
  const programmati = visite.filter((visita) => visita.status === 'programmato').reduce((sum, visita) => sum + visita.incasso, 0)
  return incassato + programmati * (1 - tasso)
}

export function clientiInRitardo(
  visite: readonly VisitaStat[],
  adesso: Date,
): string[] {
  const perCane = new Map<string, VisitaStat[]>()
  for (const visita of visite) {
    const lista = perCane.get(visita.dogId) ?? []
    lista.push(visita)
    perCane.set(visita.dogId, lista)
  }
  const ritardo: string[] = []
  for (const [dogId, lista] of perCane) {
    const futuri = lista.some((visita) => visita.status === 'programmato' && visita.start.getTime() >= adesso.getTime())
    if (futuri) continue
    const fatti = lista.filter((visita) => visita.status === 'completato').sort((a, b) => a.start.getTime() - b.start.getTime())
    if (fatti.length < 2) continue
    let somma = 0
    for (let index = 1; index < fatti.length; index += 1) {
      somma += fatti[index].start.getTime() - fatti[index - 1].start.getTime()
    }
    const medio = somma / (fatti.length - 1)
    const ultimo = fatti[fatti.length - 1].start.getTime()
    if (adesso.getTime() - ultimo > medio * 1.5) ritardo.push(dogId)
  }
  return ritardo
}
