import { oraRoma } from '../lib/disponibilita'
import type { Lingua } from './lingua'

export type TipoEmail =
  | 'verifica'
  | 'reset'
  | 'invito'
  | 'ricevuta'
  | 'conferma'
  | 'proposta'
  | 'rifiuto'
  | 'liberato'
  | 'scadenza'
  | 'disdetta'
  | 'promemoria'
  | 'pronto'
  | 'auguri'
  | 'recensione'
  | 'attesa'

export type RuoloSalone = 'soggetto' | 'di' | 'a' | 'da' | 'dopoDi'

export type DatiEmail = {
  cliente?: string
  cane?: string
  salone?: string
  ruolo?: 'socio' | 'collaboratore'
  url?: string
  urlRifiuta?: string
  quando?: string
  invece?: string
  entro?: string
  silenzio?: string
  scheda?: string
  rispondi?: boolean
  account?: string
}

const SERVIZI = new Set<TipoEmail>(['promemoria', 'pronto', 'auguri', 'recensione', 'attesa'])
const NOTA_RISPOSTA_TIPI = new Set<TipoEmail>(['ricevuta', 'conferma', 'proposta', 'rifiuto'])
const SENZA_PULSANTE = new Set<TipoEmail>(['ricevuta', 'conferma', 'rifiuto', 'liberato', 'scadenza', 'disdetta', 'promemoria', 'pronto', 'auguri'])

const OGGETTO_VERIFICA: Record<Lingua, string> = {
  it: 'Benvenuto su Groomly, conferma la tua email',
  en: 'Welcome to Groomly, please confirm your email',
  es: 'Bienvenido a Groomly, confirma tu correo',
}

const OGGETTO_RESET: Record<Lingua, string> = {
  it: 'Reimposta la tua password',
  en: 'Reset your password',
  es: 'Restablece tu contraseña',
}

const OGGETTO_INVITO_VUOTO: Record<Lingua, string> = {
  it: 'Sei invitato su Groomly',
  en: 'You’re invited to Groomly',
  es: 'Te invitan a Groomly',
}

const BOTTONE_ACCOUNT: Record<'verifica' | 'reset' | 'invito', Record<Lingua, string>> = {
  verifica: { it: 'Conferma l’email', en: 'Confirm email', es: 'Confirmar el correo' },
  reset: { it: 'Reimposta la password', en: 'Reset password', es: 'Restablecer la contraseña' },
  invito: { it: 'Accetta l’invito', en: 'Accept invitation', es: 'Aceptar la invitación' },
}

const NOTA_RISPOSTA: Record<Lingua, string> = {
  it: 'Hai una domanda? Rispondi a questa email, arriva direttamente al salone.',
  en: 'Any questions? Just reply to this email and it will go straight to the salon.',
  es: '¿Tienes alguna pregunta? Responde a este correo y llegará directamente a la peluquería.',
}

const NOTA_PAGINA: Record<Lingua, string> = {
  it: 'Puoi inviare una nuova richiesta dalla pagina del salone.',
  en: "You can send a new request from the salon's page.",
  es: 'Puedes enviar una nueva solicitud desde la página de la peluquería.',
}

const SILENZIO: Record<Lingua, string> = {
  it: 'Non voglio più ricevere queste email',
  en: "I don't want to receive these emails any more",
  es: 'No quiero recibir más estos correos',
}

const CONFERMO: Record<Lingua, string> = { it: 'Confermo', en: 'Confirm', es: 'Confirmo' }
const NON_POSSO: Record<Lingua, string> = { it: 'Non posso', en: "I can't make it", es: 'No puedo' }
const RECENSIONE_BOTTONE: Record<Lingua, string> = { it: 'Lascia una recensione', en: 'Leave a review', es: 'Dejar una reseña' }
const ATTESA_BOTTONE: Record<Lingua, string> = { it: 'Prenota il posto', en: 'Book this slot', es: 'Reservar el hueco' }

const SALONE_VUOTO: Record<RuoloSalone, Record<Lingua, string>> = {
  soggetto: { it: 'il salone', en: 'the salon', es: 'la peluquería' },
  di: { it: 'del salone', en: 'of the salon', es: 'de la peluquería' },
  a: { it: 'al salone', en: 'to the salon', es: 'a la peluquería' },
  da: { it: 'dal salone', en: 'from the salon', es: 'de la peluquería' },
  dopoDi: { it: 'dal salone', en: 'at the salon', es: 'en la peluquería' },
}

