const MESI = 13
const GIORNI_VISTA_RAPIDA = 21
let pavimento = inizioFinestraAgenda(new Date()).getTime()
const ascoltatori = new Set<() => void>()

export function inizioFinestraAgenda(adesso: Date): Date {
  const inizio = new Date(adesso.getFullYear(), adesso.getMonth() - MESI, adesso.getDate(), 0, 0, 0, 0)
  return inizio
}

export function pavimentoAgenda(): number {
  return pavimento
}

/** La home mostra prima gli ultimi giorni: il resto dell’anno arriva dopo, senza bloccare l’ingresso. */
export function pavimentoVistaRapida(adesso = new Date()): number {
  return new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate() - GIORNI_VISTA_RAPIDA, 0, 0, 0, 0).getTime()
}

export function allargaAgenda(giorno: Date): void {
  const candidato = new Date(giorno.getFullYear(), giorno.getMonth(), giorno.getDate(), 0, 0, 0, 0).getTime()
  if (candidato >= pavimento) return
  pavimento = candidato
  for (const ascolta of ascoltatori) ascolta()
}

export function ripristinaFinestraAgenda(adesso = new Date()): void {
  pavimento = inizioFinestraAgenda(adesso).getTime()
}

export function onFinestraAgenda(ascolta: () => void): () => void {
  ascoltatori.add(ascolta)
  return () => { ascoltatori.delete(ascolta) }
}

export function agendaInAttesa(firebase: boolean, agendaPronta: boolean): boolean {
  return firebase && !agendaPronta
}

export function testoAgendaVuota(inAttesa: boolean): string {
  return inAttesa ? "Carico l'agenda…" : 'Nessun appuntamento'
}

export function mostraIncassoZero(inAttesa: boolean, importo: number): boolean {
  return inAttesa && importo === 0
}
