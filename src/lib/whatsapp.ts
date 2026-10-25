export function normalizzaTelefono(raw: string): string | null {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.length === 10 && digits.startsWith('3')) digits = `39${digits}`
  if (digits.length === 12 && digits.startsWith('39') && digits[2] === '3') return digits
  return null
}

export function renderTemplate(testo: string, valori: Record<string, string>): string {
  return testo.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => valori[key] ?? '')
}

export function urlWhatsApp(numero: string, testo: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(testo)}`
}
