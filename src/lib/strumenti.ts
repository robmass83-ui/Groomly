export type ChiaveStrumento = 'messaggi' | 'affidabilita'

export function strumentoAcceso(
  settings: { strumenti?: Partial<Record<ChiaveStrumento, boolean>> } | null | undefined,
  chiave: ChiaveStrumento,
): boolean {
  if (chiave === 'messaggi') return settings?.strumenti?.messaggi !== false
  return settings?.strumenti?.[chiave] === true
}
