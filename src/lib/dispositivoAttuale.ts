export function etichettaDispositivo(agente: string): string {
  const samsung = /SM-[A-Z0-9]+/i.exec(agente)
  if (samsung) return samsung[0].toUpperCase()
  if (/iPhone/.test(agente)) return 'iPhone'
  if (/iPad/.test(agente)) return 'iPad'
  if (/Android/.test(agente)) return 'Android'
  if (/Windows/.test(agente)) return 'Windows'
  if (/Macintosh/.test(agente)) return 'Mac'
  return 'Questo dispositivo'
}
