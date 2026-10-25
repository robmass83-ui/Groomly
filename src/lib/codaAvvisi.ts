import { normalizzaTelefono } from './whatsapp'

export type CandidatoAvviso = {
  id: string
  start: Date
  status: string
  dogId: string
}

export function chiaveAvviso(id: string, giorno: Date): string {
  const mese = String(giorno.getMonth() + 1).padStart(2, '0')
  const data = String(giorno.getDate()).padStart(2, '0')
  return `${id}:${giorno.getFullYear()}-${mese}-${data}`
}

export function codaDomani(
  appuntamenti: readonly CandidatoAvviso[],
  telefoni: Readonly<Record<string, string>>,
  adesso: Date,
  inviati: Readonly<Record<string, boolean>>,
): { id: string; telefono: string; chiave: string }[] {
  const inizio = new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate() + 1)
  const fine = new Date(inizio.getFullYear(), inizio.getMonth(), inizio.getDate() + 1)
  return appuntamenti.flatMap((item) => {
    if (item.status !== 'programmato' || item.start < inizio || item.start >= fine) return []
    const telefono = normalizzaTelefono(telefoni[item.dogId] ?? '')
    if (!telefono) return []
    const chiave = chiaveAvviso(item.id, inizio)
    if (inviati[chiave] === true) return []
    return [{ id: item.id, telefono, chiave }]
  })
}

export function segnaInviato(inviati: Readonly<Record<string, boolean>>, chiave: string): Record<string, boolean> {
  return { ...inviati, [chiave]: true }
}
