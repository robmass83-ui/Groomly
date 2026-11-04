import type { Lingua } from './lingua'

type Riga = { it: string } & Partial<Record<Lingua, string>>

const ERRORI: Record<string, Riga> = {
  nome_preso: { it: 'Nome già preso', en: 'Name already taken', es: 'Nombre ya usado', fr: 'Name already taken', de: 'Name already taken' }, // LINGUE: da tradurre
  scegli_cane: { it: 'Scegli un cane', en: 'Choose a dog', es: 'Elige un perro', fr: 'Choose a dog', de: 'Choose a dog' }, // LINGUE: da tradurre
  email_valida: { it: 'Inserisci un’email valida', en: 'Enter a valid email address', es: 'Introduce un correo válido', fr: 'Enter a valid email address', de: 'Enter a valid email address' }, // LINGUE: da tradurre
  invio: { it: 'Invio non riuscito', en: 'Couldn’t send', es: 'No se ha podido enviar', fr: 'Couldn’t send', de: 'Couldn’t send' }, // LINGUE: da tradurre
  solo_inglese: { it: 'Solo italiano', en: 'English only' },
  solo_italiano: { it: 'Solo italiano' },
  generico: { it: 'Qualcosa non ha funzionato', en: 'Something went wrong', es: 'Algo no ha funcionado', fr: 'Something went wrong', de: 'Something went wrong' }, // LINGUE: da tradurre
}

export function fraseErrore(lingua: Lingua, codice: string): string {
  const riga = ERRORI[codice] ?? ERRORI.generico
  const richiesta = riga[lingua]
  if (richiesta) return richiesta
  return riga.en || riga.it
}
