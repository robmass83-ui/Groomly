import type { CategoriaProdotto, UnitaProdotto } from './prodotti'

interface VoceCatalogo<F extends string = string> {
  frase: F
  categoria: CategoriaProdotto
  quantita: number | null
  unita: UnitaProdotto
}

function voce<F extends string>(frase: F, categoria: CategoriaProdotto, quantita: number | null, unita: UnitaProdotto = 'l'): VoceCatalogo<F> {
  return { frase, categoria, quantita, unita }
}

export const CATALOGO_PRODOTTI = [
  voce('catShNeutro', 'shampoo', 5),
  voce('catShBianco', 'shampoo', 5),
  voce('catShNero', 'shampoo', 5),
  voce('catShRosso', 'shampoo', 5),
  voce('catShLungo', 'shampoo', 5),
  voce('catShDuro', 'shampoo', 5),
  voce('catShVolume', 'shampoo', 5),
  voce('catShIdratante', 'shampoo', 5),
  voce('catShSensibile', 'shampoo', 5),
  voce('catShCuccioli', 'shampoo', 1),
  voce('catShParassiti', 'shampoo', 1),
  voce('catShOdore', 'shampoo', 5),
  voce('catShSgrassante', 'shampoo', 5),
  voce('catShSecco', 'shampoo', 250, 'ml'),
  voce('catBaDistricante', 'balsami', 5),
  voce('catBaIdratante', 'balsami', 5),
  voce('catBaLungo', 'balsami', 5),
  voce('catBaBianco', 'balsami', 1),
  voce('catBaSpray', 'balsami', 500, 'ml'),
  voce('catMaNutriente', 'balsami', 1),
  voce('catMaRistrutturante', 'balsami', 1),
  voce('catBaOlio', 'balsami', 250, 'ml'),
  voce('catPrTalco', 'profumi', 250, 'ml'),
  voce('catPrFiorito', 'profumi', 250, 'ml'),
  voce('catPrAgrumi', 'profumi', 250, 'ml'),
  voce('catPrFresco', 'profumi', 250, 'ml'),
  voce('catPrCuccioli', 'profumi', 250, 'ml'),
  voce('catSpNodi', 'profumi', 500, 'ml'),
  voce('catSpLucidante', 'profumi', 500, 'ml'),
  voce('catSpStatico', 'profumi', 500, 'ml'),
  voce('catSpOdore', 'profumi', 500, 'ml'),
  voce('catCuOrecchie', 'cura', 250, 'ml'),
  voce('catCuPolvere', 'cura', null),
  voce('catCuOcchi', 'cura', 250, 'ml'),
  voce('catCuZampe', 'cura', 250, 'ml'),
  voce('catCuEmostatico', 'cura', null),
  voce('catCuDenti', 'cura', 250, 'ml'),
  voce('catCuSalviette', 'cura', null),
  voce('catCuDisinfettante', 'cura', 1),
  voce('catAlLame', 'altro', null),
  voce('catAlOlio', 'altro', 250, 'ml'),
  voce('catAlRefrigerante', 'altro', 500, 'ml'),
  voce('catAlAsciugamani', 'altro', null),
  voce('catAlVasca', 'altro', 5),
  voce('catAlGuanti', 'altro', null),
] as const

export type VoceProdotto = (typeof CATALOGO_PRODOTTI)[number]

export const KIT_BASE: readonly VoceProdotto['frase'][] = [
  'catShNeutro', 'catShBianco', 'catShNero', 'catBaDistricante', 'catPrTalco', 'catSpNodi', 'catCuOrecchie', 'catCuOcchi',
]
