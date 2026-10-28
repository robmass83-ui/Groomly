import { oraRoma } from './disponibilita'

const LOCALE_CONFERMA = { it: 'it-IT', en: 'en-GB', es: 'es-ES' } as const
const CONNETTORE_CONFERMA = { it: 'alle', en: 'at', es: 'a las' } as const

export function quandoConferma(lingua: 'it' | 'en' | 'es', inizio: Date): string {
  if (Number.isNaN(inizio.getTime())) return ''
  const codice = lingua === 'en' || lingua === 'es' ? lingua : 'it'
  const giorno = new Intl.DateTimeFormat(LOCALE_CONFERMA[codice], {
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
  },
  non_valido: {
    it: { titolo: 'Link non valido', frase: 'Questo link non è valido.' },
    en: { titolo: 'Invalid link', frase: 'This link is not valid.' },
    es: { titolo: 'Enlace no válido', frase: 'Este enlace no es válido.' },
  },
} as const

const DOMANDA = {
  conferma: {
    it: { titolo: 'Confermi l’appuntamento?', frase: 'Tocca il pulsante per confermare. Aprire il link non basta.', bottone: 'Conferma' },
    en: { titolo: 'Confirm the appointment?', frase: 'Tap the button to confirm. Opening the link is not enough.', bottone: 'Confirm' },
    es: { titolo: '¿Confirmas la cita?', frase: 'Pulsa el botón para confirmar. Abrir el enlace no basta.', bottone: 'Confirmar' },
  },
  rifiuta: {
    it: { titolo: 'Rifiuti questo orario?', frase: 'Tocca il pulsante per liberare il posto. Aprire il link non basta.', bottone: 'Rifiuta' },
    en: { titolo: 'Decline this time?', frase: 'Tap the button to release the slot. Opening the link is not enough.', bottone: 'Decline' },
    es: { titolo: '¿Rechazas este horario?', frase: 'Pulsa el botón para liberar el hueco. Abrir el enlace no basta.', bottone: 'Rechazar' },
  },
} as const

const SPUNTA =
  '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" aria-hidden="true" style="display:block;margin:0 0 16px"><circle cx="24" cy="24" r="22" fill="none" stroke="#4A9FCB" stroke-width="2.5"/><path fill="none" stroke="#2C4560" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M14 25l6 6 14-14"/></svg>'

type LinguaEsito = 'it' | 'en' | 'es'
type TipoEsito = 'conferma' | 'liberato' | 'non_valido'

function linguaEsito(lingua: LinguaEsito): LinguaEsito {
  return lingua === 'en' || lingua === 'es' ? lingua : 'it'
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

function rigaConferma(lingua: LinguaEsito, salone: string, cane: string, quando: string): string {
  const chi = [salone, cane].filter(Boolean).join(' - ')
  if (!quando) return chi
  if (!chi) return quando
  if (lingua === 'en') return `${chi}, see you ${quando}`
  if (lingua === 'es') return `${chi}, nos vemos ${quando}`
  return `${chi} ci vediamo ${quando}`
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
