export type MancaPrenotazione = 'piano' | 'profilo' | 'fiscale'

export function puoAccenderePrenotazioni(input: {
  accesso: boolean
  completo: boolean
  vat: string
  tax: string
}): { ok: true } | { ok: false; manca: MancaPrenotazione } {
  if (!input.accesso) return { ok: false, manca: 'piano' }
  if (!input.completo) return { ok: false, manca: 'profilo' }
  if (input.vat.trim() === '' && input.tax.trim() === '') return { ok: false, manca: 'fiscale' }
  return { ok: true }
}

export function linkPrenotazione(slug: string): string {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return ''
  return `https://groomlyapp.it/s/${slug}`
}

export function prenotazioneAccesa(input: { prenotazioniOnline: boolean; accesso: boolean }): boolean {
  return input.prenotazioniOnline === true && input.accesso === true
}