export function etichettaRuolo(lingua: Lingua, ruolo: 'socio' | 'collaboratore'): string {
  if (lingua === 'en') return ruolo === 'socio' ? 'Partner' : 'Team member'
  if (lingua === 'es') return ruolo === 'socio' ? 'Socio' : 'Colaborador'
  return ruolo === 'socio' ? 'Socio' : 'Collaboratore'
}

export function escapaHtml(testo: string): string {
  return testo.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function saloneNellaFrase(lingua: Lingua, nome: string, ruolo: RuoloSalone): string {
  const pulito = nome.trim()
  if (pulito) return escapaHtml(pulito)
  return SALONE_VUOTO[ruolo][lingua]
}

function posto(lingua: Lingua, nome: string, ruolo: RuoloSalone, prep: string): string {
  if (nome.trim()) {
    const pezzo = saloneNellaFrase(lingua, nome, ruolo)
    return prep ? `${prep} ${pezzo}` : pezzo
  }
  return saloneNellaFrase(lingua, '', ruolo)
}

function luogo(lingua: Lingua, nome: string): string {
  if (lingua === 'en') return posto(lingua, nome, 'dopoDi', 'at')
  if (lingua === 'es') return posto(lingua, nome, 'dopoDi', 'en')
  return posto(lingua, nome, 'da', 'da')
}

function saluto(lingua: Lingua, cliente: string): string {
  const nome = cliente.trim()
  if (!nome) return lingua === 'en' ? 'Hi,' : lingua === 'es' ? 'Hola,' : 'Ciao,'
  const ciao = lingua === 'en' ? 'Hi' : lingua === 'es' ? 'Hola' : 'Ciao'
  return `${ciao} ${escapaHtml(nome)},`
}

const SPECIE_MAIL: Record<Lingua, Record<string, string>> = {
  it: { cane: 'cane', gatto: 'gatto', altro: 'altro animale' },
  en: { cane: 'dog', gatto: 'cat', altro: 'other animal' },
  es: { cane: 'perro', gatto: 'gato', altro: 'otro animal' },
}

const TAGLIA_MAIL: Record<Lingua, Record<string, string>> = {
  it: { piccola: 'taglia piccola', media: 'taglia media', grande: 'taglia grande' },
  en: { piccola: 'small size', media: 'medium size', grande: 'large size' },
  es: { piccola: 'talla pequeña', media: 'talla mediana', grande: 'talla grande' },
}

const PREZZI_MAIL: Record<Lingua, string> = {
  it: 'I prezzi sono indicativi. Possono variare dopo aver visto l’animale, se ci sono nodi o problemi che richiedono più tempo.',
  en: 'Prices are a guide. They can change after we see the animal, if there are mats or problems that need more time.',
  es: 'Los precios son orientativos. Pueden cambiar después de ver al animal, si hay nudos o problemas que pidan más tiempo.',
}

function giornoMail(lingua: Lingua, data: Date): string {
  const locale = lingua === 'en' ? 'en-GB' : lingua === 'es' ? 'es-ES' : 'it-IT'
  const parti = new Intl.DateTimeFormat(locale, {
    timeZone: 'Europe/Rome',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).formatToParts(data)
  const valore = (tipo: Intl.DateTimeFormatPartTypes) => parti.find((parte) => parte.type === tipo)?.value ?? ''
  const mese = lingua === 'es' ? `de ${valore('month')}` : valore('month')
  return `${valore('weekday')} ${valore('day')} ${mese}`
}

function euro(totale: number): string {
  const testo = Number.isInteger(totale) ? String(totale) : totale.toFixed(2).replace('.', ',')
  return `€ ${testo}`
}

export function riepilogoRicevuta(lingua: Lingua, dati: {
  nome: string
  cane?: string
  razza?: string
  specie?: string
  taglia?: string
  servizi: readonly string[]
  inizio: Date
  fine: Date
  durataMin: number
  totale: number
  telefono?: string
}): string {
  const animale = [dati.cane, SPECIE_MAIL[lingua][dati.specie ?? ''], TAGLIA_MAIL[lingua][dati.taglia ?? ''], dati.razza]
    .map((voce) => (voce ?? '').trim())
    .filter(Boolean)
    .join(' · ')
  const servizi = dati.servizi.map((voce) => voce.trim()).filter(Boolean).join(', ')
  const quando = Number.isNaN(dati.inizio.getTime())
    ? ''
    : `${giornoMail(lingua, dati.inizio)}, ${oraRoma(dati.inizio)}–${oraRoma(dati.fine)}`
  const durata = lingua === 'en'
    ? `Duration ${dati.durataMin} min · Guide price ${euro(dati.totale)}`
    : lingua === 'es'
      ? `Duración ${dati.durataMin} min · Precio orientativo ${euro(dati.totale)}`
      : `Durata ${dati.durataMin} min · Prezzo indicativo ${euro(dati.totale)}`
  const telefono = (dati.telefono ?? '').trim()
  const contatto = telefono
    ? (lingua === 'en' ? `Salon phone: ${telefono}` : lingua === 'es' ? `Teléfono del salón: ${telefono}` : `Telefono del salone: ${telefono}`)
    : ''
  return [dati.nome.trim(), animale, servizi, quando, durata, PREZZI_MAIL[lingua], contatto].filter(Boolean).join('\n')
}

function oggettoCliente(lingua: Lingua, tipo: TipoEmail, cane: string): string {
  const nome = cane.trim()
  if (lingua === 'en') {
    if (tipo === 'ricevuta') return "We've received your request"
    if (tipo === 'conferma') return nome ? `Appointment confirmed for ${nome}` : 'Appointment confirmed'
    if (tipo === 'proposta') return nome ? `A new time for ${nome}` : 'A new time'
    if (tipo === 'rifiuto') return 'An update on your request'
    if (tipo === 'liberato') return 'The slot has been released'
    if (tipo === 'scadenza') return 'Your request has expired'
    if (tipo === 'disdetta') return nome ? `${nome}'s appointment cancelled` : 'Appointment cancelled'
    if (tipo === 'promemoria') return nome ? `See you soon, ${nome}!` : 'See you soon!'
    if (tipo === 'pronto') return nome ? `${nome} is ready!` : 'Ready for pick-up'
    if (tipo === 'auguri') return nome ? `Happy birthday, ${nome}!` : 'Happy birthday!'
    if (tipo === 'recensione') return nome ? `How did it go with ${nome}?` : 'How did it go?'
    if (tipo === 'attesa') return nome ? `A slot has opened up for ${nome}` : 'A slot has opened up'
  }
  if (lingua === 'es') {
    if (tipo === 'ricevuta') return 'Hemos recibido tu solicitud'
    if (tipo === 'conferma') return nome ? `Cita confirmada para ${nome}` : 'Cita confirmada'
    if (tipo === 'proposta') return nome ? `Un nuevo horario para ${nome}` : 'Un nuevo horario'
    if (tipo === 'rifiuto') return 'Novedades sobre tu solicitud'
    if (tipo === 'liberato') return 'El hueco ha quedado libre'
    if (tipo === 'scadenza') return 'Tu solicitud ha caducado'
    if (tipo === 'disdetta') return nome ? `Cita de ${nome} cancelada` : 'Cita cancelada'
    if (tipo === 'promemoria') return nome ? `¡Nos vemos pronto, ${nome}!` : '¡Nos vemos pronto!'
    if (tipo === 'pronto') return nome ? `¡${nome} ya está listo!` : 'Ya está listo'
    if (tipo === 'auguri') return nome ? `¡Feliz cumpleaños, ${nome}!` : '¡Feliz cumpleaños!'
    if (tipo === 'recensione') return nome ? `¿Qué tal le fue a ${nome}?` : '¿Qué tal fue?'
    if (tipo === 'attesa') return nome ? `Se ha liberado un hueco para ${nome}` : 'Se ha liberado un hueco'
  }
  if (tipo === 'ricevuta') return 'Abbiamo ricevuto la tua richiesta'
  if (tipo === 'conferma') return nome ? `Appuntamento confermato per ${nome}` : 'Appuntamento confermato'
  if (tipo === 'proposta') return nome ? `Un nuovo orario per ${nome}` : 'Un nuovo orario'
  if (tipo === 'rifiuto') return 'Aggiornamento sulla tua richiesta'
  if (tipo === 'liberato') return 'Il posto è stato liberato'
  if (tipo === 'scadenza') return 'La tua richiesta è scaduta'
  if (tipo === 'disdetta') return nome ? `Appuntamento di ${nome} disdetto` : 'Appuntamento disdetto'
  if (tipo === 'promemoria') return nome ? `Ci vediamo presto, ${nome}!` : 'Ci vediamo presto!'
  if (tipo === 'pronto') return nome ? `${nome} è pronto!` : 'È pronto'
  if (tipo === 'auguri') return nome ? `Buon compleanno, ${nome}!` : 'Buon compleanno!'
  if (tipo === 'recensione') return nome ? `Com’è andata con ${nome}?` : 'Com’è andata?'
  return nome ? `Si è liberato un posto per ${nome}` : 'Si è liberato un posto'
}

function corpoCliente(
  lingua: Lingua,
  tipo: TipoEmail,
  raw: { cliente: string; cane: string; salone: string; quando: string; invece: string; entro: string; rispondi: boolean },
): string {
  const cane = escapaHtml(raw.cane.trim())
  const quando = escapaHtml(raw.quando.trim())
  const invece = escapaHtml(raw.invece.trim())
  const entro = escapaHtml(raw.entro.trim())
  const ciao = saluto(lingua, raw.cliente)
  const chi = () => posto(lingua, raw.salone, 'soggetto', '')
  const a = () => posto(lingua, raw.salone, 'a', lingua === 'en' ? 'to' : 'a')
  const di = () => posto(lingua, raw.salone, 'di', lingua === 'en' ? 'of' : lingua === 'es' ? 'de' : 'di')
  const qui = () => luogo(lingua, raw.salone)

  if (tipo === 'ricevuta') {
    if (lingua === 'en') {
      return `${ciao} thank you for choosing ${chi()}. Your request${cane ? ` for ${cane}` : ''} has arrived: we'll let you know as soon as the salon replies.`
    }
    if (lingua === 'es') {
      return `${ciao} gracias por elegir ${chi()}. Tu solicitud${cane ? ` para ${cane}` : ''} ha llegado: te escribiremos en cuanto la peluquería responda.`
    }
    return `${ciao} grazie per aver scelto ${chi()}. La richiesta${cane ? ` per ${cane}` : ''} è arrivata: ti scriviamo appena il salone risponde.`
  }

  if (tipo === 'conferma') {
    if (lingua === 'en') {
      const app = cane && quando ? `${cane}'s appointment, ${quando}` : cane ? `${cane}'s appointment` : quando ? `the appointment, ${quando}` : 'the appointment'
      return `${ciao} good news: ${chi()} has confirmed ${app}. We look forward to seeing you! If anything comes up, please let the salon know as soon as possible so the slot can go to someone else.`
    }
    if (lingua === 'es') {
      const app = cane && quando ? `la cita de ${cane}, ${quando}` : cane ? `la cita de ${cane}` : quando ? `la cita, ${quando}` : 'la cita'
      return `${ciao} buenas noticias: ${chi()} ha confirmado ${app}. ¡Te esperamos! Si te surge algún imprevisto, avisa a la peluquería lo antes posible: así el hueco podrá ser para otra persona.`
    }
    const app = cane && quando ? `l’appuntamento di ${cane}, ${quando}` : cane ? `l’appuntamento di ${cane}` : quando ? `l’appuntamento, ${quando}` : 'l’appuntamento'
    return `${ciao} buone notizie: ${chi()} ha confermato ${app}. Ti aspettiamo! Se hai un imprevisto, avvisa il salone il prima possibile: così il posto può andare a qualcun altro.`
  }

  if (tipo === 'proposta') {
    const accogli = [cane, quando].filter(Boolean).join(' ')
    if (lingua === 'en') {
      const chiesto = invece
        ? `Unfortunately the time you asked for (${invece}) isn't available`
        : "Unfortunately the time you asked for isn't available"
      const ma = accogli ? `, but ${chi()} can see ${accogli}` : ''
      const limite = entro ? ` Please reply by ${entro}: after that, the slot will be released.` : ''
      return `${ciao} thank you for your request. ${chiesto}${ma}.${limite}`
    }
    if (lingua === 'es') {
      const chiesto = invece
        ? `Lamentablemente el horario que pediste (${invece}) no está disponible`
        : 'Lamentablemente el horario que pediste no está disponible'
      const conCane = [cane ? `a ${cane}` : '', quando].filter(Boolean).join(' ')
      const ma = conCane ? `, pero ${chi()} puede atender ${conCane}` : ''
      const limite = entro ? ` Te pedimos que respondas antes de ${entro}: después, el hueco quedará libre.` : ''
      return `${ciao} gracias por tu solicitud. ${chiesto}${ma}.${limite}`
    }
    const chiesto = invece
      ? `L’orario che avevi chiesto (${invece}) purtroppo non è disponibile`
      : 'L’orario che avevi chiesto purtroppo non è disponibile'
    const ma = accogli ? `, ma ${chi()} può accogliere ${accogli}` : ''
    const limite = entro ? ` Ti chiediamo di rispondere entro ${entro}: dopo, il posto verrà liberato.` : ''
    return `${ciao} grazie per la richiesta. ${chiesto}${ma}.${limite}`
  }

  if (tipo === 'rifiuto') {
    if (lingua === 'en') {
      return `${ciao} we're sorry: this time ${chi()} isn't able to accept the request${cane ? ` for ${cane}` : ''}. You're welcome to send a new one for another day, it would be a pleasure to see you.`
    }
    if (lingua === 'es') {
      return `${ciao} lo sentimos: esta vez ${chi()} no puede aceptar la solicitud${cane ? ` para ${cane}` : ''}. Puedes enviar una nueva para otro día, será un placer recibiros.`
    }
    return `${ciao} ci dispiace: questa volta ${chi()} non riesce ad accogliere la richiesta${cane ? ` per ${cane}` : ''}. Puoi inviarne una nuova per un altro giorno, sarà un piacere ricevervi.`
  }

  if (tipo === 'liberato') {
    if (lingua === 'en') {
      return `${ciao} the proposed time${cane ? ` for ${cane}` : ''} is no longer held. If you'd like to book another appointment, just send a new request ${a()}: we look forward to seeing you.`
    }
    if (lingua === 'es') {
      return `${ciao} el horario propuesto${cane ? ` para ${cane}` : ''} ya no está reservado. Si quieres pedir otra cita, envía una nueva solicitud ${a()}: te esperamos.`
    }
    return `${ciao} l’orario proposto${cane ? ` per ${cane}` : ''} non è più riservato. Se vuoi fissare un altro appuntamento, invia una nuova richiesta ${a()}: ti aspettiamo.`
  }

  if (tipo === 'scadenza') {
    if (lingua === 'en') {
      return `${ciao} we're sorry: the request${cane ? ` for ${cane}` : ''} ${a()} has expired because the salon wasn't able to reply in time. You can send a new one whenever you like.`
    }
    if (lingua === 'es') {
      return `${ciao} lo sentimos: la solicitud${cane ? ` para ${cane}` : ''} ${a()} ha caducado porque la peluquería no pudo responder a tiempo. Puedes enviar una nueva cuando quieras.`
    }
    return `${ciao} ci dispiace: la richiesta${cane ? ` per ${cane}` : ''} ${a()} è scaduta perché il salone non è riuscito a rispondere in tempo. Puoi inviarne una nuova quando vuoi.`
  }

  if (tipo === 'disdetta') {
    if (lingua === 'en') {
      const altro = raw.rispondi
        ? "Whenever you'd like to book another, send a new request or reply to this email."
        : "Whenever you'd like to book another, send a new request."
      const app = cane ? `${cane}'s appointment` : 'the appointment'
      return `${ciao} ${app} ${qui()} has been cancelled. ${altro} See you soon.`
    }
    if (lingua === 'es') {
      const altro = raw.rispondi
        ? 'Cuando quieras pedir otra, envía una nueva solicitud o responde a este correo.'
        : 'Cuando quieras pedir otra, envía una nueva solicitud.'
      return `${ciao} la cita${cane ? ` de ${cane}` : ''} ${qui()} ha sido cancelada. ${altro} Hasta pronto.`
    }
    const altro = raw.rispondi
      ? 'Quando vuoi fissarne un altro, invia una nuova richiesta o rispondi a questa email.'
      : 'Quando vuoi fissarne un altro, invia una nuova richiesta.'
    return `${ciao} l’appuntamento${cane ? ` di ${cane}` : ''} ${qui()} è stato disdetto. ${altro} A presto.`
  }

  if (tipo === 'promemoria') {
    if (lingua === 'en') {
      const app = cane ? `${cane}'s next appointment` : 'the next appointment'
      return `${ciao} ${chi()} would like to remind you of ${app}${quando ? ` on ${quando}` : ''}. If you can't make it, please let the salon know so the slot can go to someone else. See you soon!`
    }
    if (lingua === 'es') {
      return `${ciao} ${chi()} te recuerda la próxima cita${cane ? ` de ${cane}` : ''}${quando ? `, ${quando}` : ''}. Si no puedes venir, avisa a la peluquería para que el hueco pueda ser para otra persona. ¡Hasta pronto!`
    }
    return `${ciao} ${chi()} ti ricorda il prossimo appuntamento${cane ? ` di ${cane}` : ''}${quando ? `, ${quando}` : ''}. Se non riesci a venire, avvisa il salone, così il posto può andare a qualcun altro. A presto!`
  }

  if (tipo === 'pronto') {
    if (lingua === 'en') {
      const finito = cane
        ? `we're all done: ${cane} is ready to go home and you can come and pick them up.`
        : "we're all done."
      return `${ciao} ${finito} Thank you for trusting ${chi()}.`
    }
    if (lingua === 'es') {
      const finito = cane
        ? `hemos terminado: ${cane} ya puede volver a casa y puedes pasar a recogerlo.`
        : 'hemos terminado.'
      return `${ciao} ${finito} Gracias por confiar ${posto(lingua, raw.salone, 'dopoDi', 'en')}.`
    }
    const finito = cane
      ? `abbiamo finito: ${cane} è pronto per tornare a casa e puoi passare a prenderlo.`
      : 'abbiamo finito.'
    return `${ciao} ${finito} Grazie per averlo affidato ${a()}.`
  }

  if (tipo === 'auguri') {
    if (lingua === 'en') {
      const wish = cane ? ` wishes ${cane} a very happy birthday` : ' wishes a very happy birthday'
      return `${ciao} today is a special day: everyone ${posto(lingua, raw.salone, 'dopoDi', 'at')}${wish}. We hope to see you both again soon.`
    }
    if (lingua === 'es') {
      return `${ciao} hoy es un día especial: todo el equipo ${di()} le desea un muy feliz cumpleaños${cane ? ` a ${cane}` : ''}. Esperamos volver a veros pronto.`
    }
    return `${ciao} oggi è un giorno speciale: tutto lo staff ${di()} fa tanti auguri${cane ? ` a ${cane}` : ''}. Speriamo di rivedervi presto.`
  }

  if (tipo === 'recensione') {
    if (lingua === 'en') {
      const coda = raw.rispondi ? " If something wasn't quite right, just reply to this email: we'd really like to know." : ''
      return `${ciao} thank you for choosing ${chi()}. If you're happy with our work, a Google review helps us a lot and only takes a minute.${coda}`
    }
    if (lingua === 'es') {
      const coda = raw.rispondi ? ' Si algo no te convenció, responde a este correo: nos importa saberlo.' : ''
      return `${ciao} gracias por elegir ${chi()}. Si estás contento con nuestro trabajo, una reseña en Google nos ayuda mucho y solo lleva un minuto.${coda}`
    }
    const coda = raw.rispondi ? ' Se invece qualcosa non ti ha convinto, rispondi a questa email: ci teniamo a saperlo.' : ''
    return `${ciao} grazie per aver scelto ${chi()}. Se sei soddisfatto, una recensione su Google ci aiuta tanto e richiede un minuto.${coda}`
  }

  if (lingua === 'en') {
    return `${ciao} good news: a slot has opened up ${qui()}${cane ? ` at a time that suits ${cane}` : ''}. If you'd like it, tap the button to book: free slots go quickly.`
  }
  if (lingua === 'es') {
    return `${ciao} buenas noticias: ${qui()} se ha liberado un hueco${cane ? ` en un horario que le viene bien a ${cane}` : ''}. Si te interesa, toca el botón para reservarlo: los huecos libres vuelan.`
  }
  return `${ciao} buone notizie: ${qui()} si è liberato un posto${cane ? ` in un orario che fa per ${cane}` : ''}. Se ti va, tocca il pulsante per prenotarlo: i posti liberi vanno via in fretta.`
}

function avvolgi(lingua: Lingua, titolo: string, corpo: string, scheda: string, riga: string, pulsanti: string, nota: string, silenzio: string): string {
  const notaHtml = nota ? `<p style="margin:0;font-size:14px;line-height:1.5;color:#6B7A8C">${nota}</p>` : ''
  return `<!doctype html><html lang="${lingua}"><body style="margin:0;background:#eef3f7;font-family:'Segoe UI',system-ui,sans-serif;color:#2C4560">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f7;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td align="center" style="padding:0 0 18px"><img src="https://groomlyapp.it/groomly-logo-orizzontale.svg" alt="Groomly" width="200" style="display:block;border:0;width:200px;max-width:70%;height:auto"></td></tr>
<tr><td style="background:#ffffff;border:1px solid #dfe8ef;border-radius:16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="height:6px;background:#4A9FCB;background-image:linear-gradient(90deg,#8ADBD9,#4A9FCB);font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:32px 28px 0"><h1 style="margin:0 0 14px;font-size:26px;line-height:1.3;font-weight:800;color:#2C4560">${titolo}</h1>
<p style="margin:0;font-size:16px;line-height:1.5;color:#4b5a6b">${corpo}</p>${scheda}${riga}</td></tr>
${pulsanti}<tr><td style="padding:8px 28px 28px">${notaHtml}${silenzio}</td></tr>
</table></td></tr>
<tr><td align="center" style="padding:18px 12px 0;font-size:12px;line-height:1.5;color:#8a97a6">Groomly · groomlyapp.it</td></tr>
</table></td></tr></table>
</body></html>`
}

function oggettoAccount(lingua: Lingua, tipo: 'verifica' | 'reset' | 'invito', salone: string): string {
  if (tipo === 'verifica') return OGGETTO_VERIFICA[lingua]
  if (tipo === 'reset') return OGGETTO_RESET[lingua]
  const nome = salone.trim()
  if (!nome) return OGGETTO_INVITO_VUOTO[lingua]
  if (lingua === 'en') return `${nome} has invited you to Groomly`
  if (lingua === 'es') return `${nome} te invita a Groomly`
  return `${nome} ti invita su Groomly`
}

function corpoVerifica(lingua: Lingua): string {
  if (lingua === 'en') return 'Hi and welcome! Just one more step: tap the button to confirm your address, then go back to the app and get started.'
  if (lingua === 'es') return '¡Hola y bienvenido! Solo falta un paso: toca el botón para confirmar tu dirección, luego vuelve a la app y empieza a trabajar.'
  return 'Ciao e benvenuto! Manca solo un passaggio: tocca il pulsante per confermare il tuo indirizzo, poi torna all’app e inizia a lavorare.'
}

function corpoReset(lingua: Lingua, account: string): string {
  if (lingua === 'en') {
    const chi = account ? `the account ${account}` : 'the account'
    return `Hi, we received a request to reset the password for ${chi}. Tap the button to choose a new one. If this wasn't you, you can safely ignore this email: your password will stay the same.`
  }
  if (lingua === 'es') {
    const chi = account ? `la cuenta ${account}` : 'la cuenta'
    return `Hola, hemos recibido una solicitud para restablecer la contraseña de ${chi}. Toca el botón para elegir una nueva. Si no has sido tú, puedes ignorar este correo: tu contraseña seguirá siendo la misma.`
  }
  const chi = account ? `dell’account ${account}` : 'dell’account'
  return `Ciao, abbiamo ricevuto una richiesta per reimpostare la password ${chi}. Tocca il pulsante per sceglierne una nuova. Se non sei stato tu, ignora pure questa email: la password resta quella di prima.`
}

function corpoInvito(lingua: Lingua, salone: string, ruolo: string): string {
  const nome = saloneNellaFrase(lingua, salone, 'soggetto')
  const come = ruolo ? (lingua === 'en' ? ` as ${ruolo}` : lingua === 'es' ? ` como ${ruolo}` : ` come ${ruolo}`) : ''
  if (lingua === 'en') {
    return `Hi! ${nome} has invited you to join the team${come}. Tap the button and sign in with this same email address. Enjoy working together!`
  }
  if (lingua === 'es') {
    return `¡Hola! ${nome} te ha invitado a unirte al equipo${come}. Toca el botón y entra con esta misma dirección de correo. ¡Buen trabajo!`
  }
  return `Ciao! ${nome} ti ha invitato a far parte del team${come}. Tocca il pulsante ed entra con questo stesso indirizzo email. Buon lavoro!`
}

function emailAccount(lingua: Lingua, tipo: 'verifica' | 'reset' | 'invito', dati: DatiEmail): { oggetto: string; html: string } {
  const ruolo = dati.ruolo ? etichettaRuolo(lingua, dati.ruolo) : ''
  const account = escapaHtml((dati.account ?? '').trim())
  const salone = dati.salone ?? ''
  const oggetto = oggettoAccount(lingua, tipo, salone)
  const corpo = tipo === 'verifica' ? corpoVerifica(lingua) : tipo === 'reset' ? corpoReset(lingua, account) : corpoInvito(lingua, salone, ruolo)
  const url = dati.url ?? 'https://groomlyapp.it/azione/'
  const stileSi = 'display:inline-block;background:#2E7FB0;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 26px;border-radius:10px'
  const pulsanti = `<tr><td align="center" style="padding:22px 28px 8px"><a href="${escapaHtml(url)}" style="${stileSi}">${BOTTONE_ACCOUNT[tipo][lingua]}</a></td></tr>\n`
  return {
    oggetto,
    html: avvolgi(lingua, escapaHtml(oggetto), corpo, '', '', pulsanti, '', ''),
  }
}

export function emailMessaggio(
  lingua: Lingua,
  tipo: TipoEmail,
  dati: DatiEmail = {},
): { oggetto: string; html: string } {
  if (tipo === 'verifica' || tipo === 'reset' || tipo === 'invito') return emailAccount(lingua, tipo, dati)
  const cliente = dati.cliente ?? ''
  const cane = dati.cane ?? ''
  const salone = dati.salone ?? ''
  const quando = dati.quando ?? ''
  const invece = dati.invece ?? ''
  const entro = dati.entro ?? ''
  const rispondi = dati.rispondi === true
  const oggetto = oggettoCliente(lingua, tipo, cane)
  const corpo = corpoCliente(lingua, tipo, { cliente, cane, salone, quando, invece, entro, rispondi })
  const scheda = (dati.scheda ?? '').trim()
    ? `<p style="margin:14px 0 0;font-size:15px;line-height:1.5;color:#2C4560">${escapaHtml(dati.scheda ?? '').trim().replaceAll('\n', '<br>')}</p>`
    : ''
  const pezziRiga = [salone.trim() ? escapaHtml(salone.trim()) : '', cane.trim() ? escapaHtml(cane.trim()) : ''].filter(Boolean)
  const riga = pezziRiga.length
    ? `<p style="margin:14px 0 0;font-size:15px;line-height:1.5;color:#2C4560">${pezziRiga.join(' · ')}</p>`
    : ''
  const stileSi = 'display:inline-block;background:#2E7FB0;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 26px;border-radius:10px'
  const stileNo = 'display:inline-block;background:#ffffff;color:#9E2F2A;text-decoration:none;font-weight:700;font-size:16px;padding:12px 26px;border:2px solid #9E2F2A;border-radius:10px;margin-left:12px'
  const ancora = (href: string, stile: string, etichetta: string) => `<a href="${escapaHtml(href)}" style="${stile}">${etichetta}</a>`
  let pulsanti = ''
  if (!SENZA_PULSANTE.has(tipo) && dati.url) {
    const etichetta = tipo === 'proposta' ? CONFERMO[lingua] : tipo === 'recensione' ? RECENSIONE_BOTTONE[lingua] : ATTESA_BOTTONE[lingua]
    const secondo = tipo === 'proposta' && dati.urlRifiuta ? ancora(dati.urlRifiuta, stileNo, NON_POSSO[lingua]) : ''
    pulsanti = `<tr><td align="center" style="padding:22px 28px 8px">${ancora(dati.url, stileSi, etichetta)}${secondo}</td></tr>\n`
  }
  const nota = tipo === 'liberato'
    ? NOTA_PAGINA[lingua]
    : NOTA_RISPOSTA_TIPI.has(tipo) && rispondi
      ? NOTA_RISPOSTA[lingua]
      : ''
  const hrefSilenzio = (dati.silenzio ?? '').trim()
  const silenzio = SERVIZI.has(tipo) && hrefSilenzio
    ? `<p style="margin:12px 0 0;font-size:13px;line-height:1.5"><a href="${escapaHtml(hrefSilenzio)}" style="color:#6B7A8C">${SILENZIO[lingua]}</a></p>`
    : ''
  return { oggetto, html: avvolgi(lingua, escapaHtml(oggetto), corpo, scheda, riga, pulsanti, nota, silenzio) }
}
