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
} as const

export function etichetteListino(lingua: Lingua) {
  return TESTI[lingua]
}

export function nomeVoceListino(lingua: Lingua, nome: string): string {
  const servizio = nomeServizioVisibile(lingua, nome)
  if (servizio !== nome || lingua === 'it') return servizio
  return VOCI[nome]?.[lingua] ?? nome
}

const VOCI: Record<string, { en: string; es: string }> = {
  'Taglia piccola': { en: 'Small size', es: 'Talla pequeña' },
  'Taglia media': { en: 'Medium size', es: 'Talla mediana' },
  'Taglia grande': { en: 'Large size', es: 'Talla grande' },
  'Taglia mini': { en: 'Mini size', es: 'Talla mini' },
  'Taglia piccola/media': { en: 'Small/medium size', es: 'Talla pequeña/mediana' },
  'Bagno + tosatura': { en: 'Bath and trim', es: 'Baño y corte' },
  '(indicativo)': { en: '(guide)', es: '(orientativo)' },
  'Servizi extra': { en: 'Extra services', es: 'Servicios extra' },
  'Taglio unghie': { en: 'Nail trim', es: 'Corte de uñas' },
  'Shampoo dermatologico e antiparassitario': { en: 'Medicated and flea shampoo', es: 'Champú dermatológico y antiparasitario' },
  'Nel servizio bagno sono compresi:': { en: 'The bath includes:', es: 'El baño incluye:' },
  'Pulizia orecchie': { en: 'Ear cleaning', es: 'Limpieza de orejas' },
  'Pulizia occhi': { en: 'Eye cleaning', es: 'Limpieza de ojos' },
  'Informazioni importanti': { en: 'Important information', es: 'Información importante' },
  'I prezzi indicati sono da considerarsi a partire da e possono aumentare in base a:': {
    en: 'The prices shown start from and can rise based on:',
    es: 'Los precios indicados parten de y pueden subir según:',
  },
  'presenza di nodi o feltri': { en: 'mats or tangles', es: 'nudos o enredos' },
  'condizioni del mantello che richiede lavorazioni extra (muta)': { en: 'coat that needs extra work (shedding)', es: 'manto que pide trabajo extra (muda)' },
  'comportamento del cane (agitato, difficile da gestire)': { en: 'the dog’s behaviour (restless, hard to handle)', es: 'el comportamiento del perro (inquieto, difícil)' },
  'tempo necessario per completare il servizio': { en: 'time needed to finish the service', es: 'tiempo necesario para terminar el servicio' },
  'In questi casi verrà applicato un supplemento proporzionato al lavoro richiesto.': {
    en: 'In these cases a supplement is added in proportion to the work.',
    es: 'En estos casos se añade un suplemento proporcional al trabajo.',
  },
  'Non si accettano cani infestati da pulci o zecche': { en: 'Dogs with fleas or ticks are not accepted', es: 'No se aceptan perros con pulgas o garrapatas' },
  'Per il benessere di tutti gli animali presenti in toelettatura:': {
    en: 'For the wellbeing of every animal in the salon:',
    es: 'Por el bienestar de todos los animales de la peluquería:',
  },
  'non vengono accettati cani con infestazioni in corso di pulci o zecche': {
    en: 'dogs with an active flea or tick infestation are not accepted',
    es: 'no se aceptan perros con pulgas o garrapatas en curso',
  },
  'è consigliato effettuare preventivamente un trattamento antiparassitario a casa': {
    en: 'a flea treatment at home beforehand is recommended',
    es: 'se aconseja un tratamiento antiparasitario en casa antes',
  },
  'il servizio di toelettatura potrà essere eseguito successivamente': {
    en: 'the grooming can be done afterwards',
    es: 'el servicio de peluquería podrá hacerse después',
  },
  'Grazie per la fiducia!': { en: 'Thank you for your trust!', es: '¡Gracias por la confianza!' },
  'Tosatura a partire da 55 €\nma su valutazione del tipo di cane, mantello e problematiche.': {
    en: 'Trim from €55\nbased on the dog, the coat and any problems.',
    es: 'Corte desde 55 €\nsegún el perro, el manto y los problemas.',
  },
}
