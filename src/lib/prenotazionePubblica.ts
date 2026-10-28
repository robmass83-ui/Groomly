export type MancaPrenotazione = 'piano' | 'profilo' | 'fiscale' | 'servizi'

export function puoAccenderePrenotazioni(input: {
  accesso: boolean
  completo: boolean
  vat: string
  tax: string
  listinoConfermato: boolean
  haPrincipale: boolean
}): { ok: true } | { ok: false; manca: MancaPrenotazione } {
  if (!input.accesso) return { ok: false, manca: 'piano' }
  if (!input.completo) return { ok: false, manca: 'profilo' }
  if (input.vat.trim() === '' && input.tax.trim() === '') return { ok: false, manca: 'fiscale' }
  if (!input.listinoConfermato || !input.haPrincipale) return { ok: false, manca: 'servizi' }
  return { ok: true }
}

export function linkPrenotazione(slug: string): string {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return ''
  return `https://groomlyapp.it/s/${slug}`
}

export function prenotazioneAccesa(input: { prenotazioniOnline: boolean; accesso: boolean }): boolean {
  return input.prenotazioniOnline === true && input.accesso === true
}

export const SPECIE_PRENOTABILI = ['cane', 'gatto', 'altro'] as const
export type SpeciePrenotabile = (typeof SPECIE_PRENOTABILI)[number]

/** Senza una scelta esplicita il salone accetta cane, gatto e altro. */
export function specieAccettate(valore: unknown): SpeciePrenotabile[] {
  if (!Array.isArray(valore)) return [...SPECIE_PRENOTABILI]
  const scelte = SPECIE_PRENOTABILI.filter((id) => valore.includes(id))
  return scelte.length > 0 ? [...scelte] : [...SPECIE_PRENOTABILI]
}
