import type { Controllo } from '../../lib/accensione'

// Callable operatore degli abbonamenti (fase 4). Le usa il PannelloAccensione e, per l'annuncio, la scheda Piani dell'Admin Manager.
async function chiama(nome: string, dati: Record<string, unknown> = {}): Promise<unknown> {
  const { callCallableData } = await import('./client')
  return callCallableData(nome, dati)
}

export async function controlloAccensione(): Promise<Controllo> {
  const dati = await chiama('controlloAccensione')
  if (!dati || typeof dati !== 'object' || !Array.isArray((dati as Controllo).voci)) throw new Error('Risposta non valida')
  return dati as Controllo
}

export async function confermaPartitaIva(valore: boolean): Promise<void> {
  await chiama('confermaPartitaIva', { valore })
}

export async function accendiAbbonamenti(parola: string): Promise<void> {
  await chiama('accendiAbbonamenti', { parola })
}

export async function spegniAbbonamenti(): Promise<void> {
  await chiama('spegniAbbonamenti')
}

// `data`: ISO della partenza dei pagamenti, almeno 15 giorni dopo oggi.
export async function annunciaPagamenti(data: string): Promise<{ email: number }> {
  const risposta = await chiama('annunciaPagamenti', { data }) as { email?: unknown } | null
  return { email: typeof risposta?.email === 'number' ? risposta.email : 0 }
}
