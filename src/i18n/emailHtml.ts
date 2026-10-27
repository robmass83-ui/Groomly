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
  ricevuta: { it: 'Richiesta ricevuta', en: 'Request received', es: 'Solicitud recibida' },
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
      titolo: 'Abbiamo ricevuto la richiesta',
      corpo: '{salone} ha ricevuto la richiesta{di}. Ti scriviamo appena il salone risponde.',
      bottone: 'Apri la richiesta',
      nota: 'Puoi rispondere a questa email: arriva al salone.',
    },
    en: {
      titolo: 'We received the request',
      corpo: '{salone} received the request{di}. We will write again when the salon replies.',
      bottone: 'Open the request',
      nota: 'You can reply to this email: it reaches the salon.',
    },
    es: {
      titolo: 'Hemos recibido la solicitud',
      corpo: '{salone} ha recibido la solicitud{di}. Te escribimos cuando el salón responda.',
      bottone: 'Abrir la solicitud',
      nota: 'Puedes responder a este correo: llega al salón.',
    },
  },
  conferma: {
    it: {
      titolo: 'Appuntamento confermato',
      corpo: '{salone} ha confermato l’appuntamento{di}.',
      bottone: 'Vedi l’appuntamento',
      nota: 'Puoi rispondere a questa email: arriva al salone.',
    },
    en: {
      titolo: 'Appointment confirmed',
      corpo: '{salone} confirmed the appointment{di}.',
      bottone: 'See the appointment',
      nota: 'You can reply to this email: it reaches the salon.',
    },
    es: {
      titolo: 'Cita confirmada',
      corpo: '{salone} ha confirmado la cita{di}.',
      bottone: 'Ver la cita',
      nota: 'Puedes responder a este correo: llega al salón.',
    },
  },
  proposta: {
    it: {
      titolo: 'Un altro orario',
      corpo: '{salone} propone un altro orario{di}. Tocca il pulsante per accettare o rifiutare.',
      bottone: 'Conferma',
      nota: 'Puoi rispondere a questa email: arriva al salone.',
    },
    en: {
      titolo: 'Another time',
      corpo: '{salone} suggests another time{di}. Tap the button to accept or decline.',
      bottone: 'Confirm',
      nota: 'You can reply to this email: it reaches the salon.',
    },
    es: {
      titolo: 'Otro horario',
      corpo: '{salone} propone otro horario{di}. Toca el botón para aceptar o rechazar.',
      bottone: 'Confirmar',
      nota: 'Puedes responder a este correo: llega al salón.',
    },
  },
  rifiuto: {
    it: {
      titolo: 'Richiesta non accettata',
      corpo: '{salone} non può accettare la richiesta{di}.',
      bottone: 'Apri il messaggio',
      nota: 'Puoi rispondere a questa email: arriva al salone.',
    },
    en: {
      titolo: 'Request declined',
      corpo: '{salone} cannot accept the request{di}.',
      bottone: 'Open the message',
      nota: 'You can reply to this email: it reaches the salon.',
    },
    es: {
      titolo: 'Solicitud no aceptada',
      corpo: '{salone} no puede aceptar la solicitud{di}.',
      bottone: 'Abrir el mensaje',
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
  } = {},
): { oggetto: string; html: string } {
  const nome = escapaHtml(dati.nome ?? '')
  const salone = escapaHtml(dati.salone ?? 'Groomly')
  const ruolo = dati.ruolo ? etichettaRuolo(lingua, dati.ruolo) : ''
  const url = dati.url ?? 'https://groomlyapp.it/azione/'
  const testo = TESTI[tipo][lingua]
  const di = nome ? (lingua === 'en' ? ` for ${nome}` : lingua === 'es' ? ` de ${nome}` : ` di ${nome}`) : ''
  const come = ruolo ? (lingua === 'en' ? ` as ${ruolo}` : lingua === 'es' ? ` como ${ruolo}` : ` come ${ruolo}`) : ''
  const quando = escapaHtml(dati.quando ?? '')
  const invece = escapaHtml(dati.invece ?? '')
  const entro = escapaHtml(dati.entro ?? '')
  let corpo = testo.corpo.replaceAll('{salone}', salone).replaceAll('{di}', di).replaceAll('{come}', come)
  if (tipo === 'proposta' && (quando || invece || entro)) {
    const apertura = lingua === 'en'
      ? `${salone} suggests another time${di}.`
      : lingua === 'es'
        ? `${salone} propone otro horario${di}.`
        : `${salone} propone un altro orario${di}.`
    const tempi = lingua === 'en'
      ? `The new time is ${quando}, instead of ${invece}. Reply by ${entro}.`
      : lingua === 'es'
        ? `El horario nuevo es ${quando}, en lugar de ${invece}. Responde antes de ${entro}.`
        : `L’orario nuovo è ${quando}, invece di ${invece}. Rispondi entro ${entro}.`
    corpo = `${apertura} ${tempi}`
  }
  if (tipo === 'conferma' && quando) {
    corpo = lingua === 'en'
      ? `${salone} confirmed the appointment${di}. The appointment is ${quando}.`
      : lingua === 'es'
        ? `${salone} ha confirmado la cita${di}. La cita es ${quando}.`
        : `${salone} ha confermato l’appuntamento${di}. L’appuntamento è ${quando}.`
  }
  const dettagli = [dati.salone ? salone : '', nome, ruolo].filter(Boolean)
  const riga = dettagli.length
    ? `<p style="margin:14px 0 0;font-size:15px;line-height:1.5;color:#2C4560">${dettagli.join(' · ')}</p>`
    : ''
  const oggetto = OGGETTI[tipo][lingua]
  const stileSi = 'display:inline-block;background:#2E7FB0;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 26px;border-radius:10px'
  const stileNo = 'display:inline-block;background:#ffffff;color:#9E2F2A;text-decoration:none;font-weight:700;font-size:16px;padding:12px 26px;border:2px solid #9E2F2A;border-radius:10px;margin-left:12px'
  const ancora = (href: string, stile: string, etichetta: string) => `<a href="${escapaHtml(href)}" style="${stile}">${etichetta}</a>`
  const pulsanti = tipo === 'conferma' || tipo === 'rifiuto' || tipo === 'liberato' || tipo === 'scadenza'
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
<p style="margin:0;font-size:16px;line-height:1.5;color:#4b5a6b">${corpo}</p>${riga}</td></tr>
${pulsanti}<tr><td style="padding:8px 28px 28px"><p style="margin:0;font-size:14px;line-height:1.5;color:#6B7A8C">${testo.nota}</p>${silenzio}</td></tr>
</table></td></tr>
<tr><td align="center" style="padding:18px 12px 0;font-size:12px;line-height:1.5;color:#8a97a6">Groomly · groomlyapp.it</td></tr>
</table></td></tr></table>
</body></html>`
  return { oggetto, html }
}
