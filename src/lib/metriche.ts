export type EventoMetrica = { nome: 'paywall_aperta'; feature: string; fonte: string }

export function registra(consenso: boolean, evento: EventoMetrica, sink: (evento: EventoMetrica) => void): void {
  if (!consenso) return
  sink(evento)
}
