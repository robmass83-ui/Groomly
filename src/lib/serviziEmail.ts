export type ChiaveServizioEmail = 'promemoria' | 'pronto' | 'auguri' | 'recensione' | 'attesa' | 'fedelta'
export type ModoServizio = 'spento' | 'manuale' | 'automatico'
export interface SceltaServizio {
  modo: ModoServizio
  anticipoGiorni?: 1 | 2 | 3
  ora?: string
}

export function soloAutomatico(chiave: ChiaveServizioEmail): boolean {
  return chiave === 'promemoria' || chiave === 'auguri'
}

export function sceltaIniziale(chiave: ChiaveServizioEmail): SceltaServizio {
  if (chiave === 'promemoria') return { modo: 'automatico', anticipoGiorni: 1, ora: '18:00' }
  if (chiave === 'auguri') return { modo: 'automatico', ora: '09:00' }
  if (chiave === 'fedelta') return { modo: 'manuale' }
  return { modo: 'manuale' }
}

export function sceltaOperativa(chiave: ChiaveServizioEmail, scelta: SceltaServizio): SceltaServizio {
  if (soloAutomatico(chiave) && scelta.modo === 'manuale') {
    return { ...sceltaIniziale(chiave), ...scelta, modo: 'automatico' }
  }
  return scelta
}

export function normalizzaServiziEmail(
  value: Partial<Record<ChiaveServizioEmail, SceltaServizio>> | undefined,
): Partial<Record<ChiaveServizioEmail, SceltaServizio>> | undefined {
  if (!value) return undefined
  let next: Partial<Record<ChiaveServizioEmail, SceltaServizio>> | null = null
  for (const chiave of ['promemoria', 'auguri'] as const) {
    const scelta = value[chiave]
    if (!scelta || scelta.modo !== 'manuale') continue
    next = next ?? { ...value }
    next[chiave] = sceltaOperativa(chiave, scelta)
  }
  return next ?? value
}

export function puoCambiareModo(ruolo: string): boolean {
  return ruolo === 'titolare' || ruolo === 'socio'
}

export function servizioEmailAcceso(modo: ModoServizio): boolean {
  return modo === 'manuale' || modo === 'automatico'
}
