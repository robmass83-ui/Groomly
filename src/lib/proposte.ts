const SETTE_GIORNI_MS = 7 * 24 * 60 * 60 * 1000

export function puoProporre(ultima: Date | null, adesso: Date): boolean {
  if (!ultima) return true
  return adesso.getTime() - ultima.getTime() >= SETTE_GIORNI_MS
}

export function dopoChiusura(chiusa: Date): Date {
  return chiusa
}
