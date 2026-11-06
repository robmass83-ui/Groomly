import type { CategoriaProdotto, ConsumoPerTaglia, UnitaProdotto } from './prodotti'

interface VoceCatalogo<F extends string = string> {
  frase: F
  categoria: CategoriaProdotto
  quantita: number | null
  unita: UnitaProdotto
  diluizione: number | null
  mlPerCane: ConsumoPerTaglia | null
}

const SHAMPOO_CONCENTRATO: ConsumoPerTaglia = { piccola: 15, media: 30, grande: 50 }
const BALSAMO_CONCENTRATO: ConsumoPerTaglia = { piccola: 10, media: 20, grande: 35 }
const PROFUMO: ConsumoPerTaglia = { piccola: 2, media: 3, grande: 5 }
const SPRAY_DISTRICANTE: ConsumoPerTaglia = { piccola: 5, media: 10, grande: 20 }

function voce<F extends string>(frase: F, categoria: CategoriaProdotto, quantita: number | null, unita: UnitaProdotto = 'l', diluizione: number | null = null, mlPerCane: ConsumoPerTaglia | null = null): VoceCatalogo<F> {
  return { frase, categoria, quantita, unita, diluizione, mlPerCane }
}

export const CATALOGO_PRODOTTI = [
  voce('catShNeutro', 'lavaggio', 5, 'l', 10, SHAMPOO_CONCENTRATO),
  voce('catShSgrassante', 'lavaggio', 5, 'l', 10, SHAMPOO_CONCENTRATO),
  voce('catShBianco', 'lavaggio', 5, 'l', 10, SHAMPOO_CONCENTRATO),
  voce('catShScuro', 'lavaggio', 5, 'l', 10, SHAMPOO_CONCENTRATO),
  voce('catShVolume', 'lavaggio', 5),
  voce('catShLungoIdra', 'lavaggio', 5),
  voce('catShSensibile', 'lavaggio', 1),
  voce('catShCuccioli', 'lavaggio', 1),
  voce('catShParassiti', 'lavaggio', 1),
  voce('catShMuta', 'lavaggio', 5),
  voce('catShOdore', 'lavaggio', 5),
  voce('catShSecco', 'lavaggio', 250, 'ml'),
  voce('catBaDistricante', 'lavaggio', 5, 'l', 10, BALSAMO_CONCENTRATO),
  voce('catBaNutriente', 'lavaggio', 1),
  voce('catBaBianco', 'lavaggio', 1),
  voce('catPrProfumo', 'finitura', 250, 'ml', null, PROFUMO),
  voce('catSpNodi', 'finitura', 500, 'ml', null, SPRAY_DISTRICANTE),
  voce('catSpLucidante', 'finitura', 500, 'ml'),
  voce('catSpStatico', 'finitura', 500, 'ml'),
  voce('catBaSpray', 'finitura', 500, 'ml'),
  voce('catCuOrecchie', 'cura', 250, 'ml'),
  voce('catCuPolvere', 'cura', null),
  voce('catCuOcchi', 'cura', 250, 'ml'),
  voce('catCuEmostatico', 'cura', null),
  voce('catCuDenti', 'cura', null),
  voce('catCuCotone', 'cura', null),
  voce('catCuGarze', 'cura', null),
  voce('catCuSalviette', 'cura', null),
  voce('catAlOlio', 'macchinette', 250, 'ml'),
  voce('catAlRefrigerante', 'macchinette', 500, 'ml'),
  voce('catAlLame', 'macchinette', null),
  voce('catMaNastri', 'macchinette', null),
  voce('catCuDisinfettante', 'pulizia', 1),
  voce('catAlVasca', 'pulizia', 5),
  voce('catAlGuanti', 'pulizia', null),
  voce('catPuCarta', 'pulizia', null),
  voce('catPuSacchi', 'pulizia', null),
  voce('catPuDetersivo', 'pulizia', null),
  voce('catToFiocchetti', 'tocchi', null),
  voce('catToBandane', 'tocchi', null),
  voce('catToBiscotti', 'tocchi', null),
] as const

export type VoceProdotto = (typeof CATALOGO_PRODOTTI)[number]

export const KIT_BASE: readonly VoceProdotto['frase'][] = [
  'catShNeutro', 'catShSgrassante', 'catShBianco', 'catBaDistricante', 'catPrProfumo', 'catSpNodi', 'catCuOrecchie', 'catCuOcchi',
  'catCuEmostatico', 'catCuCotone', 'catAlOlio', 'catCuDisinfettante', 'catAlGuanti', 'catPuCarta',
]

/** I nomi con cui il vecchio catalogo salvava queste voci, nelle 5 lingue: restano così anche se la frase cambia. */
export const NOMI_VECCHI: Partial<Record<CategoriaProdotto, readonly string[]>> = {
  pulizia: ['Disinfettante per attrezzi', 'Tool disinfectant', 'Desinfectante para utensilios', 'Désinfectant pour outils', 'Werkzeugdesinfektion'],
  macchinette: [
    'Lame per tosatrice', 'Clipper blades', 'Cuchillas para esquiladora', 'Lames de tondeuse', 'Scherköpfe',
    'Olio per tosatrice', 'Clipper oil', 'Aceite para esquiladora', 'Huile pour tondeuse', 'Schermaschinenöl',
    'Spray refrigerante lame', 'Blade cooling spray', 'Spray refrigerante para cuchillas', 'Spray refroidissant pour lames', 'Kühlspray für Scherköpfe',
  ],
}
