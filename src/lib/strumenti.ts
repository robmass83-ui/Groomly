export type ChiaveStrumento = 'messaggi' | 'affidabilita' | 'noteVocali'

export function strumentoAcceso(
  settings: { strumenti?: Partial<Record<ChiaveStrumento, boolean>> } | null | undefined,
  chiave: ChiaveStrumento,
): boolean {
  return settings?.strumenti?.[chiave] === true
}
