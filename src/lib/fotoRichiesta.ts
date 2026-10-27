const PREFISSI = ['data:image/jpeg;base64,', 'data:image/png;base64,', 'data:image/webp;base64,'] as const

export const FOTO_MAX = 3
export const FOTO_MAX_CHARS = 160_000
export const FOTO_MAX_BYTE = 120_000

export function razzaRichiesta(valore: unknown): string | null {
  if (typeof valore !== 'string') return null
  const razza = valore.trim().replace(/\s+/g, ' ')
  if (razza.length < 2 || razza.length > 80) return null
  if (/[\u0000-\u001f]/.test(razza)) return null
  return razza
}

export function fotoRichiesta(valore: unknown): string[] | null {
  if (valore == null) return []
  if (!Array.isArray(valore) || valore.length > FOTO_MAX) return null
  const foto: string[] = []
  for (const item of valore) {
    if (typeof item !== 'string' || item.length > FOTO_MAX_CHARS) return null
    const prefisso = PREFISSI.find((candidato) => item.startsWith(candidato))
    if (!prefisso) return null
    const corpo = item.slice(prefisso.length)
    if (corpo.length < 40 || corpo.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(corpo)) return null
    const padding = corpo.endsWith('==') ? 2 : corpo.endsWith('=') ? 1 : 0
    const byte = (corpo.length * 3) / 4 - padding
    if (byte < 24 || byte > FOTO_MAX_BYTE) return null
    foto.push(item)
  }
  return foto
}
