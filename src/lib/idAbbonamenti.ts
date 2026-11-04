// ID fissi degli abbonamenti, gli stessi di docs/legal/PRIMA-DEI-PAGAMENTI.md. Non cambiarli dopo aver creato i prodotti in Play Console.
export const PRODOTTI_PLAY = {
  plus: 'groomly_plus',
  salone: 'groomly_salone',
  postoExtra: 'groomly_posto_extra',
} as const

export const PIANI_BASE = { mensile: 'mensile', annuale: 'annuale' } as const

// Offerta Play con idoneità decisa dallo sviluppatore, su ogni piano base.
export const OFFERTA_EARLY_ADOPTER = 'early-adopter'

export const ENTITLEMENT = { pro: 'plus', salone: 'salone' } as const

export const OFFERING_ID = 'groomly_standard'

// Pacchetti dell'offering (ID unici nell'offering): pacchetto → prodotto RevenueCat.
export const PACCHETTI = {
  plus_mensile: 'groomly_plus:mensile',
  plus_annuale: 'groomly_plus:annuale',
  salone_mensile: 'groomly_salone:mensile',
  salone_annuale: 'groomly_salone:annuale',
  posto_extra_mensile: 'groomly_posto_extra:mensile',
  posto_extra_annuale: 'groomly_posto_extra:annuale',
} as const

export type ProdottoPlay = typeof PRODOTTI_PLAY[keyof typeof PRODOTTI_PLAY]
export type PianoBase = typeof PIANI_BASE[keyof typeof PIANI_BASE]

// RevenueCat chiama i prodotti Play «abbonamento:piano base».
export function idProdottoRevenueCat(prodotto: ProdottoPlay, pianoBase: PianoBase): string {
  return `${prodotto}:${pianoBase}`
}
