import type { Lingua } from '../i18n/lingua'
import { whatsAppLink } from './phone'
import { normalizzaTelefono, renderTemplate, urlWhatsApp } from './whatsapp'

export type TipoMessaggio = 'promemoria' | 'conferma' | 'pronto' | 'richiamo' | 'auguri'

const MODELLI: Record<Lingua, Record<'pronto' | 'auguri', string>> = {
  it: {
    pronto: '{{saluto}} {{cane}} è pronto e ti aspetta. Puoi passare a prenderlo, a tra poco!',
    auguri: '{{saluto}} tanti auguri a {{cane}} da tutti noi! Speriamo di vedervi presto.',
  },
  en: {
    pronto: '{{saluto}} {{cane}} is all done and waiting for you. You can come and pick them up, see you soon!',
    auguri: '{{saluto}} happy birthday to {{cane}} from all of us! We hope to see you both soon.',
  },
  es: {
    pronto: '{{saluto}} hemos terminado con {{cane}} y ya te está esperando. Puedes pasar a recogerlo, ¡hasta ahora!',
    auguri: '{{saluto}} ¡feliz cumpleaños a {{cane}} de parte de todos nosotros! Esperamos veros pronto.',
  },
}

export function firmaMessaggio(lingua: Lingua): string {
  if (lingua === 'en') return 'Made with Groomly'
  if (lingua === 'es') return 'Hecho con Groomly'
  return 'Fatto con Groomly'
}

function saluto(lingua: Lingua, nome: string): string {
  const base = lingua === 'en' ? 'Hi' : lingua === 'es' ? 'Hola' : 'Ciao'
  return nome ? `${base} ${nome},` : `${base},`
}

function fraseMessaggio(lingua: Lingua, tipo: TipoMessaggio, valori: Record<string, string>): string {
  const nome = (valori.nome ?? '').trim()
  const cane = (valori.cane ?? '').trim()
  const servizio = (valori.servizio ?? '').trim()
  const quando = (valori.quando ?? '').trim()
  if (tipo === 'promemoria' || tipo === 'conferma' || tipo === 'richiamo') {
    return frasePulita(lingua, tipo, nome, cane, servizio, quando)
  }
  return renderTemplate(MODELLI[lingua][tipo], { saluto: saluto(lingua, nome), nome, cane, servizio, quando })
}

function frasePulita(lingua: Lingua, tipo: TipoMessaggio, nome: string, cane: string, servizio: string, quando: string): string {
  const s = saluto(lingua, nome)
  if (lingua === 'en') {
    if (tipo === 'conferma') {
      return `${s} could you confirm ${cane}'s appointment${servizio ? ` (${servizio})` : ''}${quando ? ` ${quando}` : ''}? Just reply here. Thank you!`
    }
    if (tipo === 'richiamo') {
      return `${s} it's been a little while: it's a good time to bring ${cane} back${servizio ? ` for ${servizio}` : ''}${quando ? `, ${quando}` : ''}. Message us here to book. See you soon!`
    }
    return `${s} just a reminder of ${cane}'s appointment${servizio ? ` for ${servizio}` : ''}${quando ? `, ${quando}` : ''}. If anything comes up, let us know here. Looking forward to seeing you!`
  }
  if (lingua === 'es') {
    if (tipo === 'conferma') {
      return `${s} ¿nos confirmas la cita de ${cane}${servizio ? ` (${servizio})` : ''}${quando ? ` ${quando}` : ''}? Basta con responder aquí. ¡Gracias!`
    }
    if (tipo === 'richiamo') {
      return `${s} ya ha pasado un tiempo: es un buen momento para volver a traer a ${cane}${servizio ? ` para ${servizio}` : ''}${quando ? `, ${quando}` : ''}. Escríbenos por aquí para reservar. ¡Hasta pronto!`
    }
    return `${s} te recordamos la cita de ${cane}${servizio ? ` para ${servizio}` : ''}${quando ? `, ${quando}` : ''}. Si te surge algún imprevisto, avísanos por aquí. ¡Te esperamos, hasta pronto!`
  }
  if (tipo === 'conferma') {
    return `${s} ci confermi l’appuntamento di ${cane}${servizio ? ` (${servizio})` : ''}${quando ? ` ${quando}` : ''}? Basta una risposta qui. Grazie!`
  }
  if (tipo === 'richiamo') {
    return `${s} è passato un po’ di tempo: è il momento giusto per riportare ${cane}${servizio ? ` per ${servizio}` : ''}${quando ? `, ${quando}` : ''}. Scrivici qui per fissare. A presto!`
  }
  return `${s} ti ricordiamo l’appuntamento di ${cane}${servizio ? ` per ${servizio}` : ''}${quando ? `, ${quando}` : ''}. Se hai un imprevisto, avvisaci qui. Ti aspettiamo, a presto!`
}

export function testoMessaggio(lingua: Lingua, tipo: TipoMessaggio, valori: Record<string, string>): string {
  return fraseMessaggio(lingua, tipo, valori)
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
