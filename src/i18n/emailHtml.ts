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

const OGGETTI: Record<TipoEmail, Record<Lingua, string>> = {
  verifica: { it: 'Conferma l’email', en: 'Confirm your email', es: 'Confirma el correo' },
  reset: { it: 'Reimposta la password', en: 'Reset your password', es: 'Restablece la contraseña' },
  invito: { it: 'Sei invitato su Groomly', en: 'You’re invited to Groomly', es: 'Te invitan a Groomly' },
  ricevuta: { it: 'Richiesta di prenotazione inoltrata', en: 'Booking request sent', es: 'Solicitud de reserva enviada' },
  conferma: { it: 'Appuntamento confermato', en: 'Appointment confirmed', es: 'Cita confirmada' },
  proposta: { it: 'Proposta di orario', en: 'Suggested time', es: 'Propuesta de horario' },
  rifiuto: { it: 'Richiesta non accettata', en: 'Request declined', es: 'Solicitud no aceptada' },
  liberato: { it: 'Posto liberato', en: 'Time released', es: 'Horario liberado' },
  scadenza: { it: 'Richiesta scaduta', en: 'Request expired', es: 'Solicitud caducada' },
  disdetta: { it: 'Appuntamento disdetto', en: 'Appointment cancelled', es: 'Cita cancelada' },
  promemoria: { it: 'Promemoria', en: 'Reminder', es: 'Recordatorio' },
  pronto: { it: 'È pronto', en: 'Ready for pickup', es: 'Ya está listo' },
  auguri: { it: 'Auguri', en: 'Birthday wishes', es: 'Felicidades' },
  recensione: { it: 'Una recensione', en: 'A review', es: 'Una reseña' },
  attesa: { it: 'Un posto libero', en: 'An open slot', es: 'Un hueco libre' },
}

export function etichettaRuolo(lingua: Lingua, ruolo: 'socio' | 'collaboratore'): string {
  if (lingua === 'en') return ruolo === 'socio' ? 'Partner' : 'Team member'
  if (lingua === 'es') return ruolo === 'socio' ? 'Socio' : 'Colaborador'
  return ruolo === 'socio' ? 'Socio' : 'Collaboratore'
}

