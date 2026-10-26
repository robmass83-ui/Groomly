import type { Lingua } from '../i18n/lingua'
import { normalizzaTelefono, renderTemplate, urlWhatsApp } from './whatsapp'

export type TipoMessaggio = 'promemoria' | 'conferma' | 'pronto' | 'richiamo' | 'auguri'

const MODELLI: Record<Lingua, Record<TipoMessaggio, string>> = {
  it: {
    promemoria: 'Ciao {{nome}}, ti ricordiamo l’appuntamento di {{cane}} per {{servizio}}, {{quando}}.',
    conferma: 'Ciao {{nome}}, confermi l’appuntamento di {{cane}} ({{servizio}}) {{quando}}?',
    pronto: 'Ciao {{nome}}, {{cane}} è pronto da ritirare.',
    richiamo: 'Ciao {{nome}}, è il momento di riportare {{cane}} per {{servizio}}.',
    auguri: 'Ciao {{nome}}, auguri a {{cane}}.',
  },
  en: {
    promemoria: 'Hello {{nome}}, this is a reminder for {{cane}} ({{servizio}}) on {{quando}}.',
    conferma: 'Hello {{nome}}, please confirm {{cane}} ({{servizio}}) on {{quando}}.',
    pronto: 'Hello {{nome}}, {{cane}} is ready for pickup.',
    richiamo: 'Hello {{nome}}, it is time to bring {{cane}} back for {{servizio}}.',
    auguri: 'Hello {{nome}}, best wishes for {{cane}}.',
  },
  es: {
    promemoria: 'Hola {{nome}}, te recordamos la cita de {{cane}} para {{servizio}}, {{quando}}.',
    conferma: 'Hola {{nome}}, ¿confirmas la cita de {{cane}} ({{servizio}}) {{quando}}?',
    pronto: 'Hola {{nome}}, {{cane}} está listo para recoger.',
    richiamo: 'Hola {{nome}}, es el momento de traer a {{cane}} para {{servizio}}.',
    auguri: 'Hola {{nome}}, felicidades para {{cane}}.',
  },
}

export function firmaMessaggio(lingua: Lingua): string {
  if (lingua === 'en') return 'Made with Groomly'
  if (lingua === 'es') return 'Hecho con Groomly'
  return 'Fatto con Groomly'
}

export function testoMessaggio(lingua: Lingua, tipo: TipoMessaggio, valori: Record<string, string>): string {
  return `${renderTemplate(MODELLI[lingua][tipo], valori)}\n\n${firmaMessaggio(lingua)}`
}

export function linkMessaggio(telefono: string, testo: string): string | null {
  const numero = normalizzaTelefono(telefono)
  if (!numero) return null
  return urlWhatsApp(numero, testo)
}
