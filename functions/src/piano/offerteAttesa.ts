import { idOfferta, oraAncoraDavanti, type BucoAttesa, type IscrittoAttesa } from '../../../src/lib/listaAttesa'

export function offerteDaCreare(input: {
  buchi: readonly BucoAttesa[]
  iscritti: readonly IscrittoAttesa[]
  esistenti: readonly { id: string }[]
  adesso: Date
}): { id: string, appointmentId: string, iscrittoId: string, inizio: string }[] {
  const esistentiIds = new Set(input.esistenti.map((e) => e.id))
  const out: { id: string, appointmentId: string, iscrittoId: string, inizio: string }[] = []

  for (const buco of input.buchi) {
    if (!oraAncoraDavanti(buco.inizio, input.adesso)) continue
    for (const iscritto of input.iscritti) {
      const id = idOfferta(buco.appointmentId, iscritto.id)
      if (esistentiIds.has(id)) continue
      out.push({
        id,
        appointmentId: buco.appointmentId,
        iscrittoId: iscritto.id,
        inizio: buco.inizio.toISOString(),
      })
    }
  }

  return out
}
