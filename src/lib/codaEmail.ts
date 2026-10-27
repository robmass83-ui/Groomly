export type TipoCoda = 'promemoria' | 'pronto' | 'auguri' | 'recensione' | 'attesa'
export type StatoCoda = 'in_coda' | 'fermata' | 'inviata' | 'non_inviata' | 'chiusa'

export interface RigaCoda {
  id: string
  tipo: TipoCoda
  dogId: string
  appointmentId: string | null
  evento: string
  parteIl: string | null
  stato: StatoCoda
  motivo: string
  email: string
  nomeCane: string
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function emailValida(email: string): boolean {
  return EMAIL.test(email.trim())
}

export function eventoDi(
  tipo: TipoCoda,
  dati: { appointmentId?: string; giorno?: string; dogId?: string; anno?: number },
): string {
  switch (tipo) {
    case 'promemoria':
      return `promemoria:${dati.appointmentId}:${dati.giorno}`
    case 'pronto':
      return `pronto:${dati.appointmentId}`
    case 'auguri':
      return `auguri:${dati.dogId}:${dati.anno}`
    case 'attesa':
      return `attesa:${dati.appointmentId}:${dati.dogId}`
    case 'recensione':
      return `recensione:${dati.appointmentId}`
  }
}

function stessoEventoBloccato(stato: StatoCoda): boolean {
  return stato === 'fermata' || stato === 'inviata' || stato === 'chiusa'
}

export function rigaAmmessa(bloccata: boolean, riga: RigaCoda): boolean {
  return !bloccata && typeof riga.evento === 'string'
}

export function unisciRiga(righe: readonly RigaCoda[], riga: RigaCoda, bloccata = false): RigaCoda[] {
  const indice = righe.findIndex((esistente) => esistente.evento === riga.evento)
  if (indice < 0) {
    if (!rigaAmmessa(bloccata, riga)) return [...righe]
    return [...righe, riga]
  }
  const esistente = righe[indice]
  if (stessoEventoBloccato(esistente.stato)) return [...righe]
  if (esistente.stato === 'in_coda') {
    const aggiornata: RigaCoda = {
      ...riga,
      id: esistente.id,
      parteIl: esistente.parteIl ?? riga.parteIl,
    }
    return righe.map((voce, i) => (i === indice ? aggiornata : voce))
  }
  return righe.map((voce, i) => (i === indice ? riga : voce))
}

export function fermaRiga(riga: RigaCoda): RigaCoda {
  return { ...riga, stato: 'fermata', motivo: 'fermata' }
}

export function dovute(righe: readonly RigaCoda[], adesso: Date): RigaCoda[] {
  const limite = adesso.getTime()
  return righe.filter((riga) => {
    if (riga.stato !== 'in_coda' || riga.parteIl === null) return false
    return new Date(riga.parteIl).getTime() <= limite
  })
}

function giornoRoma(istante: Date): string {
  const parti = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(istante)
  const valore = (tipo: Intl.DateTimeFormatPartTypes) => parti.find((parte) => parte.type === tipo)?.value ?? ''
  return `${valore('year')}-${valore('month')}-${valore('day')}`
}

export function visibiliInHome(righe: readonly RigaCoda[], adesso: Date): RigaCoda[] {
  const oggi = giornoRoma(adesso)
  return righe.filter((riga) => {
    if (riga.stato === 'chiusa') return false
    if (riga.parteIl === null) return riga.stato === 'in_coda' || riga.stato === 'non_inviata'
    return giornoRoma(new Date(riga.parteIl)) === oggi
  })
}

export function bloccaCane(righe: readonly RigaCoda[], dogId: string): RigaCoda[] {
  return righe.map((riga) =>
    riga.dogId === dogId && riga.stato === 'in_coda' ? { ...riga, stato: 'fermata', motivo: 'fermata' } : riga,
  )
}
