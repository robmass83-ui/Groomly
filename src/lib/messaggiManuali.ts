import type { Lingua } from '../i18n/lingua'
import { whatsAppLink } from './phone'
import { normalizzaTelefono, renderTemplate, urlWhatsApp } from './whatsapp'

export type TipoMessaggio = 'promemoria' | 'conferma' | 'pronto' | 'richiamo' | 'auguri'

export type ValoriMessaggio = { nome: string; cane: string; servizio: string; quando: string }

/** I pezzi tra parentesi quadre si tolgono quando il valore manca. */
const MODELLI: Record<Lingua, Record<TipoMessaggio, string>> = {
  it: {
    conferma: '{{saluto}} ci confermi l’appuntamento di {{cane}}[ ({{servizio}})][ {{quando}}]? Basta una risposta qui. Grazie!',
    richiamo: '{{saluto}} è passato un po’ di tempo: è il momento giusto per riportare {{cane}}[ per {{servizio}}][, {{quando}}]. Scrivici qui per fissare. A presto!',
    promemoria: '{{saluto}} ti ricordiamo l’appuntamento di {{cane}}[ per {{servizio}}][, {{quando}}]. Se hai un imprevisto, avvisaci qui. Ti aspettiamo, a presto!',
    pronto: '{{saluto}} {{cane}} è pronto e ti aspetta. Puoi passare a prenderlo, a tra poco!',
    auguri: '{{saluto}} tanti auguri a {{cane}} da tutti noi! Speriamo di vedervi presto.',
  },
  en: {
    conferma: '{{saluto}} could you confirm {{cane}}\'s appointment[ ({{servizio}})][ {{quando}}]? Just reply here. Thank you!',
    richiamo: '{{saluto}} it\'s been a little while: it\'s a good time to bring {{cane}} back[ for {{servizio}}][, {{quando}}]. Message us here to book. See you soon!',
    promemoria: '{{saluto}} just a reminder of {{cane}}\'s appointment[ for {{servizio}}][, {{quando}}]. If anything comes up, let us know here. Looking forward to seeing you!',
    pronto: '{{saluto}} {{cane}} is all done and waiting for you. You can come and pick them up, see you soon!',
    auguri: '{{saluto}} happy birthday to {{cane}} from all of us! We hope to see you both soon.',
  },
  es: {
    conferma: '{{saluto}} ¿nos confirmas la cita de {{cane}}[ ({{servizio}})][ {{quando}}]? Basta con responder aquí. ¡Gracias!',
    richiamo: '{{saluto}} ya ha pasado un tiempo: es un buen momento para volver a traer a {{cane}}[ para {{servizio}}][, {{quando}}]. Escríbenos por aquí para reservar. ¡Hasta pronto!',
    promemoria: '{{saluto}} te recordamos la cita de {{cane}}[ para {{servizio}}][, {{quando}}]. Si te surge algún imprevisto, avísanos por aquí. ¡Te esperamos, hasta pronto!',
    pronto: '{{saluto}} hemos terminado con {{cane}} y ya te está esperando. Puedes pasar a recogerlo, ¡hasta ahora!',
    auguri: '{{saluto}} ¡feliz cumpleaños a {{cane}} de parte de todos nosotros! Esperamos veros pronto.',
  },
  fr: {
    conferma: '{{saluto}} pouvez-vous nous confirmer le rendez-vous de {{cane}}[ ({{servizio}})][ {{quando}}] ? Il suffit de répondre ici. Merci !',
    richiamo: '{{saluto}} cela fait un petit moment : c’est le bon moment pour ramener {{cane}}[ pour {{servizio}}][, {{quando}}]. Écrivez-nous ici pour fixer un rendez-vous. À bientôt !',
    promemoria: '{{saluto}} nous vous rappelons le rendez-vous de {{cane}}[ pour {{servizio}}][, {{quando}}]. En cas d’imprévu, prévenez-nous ici. À bientôt !',
    pronto: '{{saluto}} {{cane}} est prêt et vous attend. Vous pouvez venir le chercher, à tout de suite !',
    auguri: '{{saluto}} joyeux anniversaire à {{cane}} de la part de toute l’équipe ! Nous espérons vous revoir bientôt.',
  },
  de: {
    conferma: '{{saluto}} können Sie uns den Termin von {{cane}}[ ({{servizio}})][ {{quando}}] bestätigen? Eine kurze Antwort hier genügt. Danke!',
    richiamo: '{{saluto}} es ist schon eine Weile her: Jetzt ist ein guter Zeitpunkt, {{cane}} wieder zu bringen[, für {{servizio}}][, {{quando}}]. Schreiben Sie uns hier für einen Termin. Bis bald!',
    promemoria: '{{saluto}} wir erinnern Sie an den Termin von {{cane}}[ für {{servizio}}][, {{quando}}]. Falls etwas dazwischenkommt, sagen Sie uns hier Bescheid. Bis bald!',
    pronto: '{{saluto}} {{cane}} ist fertig und wartet auf Sie. Sie können gern vorbeikommen, bis gleich!',
    auguri: '{{saluto}} alles Gute zum Geburtstag für {{cane}} von uns allen! Wir hoffen, Sie bald wiederzusehen.',
  },
}

const FIRME: Record<Lingua, string> = {
  it: 'Fatto con Groomly',
  en: 'Made with Groomly',
  es: 'Hecho con Groomly',
  fr: 'Fait avec Groomly',
  de: 'Erstellt mit Groomly',
}

const SALUTI: Record<Lingua, string> = { it: 'Ciao', en: 'Hi', es: 'Hola', fr: 'Bonjour', de: 'Hallo' }

export function firmaMessaggio(lingua: Lingua): string {
  return FIRME[lingua]
}

function saluto(lingua: Lingua, nome: string): string {
  return nome ? `${SALUTI[lingua]} ${nome},` : `${SALUTI[lingua]},`
}

function fraseMessaggio(lingua: Lingua, tipo: TipoMessaggio, valori: ValoriMessaggio): string {
  const nome = valori.nome.trim()
  const cane = valori.cane.trim()
  const servizio = valori.servizio.trim()
  const quando = valori.quando.trim()
  const compilati: Record<string, string> = { saluto: saluto(lingua, nome), nome, cane, servizio, quando }
  const senzaVuoti = MODELLI[lingua][tipo].replace(/\[([^\]]*)\]/g, (_tutto, pezzo: string) => {
    const campo = /\{\{(\w+)\}\}/.exec(pezzo)?.[1] ?? ''
    return compilati[campo] ? pezzo : ''
  })
  return renderTemplate(senzaVuoti, compilati)
}

export function testoMessaggio(lingua: Lingua, tipo: TipoMessaggio, valori: ValoriMessaggio): string {
  return fraseMessaggio(lingua, tipo, valori)
}

/** Come il tasto WhatsApp della scheda: accetta anche un numero corto e allega il testo. */
export function hrefMessaggio(telefono: string, testo: string): string | null {
  if (!telefono.replace(/\D/g, '')) return null
  return `${whatsAppLink(telefono)}?text=${encodeURIComponent(testo)}`
}

export function hrefChat(telefono: string): string | null {
  if (!telefono.replace(/\D/g, '')) return null
  return whatsAppLink(telefono)
}

export function hrefMessaggioApp(href: string): string {
  return href.replace('https://wa.me/', 'whatsapp://send?phone=').replace('?text=', '&text=')
}

export function linkMessaggio(telefono: string, testo: string): string | null {
  const numero = normalizzaTelefono(telefono)
  if (!numero) return null
  return urlWhatsApp(numero, testo)
}
