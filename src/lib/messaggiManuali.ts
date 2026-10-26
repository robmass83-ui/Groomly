import type { Lingua } from '../i18n/lingua'
import { whatsAppLink } from './phone'
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

function fraseMessaggio(lingua: Lingua, tipo: TipoMessaggio, valori: Record<string, string>): string {
  const nome = (valori.nome ?? '').trim()
  const cane = (valori.cane ?? '').trim()
  const servizio = (valori.servizio ?? '').trim()
  const quando = (valori.quando ?? '').trim()
  if (tipo === 'promemoria' || tipo === 'conferma' || tipo === 'richiamo') {
    return frasePulita(lingua, tipo, nome, cane, servizio, quando)
  }
  return renderTemplate(MODELLI[lingua][tipo], { nome, cane, servizio, quando })
}

function frasePulita(lingua: Lingua, tipo: TipoMessaggio, nome: string, cane: string, servizio: string, quando: string): string {
  if (lingua === 'en') {
    if (tipo === 'conferma') return `Hello ${nome}, please confirm ${cane}${servizio ? ` (${servizio})` : ''}${quando ? ` on ${quando}` : ''}.`
    if (tipo === 'richiamo') return `Hello ${nome}, it is time to bring ${cane} back${servizio ? ` for ${servizio}` : ''}${quando ? ` on ${quando}` : ''}.`
    return `Hello ${nome}, this is a reminder for ${cane}${servizio ? ` (${servizio})` : ''}${quando ? ` on ${quando}` : ''}.`
  }
  if (lingua === 'es') {
    if (tipo === 'conferma') return `Hola ${nome}, ¿confirmas la cita de ${cane}${servizio ? ` (${servizio})` : ''}${quando ? ` ${quando}` : ''}?`
    if (tipo === 'richiamo') return `Hola ${nome}, es el momento de traer a ${cane}${servizio ? ` para ${servizio}` : ''}${quando ? `, ${quando}` : ''}.`
    return `Hola ${nome}, te recordamos la cita de ${cane}${servizio ? ` para ${servizio}` : ''}${quando ? `, ${quando}` : ''}.`
  }
  if (tipo === 'conferma') return `Ciao ${nome}, confermi l’appuntamento di ${cane}${servizio ? ` (${servizio})` : ''}${quando ? ` ${quando}` : ''}?`
  if (tipo === 'richiamo') return `Ciao ${nome}, è il momento di riportare ${cane}${servizio ? ` per ${servizio}` : ''}${quando ? `, ${quando}` : ''}.`
  return `Ciao ${nome}, ti ricordiamo l’appuntamento di ${cane}${servizio ? ` per ${servizio}` : ''}${quando ? `, ${quando}` : ''}.`
}

export function testoMessaggio(lingua: Lingua, tipo: TipoMessaggio, valori: Record<string, string>): string {
  return `${fraseMessaggio(lingua, tipo, valori)}\n\n${firmaMessaggio(lingua)}`
}

/** Come il tasto WhatsApp della scheda: accetta anche un numero corto e allega il testo. */
export function hrefMessaggio(telefono: string, testo: string): string | null {
  if (!telefono.replace(/\D/g, '')) return null
  return `${whatsAppLink(telefono)}?text=${encodeURIComponent(testo)}`
}

export function hrefMessaggioApp(href: string): string {
  return href.replace('https://wa.me/', 'whatsapp://send?phone=').replace('?text=', '&text=')
}

export function linkMessaggio(telefono: string, testo: string): string | null {
  const numero = normalizzaTelefono(telefono)
  if (!numero) return null
  return urlWhatsApp(numero, testo)
}