export function escapaHtml(testo: string): string {
  return testo.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const TESTI: Record<TipoEmail, Record<Lingua, { titolo: string; corpo: string; bottone: string; nota: string }>> = {
  verifica: {
    it: {
      titolo: 'Conferma la tua email',
      corpo: 'Manca solo un passaggio per usare Groomly. Tocca il pulsante: confermi l’indirizzo e puoi tornare all’app.',
      bottone: 'Conferma l’email',
      nota: 'Se non hai creato tu l’account, ignora questa email. L’indirizzo non viene confermato.',
    },
    en: {
      titolo: 'Confirm your email',
      corpo: 'One step left before you can use Groomly. Tap the button to confirm this address, then go back to the app.',
      bottone: 'Confirm email',
      nota: 'If you did not create the account, ignore this email. The address stays unconfirmed.',
    },
    es: {
      titolo: 'Confirma tu correo',
      corpo: 'Solo falta un paso para usar Groomly. Toca el botón: confirmas la dirección y puedes volver a la app.',
      bottone: 'Confirmar el correo',
      nota: 'Si no has creado tú la cuenta, ignora este correo. La dirección no queda confirmada.',
    },
  },
  reset: {
    it: {
      titolo: 'Scegli una nuova password',
      corpo: 'Hai chiesto di reimpostare la password{di}. Tocca il pulsante e scegline una nuova.',
      bottone: 'Reimposta la password',
      nota: 'Se non hai chiesto tu il cambio, ignora questa email. La password resta quella di prima.',
    },
    en: {
      titolo: 'Choose a new password',
      corpo: 'You asked to reset the password{di}. Tap the button and choose a new one.',
      bottone: 'Reset password',
      nota: 'If this was not you, ignore this email. The password stays the same.',
    },
    es: {
      titolo: 'Elige una nueva contraseña',
      corpo: 'Has pedido restablecer la contraseña{di}. Toca el botón y elige una nueva.',
      bottone: 'Restablecer la contraseña',
      nota: 'Si no has sido tú, ignora este correo. La contraseña sigue igual.',
    },
  },
  invito: {
    it: {
      titolo: 'C’è un invito per te',
      corpo: '{salone} ti invita a lavorare insieme{come}. Tocca il pulsante ed entra con questa stessa email.',
      bottone: 'Accetta l’invito',
      nota: 'Se non conosci questo salone, ignora questa email.',
    },
    en: {
      titolo: 'You’re invited to Groomly',
      corpo: '{salone} invites you to work together{come}. Tap the button and sign in with this same email.',
      bottone: 'Accept the invite',
      nota: 'If you do not know this salon, ignore this email.',
    },
    es: {
      titolo: 'Te invitan a Groomly',
      corpo: '{salone} te invita a trabajar juntos{come}. Toca el botón y entra con este mismo correo.',
      bottone: 'Aceptar la invitación',
      nota: 'Si no conoces este salón, ignora este correo.',
    },
  },
  ricevuta: {
    it: {
      titolo: 'Richiesta inoltrata',
      corpo: 'La richiesta di prenotazione è stata inoltrata a {salone}. Non è ancora un appuntamento. Riceverai a breve l’approvazione, oppure ulteriori informazioni.',
      bottone: '',
      nota: 'Controlla anche la cartella spam. Questa mail non conferma l’appuntamento.',
    },
    en: {
      titolo: 'Request sent',
      corpo: 'The booking request was sent to {salone}. It is not an appointment yet. You will soon receive the approval, or further information.',
      bottone: '',
      nota: 'Also check the spam folder. This email does not confirm the appointment.',
    },
    es: {
      titolo: 'Solicitud enviada',
      corpo: 'La solicitud de reserva se ha enviado a {salone}. Todavía no es una cita. Pronto recibirás la aprobación u otra información.',
      bottone: '',
      nota: 'Revisa también el spam. Este correo no confirma la cita.',
    },
  },
  conferma: {
    it: {
      titolo: 'Appuntamento confermato',
      corpo: '{salone} - {di} ci vediamo. L’appuntamento è stato confermato. Si prega di arrivare puntuali e, in caso di problemi, contattare la toelettatura.',
      bottone: 'Vedi l’appuntamento',
      nota: 'Puoi rispondere a questa email: arriva al salone.',
    },
    en: {
      titolo: 'Appointment confirmed',
      corpo: '{salone} - {di}, see you. The appointment is confirmed. Please arrive on time and, if there is a problem, contact the grooming salon.',
      bottone: 'See the appointment',
      nota: 'You can reply to this email: it reaches the salon.',
    },
    es: {
      titolo: 'Cita confirmada',
      corpo: '{salone} - {di}, nos vemos. La cita está confirmada. Se ruega llegar puntuales y, si hay un problema, contactar con la peluquería.',
      bottone: 'Ver la cita',
      nota: 'Puedes responder a este correo: llega al salón.',
    },
  },
  proposta: {
    it: {
      titolo: 'Un altro orario',
      corpo: 'Ci scusiamo, ma nella data e nell’orario scelti non è possibile effettuare il trattamento.',
      bottone: 'Conferma',
      nota: 'Puoi rispondere a questa email: arriva al salone.',
    },
    en: {
      titolo: 'Another time',
      corpo: 'We are sorry, but the treatment cannot be done on the date and time you chose.',
      bottone: 'Confirm',
      nota: 'You can reply to this email: it reaches the salon.',
    },
    es: {
      titolo: 'Otro horario',
      corpo: 'Lo sentimos, pero en la fecha y la hora elegidas no es posible realizar el tratamiento.',
      bottone: 'Confirmar',
      nota: 'Puedes responder a este correo: llega al salón.',
    },
  },
  rifiuto: {
    it: {
      titolo: 'Richiesta non accettata',
      corpo: 'Ci scusiamo, ma nella data e nell’orario scelti non è possibile effettuare il trattamento. Si prega di selezionare un’altra data e un orario disponibile.',
      bottone: 'Scegli un altro orario',
      nota: 'Puoi rispondere a questa email: arriva al salone.',
    },
    en: {
      titolo: 'Request declined',
      corpo: 'We are sorry, but the treatment cannot be done on the date and time you chose. Please choose another date and an available time.',
      bottone: 'Choose another time',
      nota: 'You can reply to this email: it reaches the salon.',
    },
    es: {
      titolo: 'Solicitud no aceptada',
      corpo: 'Lo sentimos, pero en la fecha y la hora elegidas no es posible realizar el tratamiento. Seleccione otra fecha y un horario disponible.',
      bottone: 'Elegir otro horario',
      nota: 'Puedes responder a este correo: llega al salón.',
    },
  },
  liberato: {
    it: {
      titolo: 'Posto liberato',
      corpo: 'Il posto è stato liberato. Se vuoi un altro orario, scrivi di nuovo al salone.',
      bottone: 'Apri il messaggio',
      nota: 'Puoi inviarne una nuova dal salone.',
    },
    en: {
      titolo: 'Time released',
      corpo: 'The time was released. If you want another time, write to the salon again.',
      bottone: 'Open the message',
      nota: 'You can send a new one from the salon.',
    },
    es: {
      titolo: 'Horario liberado',
      corpo: 'El horario quedó libre. Si quieres otro horario, vuelve a escribir al salón.',
      bottone: 'Abrir el mensaje',
      nota: 'Puedes enviar otra desde el salón.',
    },
  },
  scadenza: {
    it: {
      titolo: 'Richiesta scaduta',
      corpo: 'La richiesta a {salone}{di} è scaduta, perché il salone non ha risposto in tempo.',
      bottone: 'Apri il messaggio',
      nota: 'Puoi inviarne una nuova dal salone.',
    },
    en: {
      titolo: 'Request expired',
      corpo: 'The request to {salone}{di} expired because the salon did not reply in time.',
      bottone: 'Open the message',
      nota: 'You can send a new one from the salon.',
    },
    es: {
      titolo: 'Solicitud caducada',
      corpo: 'La solicitud a {salone}{di} ha caducado porque el salón no respondió a tiempo.',
      bottone: 'Abrir el mensaje',
      nota: 'Puedes enviar otra desde el salón.',
    },
  },
  disdetta: {
    it: {
      titolo: 'Appuntamento disdetto',
      corpo: 'L’appuntamento con {salone}{di} è stato disdetto.',
      bottone: 'Apri il messaggio',
      nota: 'Puoi rispondere a questa email: arriva al salone.',
    },
    en: {
      titolo: 'Appointment cancelled',
      corpo: 'The appointment with {salone}{di} was cancelled.',
      bottone: 'Open the message',
      nota: 'You can reply to this email: it reaches the salon.',
    },
    es: {
      titolo: 'Cita cancelada',
      corpo: 'La cita con {salone}{di} se ha cancelado.',
      bottone: 'Abrir el mensaje',
      nota: 'Puedes responder a este correo: llega al salón.',
    },
  },
  promemoria: {
    it: {
      titolo: 'Promemoria',
      corpo: '{salone} ti ricorda l’appuntamento{di}.',
      bottone: 'Apri il promemoria',
      nota: 'Puoi rispondere a questa email: arriva al salone.',
    },
    en: {
      titolo: 'Reminder',
      corpo: '{salone} reminds you of the appointment{di}.',
      bottone: 'Open the reminder',
      nota: 'You can reply to this email: it reaches the salon.',
    },
    es: {
      titolo: 'Recordatorio',
      corpo: '{salone} te recuerda la cita{di}.',
      bottone: 'Abrir el recordatorio',
      nota: 'Puedes responder a este correo: llega al salón.',
    },
  },
  pronto: {
    it: {
      titolo: 'È pronto',
      corpo: '{salone} ha finito{di}. Puoi passare a prenderlo.',
      bottone: 'Apri il messaggio',
      nota: 'Puoi rispondere a questa email: arriva al salone.',
    },
    en: {
      titolo: 'Ready for pickup',
      corpo: '{salone} has finished{di}. You can come and pick up.',
      bottone: 'Open the message',
      nota: 'You can reply to this email: it reaches the salon.',
    },
    es: {
      titolo: 'Ya está listo',
      corpo: '{salone} ha terminado{di}. Puedes pasar a recogerlo.',
      bottone: 'Abrir el mensaje',
      nota: 'Puedes responder a este correo: llega al salón.',
    },
  },
  auguri: {
    it: {
      titolo: 'Auguri',
      corpo: '{salone} fa gli auguri{di}.',
      bottone: 'Apri gli auguri',
      nota: 'Puoi rispondere a questa email: arriva al salone.',
    },
    en: {
      titolo: 'Birthday wishes',
      corpo: '{salone} wishes a happy birthday{di}.',
      bottone: 'Open the wishes',
      nota: 'You can reply to this email: it reaches the salon.',
    },
    es: {
      titolo: 'Felicidades',
      corpo: '{salone} te felicita{di}.',
      bottone: 'Abrir la felicitación',
      nota: 'Puedes responder a este correo: llega al salón.',
    },
  },
  recensione: {
    it: {
      titolo: 'Se ti è piaciuto',
      corpo: 'Se ti è piaciuto il lavoro, una recensione su Google ci aiuta. Grazie.',
      bottone: 'Lascia una recensione',
      nota: 'Puoi rispondere a questa email: arriva al salone.',
    },
    en: {
      titolo: 'If you liked it',
      corpo: 'If you liked the work, a Google review helps us. Thank you.',
      bottone: 'Leave a review',
      nota: 'You can reply to this email: it reaches the salon.',
    },
    es: {
      titolo: 'Si te ha gustado',
      corpo: 'Si te ha gustado el trabajo, una reseña en Google nos ayuda. Gracias.',
      bottone: 'Dejar una reseña',
      nota: 'Puedes responder a este correo: llega al salón.',
    },
  },
  attesa: {
    it: {
      titolo: 'C’è un posto',
      corpo: '{salone} ha un posto libero{di}. Tocca il pulsante per prenotare quell’orario.',
      bottone: 'Prenota il posto',
      nota: 'Puoi rispondere a questa email: arriva al salone.',
    },
    en: {
      titolo: 'An open slot',
      corpo: '{salone} has an open slot{di}. Tap the button to book that time.',
      bottone: 'Book the slot',
      nota: 'You can reply to this email: it reaches the salon.',
    },
    es: {
      titolo: 'Un hueco libre',
      corpo: '{salone} tiene un hueco libre{di}. Toca el botón para reservar esa hora.',
      bottone: 'Reservar el hueco',
      nota: 'Puedes responder a este correo: llega al salón.',
    },
  },
}

const SERVIZI: ReadonlySet<TipoEmail> = new Set(['promemoria', 'pronto', 'auguri', 'recensione', 'attesa'])

const SILENZIO: Record<Lingua, string> = {
  it: 'Non scrivermi più',
  en: 'Don’t email me again',
  es: 'No me escribas más',
}

const BOTTONE_RIFIUTA: Record<Lingua, string> = { it: 'Rifiuta', en: 'Decline', es: 'Rechazar' }

function frase(pezzi: string[]): string {
  return pezzi.filter((pezzo) => pezzo !== '').join(' ')
}

function scuseOrario(lingua: Lingua, invece: string): string {
  if (lingua === 'en') {
    return invece
      ? `We are sorry, but the treatment cannot be done on the date and time you chose, ${invece}.`
      : 'We are sorry, but the treatment cannot be done on the date and time you chose.'
  }
  if (lingua === 'es') {
    return invece
      ? `Lo sentimos, pero en la fecha y la hora elegidas, ${invece}, no es posible realizar el tratamiento.`
      : 'Lo sentimos, pero en la fecha y la hora elegidas no es posible realizar el tratamiento.'
  }
  return invece
    ? `Ci scusiamo, ma nella data e nell’orario scelti, ${invece}, non è possibile effettuare il trattamento.`
    : 'Ci scusiamo, ma nella data e nell’orario scelti non è possibile effettuare il trattamento.'
}

function corpoConferma(lingua: Lingua, salone: string, nome: string, quando: string): string {
  const chi = [salone, nome].filter(Boolean).join(' - ')
  const incontro = !quando || !chi
    ? chi || quando
    : lingua === 'en'
      ? `${chi}, see you ${quando}`
      : lingua === 'es'
        ? `${chi}, nos vemos ${quando}`
        : `${chi} ci vediamo ${quando}`
  const chiusura = lingua === 'en'
    ? 'The appointment is confirmed. Please arrive on time and, if there is a problem, contact the grooming salon.'
    : lingua === 'es'
      ? 'La cita está confirmada. Se ruega llegar puntuales y, si hay un problema, contactar con la peluquería.'
      : 'L’appuntamento è stato confermato. Si prega di arrivare puntuali e, in caso di problemi, contattare la toelettatura.'
  return incontro ? `${incontro}. ${chiusura}` : chiusura
}

function corpoProposta(lingua: Lingua, invece: string, quando: string, entro: string): string {
  const alternativa = quando
    ? (lingua === 'en' ? `We suggest ${quando} instead.` : lingua === 'es' ? `Le proponemos como alternativa ${quando}.` : `Le proponiamo in alternativa ${quando}.`)
    : ''
  const scadenza = entro
    ? (lingua === 'en'
      ? `Please reply by ${entro}, otherwise you will lose priority for the proposed date and time.`
      : lingua === 'es'
        ? `Se ruega responder antes de ${entro}; de lo contrario se perderá la prioridad de la fecha y la hora propuestas.`
        : `Si prega di rispondere entro ${entro}, altrimenti si perderà la priorità per la data e l’orario proposti.`)
    : ''
  return frase([scuseOrario(lingua, invece), alternativa, scadenza])
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

function corpoRifiuto(lingua: Lingua, invece: string): string {
  const chiusura = lingua === 'en'
    ? 'Please choose another date and an available time.'
    : lingua === 'es'
      ? 'Seleccione otra fecha y un horario disponible.'
      : 'Si prega di selezionare un’altra data e un orario disponibile.'
  return frase([scuseOrario(lingua, invece), chiusura])
}

export function emailMessaggio(
  lingua: Lingua,
  tipo: TipoEmail,
  dati: {
    nome?: string
    salone?: string
    ruolo?: 'socio' | 'collaboratore'
    url?: string
    urlRifiuta?: string
    quando?: string
    invece?: string
    entro?: string
    silenzio?: string
    scheda?: string
  } = {},
): { oggetto: string; html: string } {
  const nome = escapaHtml(dati.nome ?? '')
  const salone = escapaHtml(dati.salone ?? 'Groomly')
  const ruolo = dati.ruolo ? etichettaRuolo(lingua, dati.ruolo) : ''
  const url = dati.url ?? 'https://groomlyapp.it/azione/'
  const testo = TESTI[tipo][lingua]
  const di = nome ? (lingua === 'en' ? ` for ${nome}` : lingua === 'es' ? ` de ${nome}` : ` di ${nome}`) : ''
  const come = ruolo ? (lingua === 'en' ? ` as ${ruolo}` : lingua === 'es' ? ` como ${ruolo}` : ` come ${ruolo}`) : ''
  const quando = escapaHtml((dati.quando ?? '').trim())
  const invece = escapaHtml((dati.invece ?? '').trim())
  const entro = escapaHtml((dati.entro ?? '').trim())
  let corpo = testo.corpo.replaceAll('{salone}', salone).replaceAll('{di}', di).replaceAll('{come}', come)
  if (tipo === 'proposta') corpo = corpoProposta(lingua, invece, quando, entro)
  if (tipo === 'rifiuto') corpo = corpoRifiuto(lingua, invece)
  if (tipo === 'conferma') corpo = corpoConferma(lingua, salone, nome, quando)
  const scheda = (dati.scheda ?? '').trim()
    ? `<p style="margin:14px 0 0;font-size:15px;line-height:1.5;color:#2C4560">${escapaHtml(dati.scheda ?? '').trim().replaceAll('\n', '<br>')}</p>`
    : ''
  const dettagli = tipo === 'conferma' ? [] : [dati.salone ? salone : '', nome, ruolo].filter(Boolean)
  const riga = dettagli.length
    ? `<p style="margin:14px 0 0;font-size:15px;line-height:1.5;color:#2C4560">${dettagli.join(' · ')}</p>`
    : ''
  const oggetto = OGGETTI[tipo][lingua]
  const stileSi = 'display:inline-block;background:#2E7FB0;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 26px;border-radius:10px'
  const stileNo = 'display:inline-block;background:#ffffff;color:#9E2F2A;text-decoration:none;font-weight:700;font-size:16px;padding:12px 26px;border:2px solid #9E2F2A;border-radius:10px;margin-left:12px'
  const ancora = (href: string, stile: string, etichetta: string) => `<a href="${escapaHtml(href)}" style="${stile}">${etichetta}</a>`
  const paginaPubblica = tipo === 'rifiuto' && (dati.url?.includes('/s/') ?? false)
  const pulsanti = tipo === 'ricevuta' || tipo === 'conferma' || tipo === 'liberato' || tipo === 'scadenza' || (tipo === 'rifiuto' && !paginaPubblica)
    ? ''
    : `<tr><td align="center" style="padding:22px 28px 8px">${ancora(url, stileSi, testo.bottone)}${tipo === 'proposta' && dati.urlRifiuta ? ancora(dati.urlRifiuta, stileNo, BOTTONE_RIFIUTA[lingua]) : ''}</td></tr>\n`
  const silenzio = SERVIZI.has(tipo) && dati.silenzio
    ? `<p style="margin:12px 0 0;font-size:13px;line-height:1.5"><a href="${escapaHtml(dati.silenzio)}" style="color:#6B7A8C">${SILENZIO[lingua]}</a></p>`
    : ''
  const html = `<!doctype html><html lang="${lingua}"><body style="margin:0;background:#eef3f7;font-family:'Segoe UI',system-ui,sans-serif;color:#2C4560">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f7;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td align="center" style="padding:0 0 18px"><img src="https://groomlyapp.it/groomly-logo-orizzontale.svg" alt="Groomly" width="200" style="display:block;border:0;width:200px;max-width:70%;height:auto"></td></tr>
<tr><td style="background:#ffffff;border:1px solid #dfe8ef;border-radius:16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="height:6px;background:#4A9FCB;background-image:linear-gradient(90deg,#8ADBD9,#4A9FCB);font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:32px 28px 0"><h1 style="margin:0 0 14px;font-size:26px;line-height:1.3;font-weight:800;color:#2C4560">${testo.titolo}</h1>
<p style="margin:0;font-size:16px;line-height:1.5;color:#4b5a6b">${corpo}</p>${scheda}${riga}</td></tr>
${pulsanti}<tr><td style="padding:8px 28px 28px"><p style="margin:0;font-size:14px;line-height:1.5;color:#6B7A8C">${testo.nota}</p>${silenzio}</td></tr>
</table></td></tr>
<tr><td align="center" style="padding:18px 12px 0;font-size:12px;line-height:1.5;color:#8a97a6">Groomly · groomlyapp.it</td></tr>
</table></td></tr></table>
</body></html>`
  return { oggetto, html }
}
