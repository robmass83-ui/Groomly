import { oraRoma } from './disponibilita'
import { escapaHtml, luogoSalone } from '../i18n/emailHtml'
import { LOCALE_INTL, linguaValida, type Lingua } from '../i18n/lingua'

const CONNETTORE_CONFERMA = { it: 'alle', en: 'at', es: 'a las', fr: 'à', de: 'um' } as const

export function quandoConferma(lingua: Lingua, inizio: Date): string {
  if (Number.isNaN(inizio.getTime())) return ''
  const codice = linguaValida(lingua) ?? 'it'
  const giorno = new Intl.DateTimeFormat(LOCALE_INTL[codice], {
    timeZone: 'Europe/Rome',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(inizio)
  return `${giorno} ${CONNETTORE_CONFERMA[codice]} ${oraRoma(inizio)}`
}

const COPIA = {
  conferma: {
    it: {
      titolo: 'Appuntamento confermato',
      frase: 'L’appuntamento è stato confermato. Si prega di arrivare puntuali e, in caso di problemi, contattare la toelettatura. Puoi chiudere questa pagina.',
    },
    en: {
      titolo: 'Appointment confirmed',
      frase: 'The appointment is confirmed. Please arrive on time and, if there is a problem, contact the grooming salon. You can close this page.',
    },
    es: {
      titolo: 'Cita confirmada',
      frase: 'La cita está confirmada. Se ruega llegar puntuales y, si hay un problema, contactar con la peluquería. Puedes cerrar esta página.',
    },
    fr: {
      titolo: 'Rendez-vous confirmé',
      frase: 'Le rendez-vous est confirmé. Merci d’arriver à l’heure et, en cas de problème, de contacter le salon de toilettage. Vous pouvez fermer cette page.',
    },
    de: {
      titolo: 'Termin bestätigt',
      frase: 'Der Termin ist bestätigt. Bitte kommen Sie pünktlich und wenden Sie sich bei Problemen an den Hundesalon. Sie können diese Seite schließen.',
    },
  },
  liberato: {
    it: {
      titolo: 'Posto liberato',
      frase: 'Il posto è libero. Se vuoi un altro orario, scrivi di nuovo al salone.',
    },
    en: {
      titolo: 'Slot released',
      frase: 'The slot is free. If you want another time, write to the salon again.',
    },
    es: {
      titolo: 'Hueco liberado',
      frase: 'El hueco está libre. Si quieres otro horario, escribe de nuevo al salón.',
    },
    fr: {
      titolo: 'Créneau libéré',
      frase: 'Le créneau est libre. Si vous souhaitez un autre horaire, écrivez de nouveau au salon.',
    },
    de: {
      titolo: 'Termin freigegeben',
      frase: 'Der Termin ist frei. Wenn Sie eine andere Uhrzeit möchten, schreiben Sie dem Salon erneut.',
    },
  },
  non_valido: {
    it: { titolo: 'Link non valido', frase: 'Questo link non è valido.' },
    en: { titolo: 'Invalid link', frase: 'This link is not valid.' },
    es: { titolo: 'Enlace no válido', frase: 'Este enlace no es válido.' },
    fr: { titolo: 'Lien non valide', frase: 'Ce lien n’est pas valide.' },
    de: { titolo: 'Ungültiger Link', frase: 'Dieser Link ist nicht gültig.' },
  },
} as const

const DOMANDA = {
  conferma: {
    it: { titolo: 'Confermi l’appuntamento?', frase: 'Tocca il pulsante per confermare. Aprire il link non basta.', bottone: 'Conferma' },
    en: { titolo: 'Confirm the appointment?', frase: 'Tap the button to confirm. Opening the link is not enough.', bottone: 'Confirm' },
    es: { titolo: '¿Confirmas la cita?', frase: 'Pulsa el botón para confirmar. Abrir el enlace no basta.', bottone: 'Confirmar' },
    fr: { titolo: 'Confirmez-vous le rendez-vous\u00a0?', frase: 'Touchez le bouton pour confirmer. Ouvrir le lien ne suffit pas.', bottone: 'Confirmer' },
    de: { titolo: 'Termin bestätigen?', frase: 'Tippen Sie auf die Schaltfläche, um zu bestätigen. Den Link zu öffnen reicht nicht.', bottone: 'Bestätigen' },
  },
  rifiuta: {
    it: { titolo: 'Rifiuti questo orario?', frase: 'Tocca il pulsante per liberare il posto. Aprire il link non basta.', bottone: 'Rifiuta' },
    en: { titolo: 'Decline this time?', frase: 'Tap the button to release the slot. Opening the link is not enough.', bottone: 'Decline' },
    es: { titolo: '¿Rechazas este horario?', frase: 'Pulsa el botón para liberar el hueco. Abrir el enlace no basta.', bottone: 'Rechazar' },
    fr: { titolo: 'Refusez-vous cet horaire\u00a0?', frase: 'Touchez le bouton pour libérer le créneau. Ouvrir le lien ne suffit pas.', bottone: 'Refuser' },
    de: { titolo: 'Diese Uhrzeit ablehnen?', frase: 'Tippen Sie auf die Schaltfläche, um den Termin freizugeben. Den Link zu öffnen reicht nicht.', bottone: 'Ablehnen' },
  },
} as const

const SPUNTA =
  '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" aria-hidden="true" style="display:block;margin:0 0 16px"><circle cx="24" cy="24" r="22" fill="none" stroke="#4A9FCB" stroke-width="2.5"/><path fill="none" stroke="#2C4560" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M14 25l6 6 14-14"/></svg>'

type LinguaEsito = Lingua
type TipoEsito = 'conferma' | 'liberato' | 'non_valido'
type EsitoPagina = 'confermato' | 'liberato' | 'nonValido'

function linguaEsito(lingua: LinguaEsito): LinguaEsito {
  return linguaValida(lingua) ?? 'it'
}

function tipoEsito(tipo: TipoEsito): TipoEsito {
  return tipo === 'liberato' || tipo === 'non_valido' ? tipo : 'conferma'
}

function rigaEsito(lingua: LinguaEsito, tipo: TipoEsito, salone: string, cane: string, quando: string): string {
  const testo = tipo === 'conferma' ? rigaConferma(lingua, salone, cane, quando) : [salone, cane, quando].filter(Boolean).join(' · ')
  return testo
    ? `<p style="margin:0 0 14px;font-size:16px;line-height:1.5;color:#2C4560">${testo}</p>`
    : ''
}

const RIGA_CONFERMA: Record<Lingua, (chi: string, quando: string) => string> = {
  it: (chi, quando) => `${chi} ci vediamo ${quando}`,
  en: (chi, quando) => `${chi}, see you ${quando}`,
  es: (chi, quando) => `${chi}, nos vemos ${quando}`,
  fr: (chi, quando) => `${chi}, à ${quando}`,
  de: (chi, quando) => `${chi}, bis ${quando}`,
}

function rigaConferma(lingua: LinguaEsito, salone: string, cane: string, quando: string): string {
  const chi = [salone, cane].filter(Boolean).join(' - ')
  if (!quando) return chi
  if (!chi) return quando
  return RIGA_CONFERMA[lingua](chi, quando)
}

function campo(valore: string): string {
  if (typeof valore !== 'string') return ''
  const testo = valore.trim()
  if (!testo) return ''
  return testo
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function htmlEsito(input: {
  lingua: LinguaEsito
  tipo: TipoEsito
  salone: string
  cane: string
  quando: string
}): string {
  const lingua = linguaEsito(input.lingua)
  const tipo = tipoEsito(input.tipo)
  const testo = COPIA[tipo][lingua]
  const riga = rigaEsito(lingua, tipo, campo(input.salone), campo(input.cane), campo(input.quando))
  const spunta = tipo === 'conferma' ? SPUNTA : ''
  return `<!doctype html><html lang="${lingua}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${testo.titolo}</title></head><body style="margin:0;background:#eef3f7;font-family:'Segoe UI',system-ui,sans-serif;color:#2C4560">
<main style="max-width:520px;margin:0 auto;padding:28px 12px"><p style="margin:0 0 18px;text-align:center"><img src="https://groomlyapp.it/groomly-logo-orizzontale.svg" alt="Groomly" width="200" style="display:inline-block;border:0;width:200px;max-width:70%;height:auto"></p><div style="background:#ffffff;border:1px solid #dfe8ef;border-radius:16px;overflow:hidden"><div style="height:6px;background:#4A9FCB;background-image:linear-gradient(90deg,#8ADBD9,#4A9FCB)"></div><div style="padding:32px 28px">${spunta}<h1 style="margin:0 0 14px;font-size:26px;line-height:1.3;font-weight:800;color:#2C4560">${testo.titolo}</h1>${riga}<p style="margin:0;font-size:16px;line-height:1.5;color:#2C4560">${testo.frase}</p></div></div>
<p style="margin:18px 0 0;text-align:center;font-size:12px;color:#8a97a6">Groomly · groomlyapp.it</p></main></body></html>`
}

export function htmlDomandaRisposta(input: {
  lingua: LinguaEsito
  azione: 'conferma' | 'rifiuta'
  azioneUrl: string
}): string {
  const lingua = linguaEsito(input.lingua)
  const azione = input.azione === 'rifiuta' ? 'rifiuta' : 'conferma'
  const testo = DOMANDA[azione][lingua]
  const url = campo(input.azioneUrl)
  return `<!doctype html><html lang="${lingua}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${testo.titolo}</title></head><body style="margin:0;background:#eef3f7;font-family:'Segoe UI',system-ui,sans-serif;color:#2C4560">
<main style="max-width:520px;margin:0 auto;padding:28px 12px"><p style="margin:0 0 18px;text-align:center"><img src="https://groomlyapp.it/groomly-logo-orizzontale.svg" alt="Groomly" width="200" style="display:inline-block;border:0;width:200px;max-width:70%;height:auto"></p><div style="background:#ffffff;border:1px solid #dfe8ef;border-radius:16px;overflow:hidden"><div style="height:6px;background:#4A9FCB;background-image:linear-gradient(90deg,#8ADBD9,#4A9FCB)"></div><div style="padding:32px 28px"><h1 style="margin:0 0 14px;font-size:26px;line-height:1.3;font-weight:800;color:#2C4560">${testo.titolo}</h1><p style="margin:0 0 18px;font-size:16px;line-height:1.5;color:#2C4560">${testo.frase}</p><form method="post" action="${url}"><button type="submit" style="appearance:none;border:0;border-radius:12px;background:#4A9FCB;color:#ffffff;font:inherit;font-weight:700;font-size:16px;padding:12px 18px;cursor:pointer">${testo.bottone}</button></form></div></div>
<p style="margin:18px 0 0;text-align:center;font-size:12px;color:#8a97a6">Groomly · groomlyapp.it</p></main></body></html>`
}

const TITOLO_PAGINA: Record<EsitoPagina, Record<Lingua, string>> = {
  confermato: { it: 'Appuntamento confermato', en: 'Appointment confirmed', es: 'Cita confirmada', fr: 'Rendez-vous confirmé', de: 'Termin bestätigt' },
  liberato: { it: 'Posto liberato', en: 'Slot released', es: 'Hueco liberado', fr: 'Créneau libéré', de: 'Termin freigegeben' },
  nonValido: { it: 'Link non più valido', en: 'This link is no longer valid', es: 'Este enlace ya no es válido', fr: 'Ce lien n’est plus valide', de: 'Dieser Link ist nicht mehr gültig' },
}

const RESTO_PAGINA: Record<Exclude<EsitoPagina, 'confermato'>, Record<Lingua, string>> = {
  liberato: {
    it: 'Va bene, il posto è stato liberato. Se vuoi un altro orario, puoi inviare una nuova richiesta al salone quando vuoi.',
    en: "No problem, the slot has been released. If you'd like a different time, you can send a new request to the salon whenever you like.",
    es: 'De acuerdo, el hueco ha quedado libre. Si quieres otro horario, puedes enviar una nueva solicitud a la peluquería cuando quieras.',
    fr: 'C’est noté, le créneau a été libéré. Si vous souhaitez un autre horaire, vous pouvez envoyer une nouvelle demande au salon quand vous voulez.',
    de: 'In Ordnung, der Termin wurde freigegeben. Wenn Sie eine andere Uhrzeit möchten, können Sie jederzeit eine neue Anfrage an den Salon senden.',
  },
  nonValido: {
    it: 'Potrebbe essere scaduto o già stato usato. Per qualsiasi cosa, contatta direttamente il salone.',
    en: 'It may have expired or already been used. For anything else, please contact the salon directly.',
    es: 'Puede que haya caducado o que ya se haya usado. Para cualquier cosa, contacta directamente con la peluquería.',
    fr: 'Il a peut-être expiré ou déjà été utilisé. Pour toute question, contactez directement le salon.',
    de: 'Er ist möglicherweise abgelaufen oder wurde bereits verwendet. Bei Fragen wenden Sie sich bitte direkt an den Salon.',
  },
}

const FRASE_CONFERMA: Record<Lingua, (animale: string, dove: string, ora: string) => string> = {
  it: (animale, dove, ora) => `${animale ? `L’appuntamento di ${animale}` : 'L’appuntamento'} ${dove} è confermato${ora ? ` per ${ora}` : ''}.`,
  en: (animale, dove, ora) => `${animale ? `${animale}'s appointment` : 'The appointment'} ${dove} is confirmed${ora ? ` for ${ora}` : ''}.`,
  es: (animale, dove, ora) => `${animale ? `La cita de ${animale}` : 'La cita'} ${dove} está confirmada${ora ? ` para ${ora}` : ''}.`,
  fr: (animale, dove, ora) => `${animale ? `Le rendez-vous de ${animale}` : 'Le rendez-vous'} ${dove} est confirmé${ora ? ` pour ${ora}` : ''}.`,
  de: (animale, dove, ora) => `${animale ? `Der Termin von ${animale}` : 'Der Termin'} ${dove} ist bestätigt${ora ? ` für ${ora}` : ''}.`,
}

const INTRO_CONFERMA: Record<Lingua, (frase: string) => string> = {
  it: (frase) => `Grazie! ${frase} Ti aspettiamo.`,
  en: (frase) => `Thank you! ${frase} We look forward to seeing you.`,
  es: (frase) => `¡Gracias! ${frase} Te esperamos.`,
  fr: (frase) => `Merci\u00a0! ${frase} Nous vous attendons.`,
  de: (frase) => `Vielen Dank! ${frase} Wir freuen uns auf Sie.`,
}

const SPUNTA_PAGINA =
  '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" aria-hidden="true" style="display:block;margin:0 0 16px"><circle cx="24" cy="24" r="22" fill="none" stroke="#4A9FCB" stroke-width="2.5"/><path fill="none" stroke="#2C4560" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M14 25l6 6 14-14"/></svg>'

function htmlPaginaRisposta(lingua: Lingua, titolo: string, paragrafo: string, spunta: boolean): string {
  const segno = spunta ? SPUNTA_PAGINA : ''
  return `<!doctype html><html lang="${lingua}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titolo}</title></head><body style="margin:0;background:#eef3f7;font-family:'Segoe UI',system-ui,sans-serif;color:#2C4560">
<main style="max-width:520px;margin:0 auto;padding:28px 12px"><p style="margin:0 0 18px;text-align:center"><img src="https://groomlyapp.it/groomly-logo-orizzontale.svg" alt="Groomly" width="200" style="display:inline-block;border:0;width:200px;max-width:70%;height:auto"></p><div style="background:#ffffff;border:1px solid #dfe8ef;border-radius:16px;overflow:hidden"><div style="height:6px;background:#4A9FCB;background-image:linear-gradient(90deg,#8ADBD9,#4A9FCB)"></div><div style="padding:32px 28px">${segno}<h1 style="margin:0 0 14px;font-size:26px;line-height:1.3;font-weight:800;color:#2C4560">${titolo}.</h1><p style="margin:0;font-size:16px;line-height:1.5;color:#2C4560">${paragrafo}</p></div></div>
<p style="margin:18px 0 0;text-align:center;font-size:12px;color:#8a97a6">Groomly · groomlyapp.it</p></main></body></html>`
}

/** La pagina che il cliente vede dopo aver risposto a una proposta dal link dell'email. */
export function paginaRisposta(
  lingua: Lingua,
  esito: EsitoPagina,
  dati: { salone?: string; cane?: string; quando?: string },
): string {
  const codice: Lingua = linguaValida(lingua) ?? 'it'
  const tipo = esito === 'liberato' || esito === 'nonValido' ? esito : 'confermato'
  const titolo = TITOLO_PAGINA[tipo][codice]
  const paragrafo = tipo === 'confermato'
    ? INTRO_CONFERMA[codice](FRASE_CONFERMA[codice](escapaHtml((dati.cane ?? '').trim()), luogoSalone(codice, dati.salone ?? ''), escapaHtml((dati.quando ?? '').trim())))
    : RESTO_PAGINA[tipo][codice]
  return htmlPaginaRisposta(codice, titolo, paragrafo, tipo === 'confermato')
}
