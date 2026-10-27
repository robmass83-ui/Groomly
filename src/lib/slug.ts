export function slugDaNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const MESSAGGIO_SLUG_PRESO = 'Nome già preso'

export function slugLibero(occupatoDa: string | null, salonId: string): { ok: true } | { ok: false; message: typeof MESSAGGIO_SLUG_PRESO } {
  if (occupatoDa && occupatoDa !== salonId) return { ok: false, message: MESSAGGIO_SLUG_PRESO }
  return { ok: true }
}

export function profiloPubblico(input: {
  nome: string
  telefono?: string
  indirizzo?: string
  vat?: string
  tax?: string
  mostraDatiFiscali?: boolean
}): { nome: string; telefono?: string; indirizzo?: string; vat?: string; tax?: string } {
  const profilo: { nome: string; telefono?: string; indirizzo?: string; vat?: string; tax?: string } = { nome: input.nome }
  if (input.telefono) profilo.telefono = input.telefono
  if (input.indirizzo) profilo.indirizzo = input.indirizzo
  if (input.mostraDatiFiscali === true) {
    if (input.vat) profilo.vat = input.vat
    if (input.tax) profilo.tax = input.tax
  }
  return profilo
}

export function htmlSalone(profilo: { nome: string }): string {
  const nome = profilo.nome.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char)
  return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><meta property="og:title" content="${nome}"><title>${nome}</title></head><body><h1>${nome}</h1></body></html>`
}
