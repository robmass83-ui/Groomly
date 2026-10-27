export type ChiaveServizioEmail = 'promemoria' | 'pronto' | 'auguri' | 'recensione' | 'attesa' | 'fedelta'
export type ModoServizio = 'spento' | 'manuale' | 'automatico'
export interface SceltaServizio {
  modo: ModoServizio
  anticipoGiorni?: 1 | 2 | 3
  ora?: string
}

export function sceltaIniziale(chiave: ChiaveServizioEmail): SceltaServizio {
  if (chiave === 'promemoria') return { modo: 'manuale', anticipoGiorni: 1, ora: '18:00' }
  if (chiave === 'auguri') return { modo: 'manuale', ora: '09:00' }
  if (chiave === 'fedelta') return { modo: 'manuale' }
  return { modo: 'manuale' }
}

export function puoCambiareModo(ruolo: string): boolean {
  return ruolo === 'titolare' || ruolo === 'socio'
}

export function servizioEmailAcceso(modo: ModoServizio): boolean {
  return modo === 'manuale' || modo === 'automatico'
}
