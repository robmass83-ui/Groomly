export type ChiaveStrumento = 'messaggi' | 'affidabilita' | 'noteVocali'

export interface NotaVocaleSalvata {
  id: string
  dataUrl: string
  createdAt: string
}

export function aggiungiNotaVocale(
  note: readonly NotaVocaleSalvata[] | undefined,
  dataUrl: string,
  adesso: Date,
  id: string,
): NotaVocaleSalvata[] {
  return [...(note ?? []), { id, dataUrl, createdAt: adesso.toISOString() }]
}

export function strumentoAcceso(
  settings: { strumenti?: Partial<Record<ChiaveStrumento, boolean>> } | null | undefined,
  chiave: ChiaveStrumento,
): boolean {
  if (chiave === 'messaggi') return settings?.strumenti?.messaggi !== false
  return settings?.strumenti?.[chiave] === true
}
