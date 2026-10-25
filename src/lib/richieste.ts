const BLOCCO_MS = 48 * 60 * 60 * 1000

export function accettaRichiesta(richiesta: { id: string; status: string; dogId: string; inizio: Date }): {
  stato: 'accettata'
  appuntamento: { status: 'programmato'; dogId: string; start: Date; richiestaId: string }
} | null {
  if (richiesta.status !== 'nuova' || richiesta.dogId === '') return null
  return {
    stato: 'accettata',
    appuntamento: { status: 'programmato', dogId: richiesta.dogId, start: richiesta.inizio, richiestaId: richiesta.id },
  }
}

export function fineBlocco(creataIl: Date): Date {
  return new Date(creataIl.getTime() + BLOCCO_MS)
}

export function canePerTelefono(cani: readonly { id: string; phone: string }[], phone: string): string | null {
  const cifre = phone.replace(/\D/g, '')
  if (cifre === '') return null
  return cani.find((cane) => cane.phone.replace(/\D/g, '') === cifre)?.id ?? null
}

export function righeBiglietto(nome: string, url: string): { formato: 'a5'; righe: [string, string] } {
  return { formato: 'a5', righe: [nome, url] }
}
