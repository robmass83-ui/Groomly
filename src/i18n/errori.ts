import type { Lingua } from './lingua'

type Riga = { it: string; en?: string; es?: string }

const ERRORI: Record<string, Riga> = {
  nome_preso: { it: 'Nome già preso', en: 'Name already taken', es: 'Nombre ya usado' },
  scegli_cane: { it: 'Scegli un cane', en: 'Choose a dog', es: 'Elige un perro' },
  email_valida: { it: 'Inserisci un’email valida', en: 'Enter a valid email address', es: 'Introduce un correo válido' },
  invio: { it: 'Invio non riuscito', en: 'Couldn’t send', es: 'No se ha podido enviar' },
  solo_inglese: { it: 'Solo italiano', en: 'English only' },
  solo_italiano: { it: 'Solo italiano' },
  generico: { it: 'Qualcosa non ha funzionato', en: 'Something went wrong', es: 'Algo no ha funcionado' },
}

export function fraseErrore(lingua: Lingua, codice: string): string {
  const riga = ERRORI[codice] ?? ERRORI.generico
  const richiesta = riga[lingua]
  if (richiesta) return richiesta
  return riga.en || riga.it
}
