import type { Lingua } from './lingua'
import { nomeServizioVisibile } from './servizioVisibile'

const TESTI = {
  it: {
    tagliaPiccola: 'Taglia piccola',
    tagliaMedia: 'Taglia media',
    tagliaGrande: 'Taglia grande',
    segue: 'LISTINO · segue',
    bagno: 'BAGNO + TOSATURA',
    da: 'da ',
    titolo: 'Listino',
    prezzi: 'Listino prezzi',
    tipo: 'Tipo ',
    extra: 'SERVIZI EXTRA',
    daPartire: 'a partire da ',
    valutazione: 'su valutazione',
  },
  en: {
    tagliaPiccola: 'Small size',
    tagliaMedia: 'Medium size',
    tagliaGrande: 'Large size',
    segue: 'PRICE LIST · continued',
    bagno: 'BATH AND TRIM',
    da: 'from ',
    titolo: 'Price list',
    prezzi: 'Price list',
    tipo: 'Type ',
    extra: 'EXTRA SERVICES',
    daPartire: 'from ',
    valutazione: 'on assessment',
  },
  es: {
    tagliaPiccola: 'Talla pequeña',
    tagliaMedia: 'Talla mediana',
    tagliaGrande: 'Talla grande',
    segue: 'LISTA · sigue',
    bagno: 'BAÑO Y CORTE',
    da: 'desde ',
    titolo: 'Lista de precios',
    prezzi: 'Lista de precios',
    tipo: 'Tipo ',
    extra: 'SERVICIOS EXTRA',
    daPartire: 'desde ',
    valutazione: 'bajo valoración',
  },
  // LINGUE: da tradurre
  fr: {
    tagliaPiccola: 'Small size',
    tagliaMedia: 'Medium size',
    tagliaGrande: 'Large size',
    segue: 'PRICE LIST · continued',
    bagno: 'BATH AND TRIM',
    da: 'from ',
    titolo: 'Price list',
    prezzi: 'Price list',
    tipo: 'Type ',
    extra: 'EXTRA SERVICES',
    daPartire: 'from ',
    valutazione: 'on assessment',
  },
  de: {
    tagliaPiccola: 'Small size',
    tagliaMedia: 'Medium size',
    tagliaGrande: 'Large size',
    segue: 'PRICE LIST · continued',
    bagno: 'BATH AND TRIM',
    da: 'from ',
    titolo: 'Price list',
    prezzi: 'Price list',
    tipo: 'Type ',
    extra: 'EXTRA SERVICES',
    daPartire: 'from ',
    valutazione: 'on assessment',
  },
} as const

export function etichetteListino(lingua: Lingua) {
  return TESTI[lingua]
}

export function nomeVoceListino(lingua: Lingua, nome: string): string {
  const servizio = nomeServizioVisibile(lingua, nome)
  if (servizio !== nome || lingua === 'it') return servizio
  return VOCI[nome]?.[lingua] ?? nome
}

