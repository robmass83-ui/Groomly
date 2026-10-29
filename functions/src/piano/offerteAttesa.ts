import { idOfferta, inizioDaDoc, oraAncoraDavanti, type BucoAttesa, type IscrittoAttesa } from '../../../src/lib/listaAttesa'

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

/** I segni lasciati da una visita cancellata o spostata, letti come buchi in più. */
export function buchiDaTombe(tombe: readonly { id: string, data: Record<string, unknown> }[], adesso: Date): BucoAttesa[] {
  const out: BucoAttesa[] = []
  for (const tomba of tombe) {
    const inizio = inizioDaDoc(tomba.data.inizio)
    if (!inizio || !oraAncoraDavanti(inizio, adesso)) continue
    const appointmentId = typeof tomba.data.appointmentId === 'string' && tomba.data.appointmentId !== ''
      ? tomba.data.appointmentId
      : tomba.id
    out.push({
      appointmentId,
      inizio,
      nomeCaneDisdetto: typeof tomba.data.nomeCane === 'string' ? tomba.data.nomeCane : '',
    })
  }
  return out
}

/**
 * Un segno si toglie quando l'ora è passata, o quando ogni offerta della visita è già partita.
 * Se resta un'offerta da spedire (tetto, email non valida) il segno resta, così il buco non si perde.
 */
export function tombeDaTogliere(input: {
  tombe: readonly { id: string, data: Record<string, unknown> }[]
  offerte: readonly { appointmentId: string, inviataIl: string | null }[]
  adesso: Date
}): string[] {
  const togliere: string[] = []
  for (const tomba of input.tombe) {
    const inizio = inizioDaDoc(tomba.data.inizio)
    const appointmentId = typeof tomba.data.appointmentId === 'string' && tomba.data.appointmentId !== ''
      ? tomba.data.appointmentId
      : tomba.id
    if (!inizio || !oraAncoraDavanti(inizio, input.adesso)) {
      togliere.push(tomba.id)
      continue
    }
    const sue = input.offerte.filter((offerta) => offerta.appointmentId === appointmentId)
    if (sue.length > 0 && sue.every((offerta) => typeof offerta.inviataIl === 'string' && offerta.inviataIl !== '')) {
      togliere.push(tomba.id)
    }
  }
  return togliere
}
