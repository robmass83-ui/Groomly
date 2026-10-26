const CHIAVE = 'groomly.primoDatoMs'

let apertura: number | null = null
let scritto = false

export function segnaApertura(adesso: number): number {
  if (apertura === null) apertura = adesso
  return apertura
}

export function segnaPrimoDato(adesso: number): number | null {
  if (scritto || apertura === null) return null
  scritto = true
  const ms = Math.max(0, Math.round(adesso - apertura))
  try {
    localStorage.setItem(CHIAVE, String(ms))
  } catch {
    // la misura è solo locale
  }
  return ms
}

export function leggiPrimoDato(): number | null {
  try {
    const raw = localStorage.getItem(CHIAVE)
    if (!raw) return null
    const ms = Number(raw)
    return Number.isFinite(ms) ? ms : null
  } catch {
    return null
  }
}

export function azzeraPrimoDato(): void {
  apertura = null
  scritto = false
  try {
    localStorage.removeItem(CHIAVE)
  } catch {
    // niente da togliere
  }
}