const VOCI: Record<string, Record<Exclude<Lingua, 'it'>, string>> = {
  'Taglia piccola': { en: 'Small size', es: 'Talla pequeña', fr: 'Small size', de: 'Small size' }, // LINGUE: da tradurre
  'Taglia media': { en: 'Medium size', es: 'Talla mediana', fr: 'Medium size', de: 'Medium size' }, // LINGUE: da tradurre
  'Taglia grande': { en: 'Large size', es: 'Talla grande', fr: 'Large size', de: 'Large size' }, // LINGUE: da tradurre
  'Taglia mini': { en: 'Mini size', es: 'Talla mini', fr: 'Mini size', de: 'Mini size' }, // LINGUE: da tradurre
  'Taglia piccola/media': { en: 'Small/medium size', es: 'Talla pequeña/mediana', fr: 'Small/medium size', de: 'Small/medium size' }, // LINGUE: da tradurre
  'Bagno + tosatura': { en: 'Bath and trim', es: 'Baño y corte', fr: 'Bath and trim', de: 'Bath and trim' }, // LINGUE: da tradurre
  '(indicativo)': { en: '(guide)', es: '(orientativo)', fr: '(guide)', de: '(guide)' }, // LINGUE: da tradurre
  'Servizi extra': { en: 'Extra services', es: 'Servicios extra', fr: 'Extra services', de: 'Extra services' }, // LINGUE: da tradurre
  'Taglio unghie': { en: 'Nail trim', es: 'Corte de uñas', fr: 'Nail trim', de: 'Nail trim' }, // LINGUE: da tradurre
  'Shampoo dermatologico e antiparassitario': { en: 'Medicated and flea shampoo', es: 'Champú dermatológico y antiparasitario', fr: 'Medicated and flea shampoo', de: 'Medicated and flea shampoo' }, // LINGUE: da tradurre
  'Nel servizio bagno sono compresi:': { en: 'The bath includes:', es: 'El baño incluye:', fr: 'The bath includes:', de: 'The bath includes:' }, // LINGUE: da tradurre
  'Pulizia orecchie': { en: 'Ear cleaning', es: 'Limpieza de orejas', fr: 'Ear cleaning', de: 'Ear cleaning' }, // LINGUE: da tradurre
  'Pulizia occhi': { en: 'Eye cleaning', es: 'Limpieza de ojos', fr: 'Eye cleaning', de: 'Eye cleaning' }, // LINGUE: da tradurre
  'Informazioni importanti': { en: 'Important information', es: 'Información importante', fr: 'Important information', de: 'Important information' }, // LINGUE: da tradurre
  'I prezzi indicati sono da considerarsi a partire da e possono aumentare in base a:': {
    en: 'The prices shown start from and can rise based on:',
    es: 'Los precios indicados parten de y pueden subir según:',
    // LINGUE: da tradurre
    fr: 'The prices shown start from and can rise based on:',
    de: 'The prices shown start from and can rise based on:',
  },
  'presenza di nodi o feltri': { en: 'mats or tangles', es: 'nudos o enredos', fr: 'mats or tangles', de: 'mats or tangles' }, // LINGUE: da tradurre
  'condizioni del mantello che richiede lavorazioni extra (muta)': { en: 'coat that needs extra work (shedding)', es: 'manto que pide trabajo extra (muda)', fr: 'coat that needs extra work (shedding)', de: 'coat that needs extra work (shedding)' }, // LINGUE: da tradurre
  'comportamento del cane (agitato, difficile da gestire)': { en: 'the dog’s behaviour (restless, hard to handle)', es: 'el comportamiento del perro (inquieto, difícil)', fr: 'the dog’s behaviour (restless, hard to handle)', de: 'the dog’s behaviour (restless, hard to handle)' }, // LINGUE: da tradurre
  'tempo necessario per completare il servizio': { en: 'time needed to finish the service', es: 'tiempo necesario para terminar el servicio', fr: 'time needed to finish the service', de: 'time needed to finish the service' }, // LINGUE: da tradurre
  'In questi casi verrà applicato un supplemento proporzionato al lavoro richiesto.': {
    en: 'In these cases a supplement is added in proportion to the work.',
    es: 'En estos casos se añade un suplemento proporcional al trabajo.',
    // LINGUE: da tradurre
    fr: 'In these cases a supplement is added in proportion to the work.',
    de: 'In these cases a supplement is added in proportion to the work.',
  },
  'Non si accettano cani infestati da pulci o zecche': { en: 'Dogs with fleas or ticks are not accepted', es: 'No se aceptan perros con pulgas o garrapatas', fr: 'Dogs with fleas or ticks are not accepted', de: 'Dogs with fleas or ticks are not accepted' }, // LINGUE: da tradurre
  'Per il benessere di tutti gli animali presenti in toelettatura:': {
    en: 'For the wellbeing of every animal in the salon:',
    es: 'Por el bienestar de todos los animales de la peluquería:',
    // LINGUE: da tradurre
    fr: 'For the wellbeing of every animal in the salon:',
    de: 'For the wellbeing of every animal in the salon:',
  },
  'non vengono accettati cani con infestazioni in corso di pulci o zecche': {
    en: 'dogs with an active flea or tick infestation are not accepted',
    es: 'no se aceptan perros con pulgas o garrapatas en curso',
    // LINGUE: da tradurre
    fr: 'dogs with an active flea or tick infestation are not accepted',
    de: 'dogs with an active flea or tick infestation are not accepted',
  },
  'è consigliato effettuare preventivamente un trattamento antiparassitario a casa': {
    en: 'a flea treatment at home beforehand is recommended',
    es: 'se aconseja un tratamiento antiparasitario en casa antes',
    // LINGUE: da tradurre
    fr: 'a flea treatment at home beforehand is recommended',
    de: 'a flea treatment at home beforehand is recommended',
  },
  'il servizio di toelettatura potrà essere eseguito successivamente': {
    en: 'the grooming can be done afterwards',
    es: 'el servicio de peluquería podrá hacerse después',
    // LINGUE: da tradurre
    fr: 'the grooming can be done afterwards',
    de: 'the grooming can be done afterwards',
  },
  'Grazie per la fiducia!': { en: 'Thank you for your trust!', es: '¡Gracias por la confianza!', fr: 'Thank you for your trust!', de: 'Thank you for your trust!' }, // LINGUE: da tradurre
  'Tosatura a partire da 55 €\nma su valutazione del tipo di cane, mantello e problematiche.': {
    en: 'Trim from €55\nbased on the dog, the coat and any problems.',
    es: 'Corte desde 55 €\nsegún el perro, el manto y los problemas.',
    // LINGUE: da tradurre
    fr: 'Trim from €55\nbased on the dog, the coat and any problems.',
    de: 'Trim from €55\nbased on the dog, the coat and any problems.',
  },
}
