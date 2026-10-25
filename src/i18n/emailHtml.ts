import type { Lingua } from './lingua'

export type TipoEmail =
  | 'verifica'
  | 'reset'
  | 'invito'
  | 'ricevuta'
  | 'conferma'
  | 'proposta'
  | 'rifiuto'
  | 'scadenza'
  | 'disdetta'
  | 'promemoria'

const OGGETTI: Record<TipoEmail, Record<Lingua, string>> = {
  verifica: { it: 'Conferma l’email', en: 'Confirm your email', es: 'Confirma el correo' },
  reset: { it: 'Reimposta la password', en: 'Reset your password', es: 'Restablece la contraseña' },
  invito: { it: 'Sei invitato su Groomly', en: 'You’re invited to Groomly', es: 'Te invitan a Groomly' },
  ricevuta: { it: 'Richiesta ricevuta', en: 'Request received', es: 'Solicitud recibida' },
  conferma: { it: 'Appuntamento confermato', en: 'Appointment confirmed', es: 'Cita confirmada' },
  proposta: { it: 'Proposta di orario', en: 'Suggested time', es: 'Propuesta de horario' },
  rifiuto: { it: 'Richiesta non accettata', en: 'Request declined', es: 'Solicitud no aceptada' },
  scadenza: { it: 'Richiesta scaduta', en: 'Request expired', es: 'Solicitud caducada' },
  disdetta: { it: 'Appuntamento disdetto', en: 'Appointment cancelled', es: 'Cita cancelada' },
  promemoria: { it: 'Promemoria', en: 'Reminder', es: 'Recordatorio' },
}

export function etichettaRuolo(lingua: Lingua, ruolo: 'socio' | 'collaboratore'): string {
  if (lingua === 'en') return ruolo === 'socio' ? 'Partner' : 'Team member'
  if (lingua === 'es') return ruolo === 'socio' ? 'Socio' : 'Colaborador'
  return ruolo === 'socio' ? 'Socio' : 'Collaboratore'
}

export function escapaHtml(testo: string): string {
  return testo.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function emailMessaggio(
  lingua: Lingua,
  tipo: TipoEmail,
  dati: { nome?: string; salone?: string; ruolo?: 'socio' | 'collaboratore'; url?: string } = {},
): { oggetto: string; html: string } {
  const nome = escapaHtml(dati.nome ?? '')
  const salone = escapaHtml(dati.salone ?? 'Groomly')
  const ruolo = dati.ruolo ? etichettaRuolo(lingua, dati.ruolo) : ''
  const url = dati.url ?? 'https://groomlyapp.it/azione'
  const oggetto = OGGETTI[tipo][lingua]
  const html = `<!doctype html><html lang="${lingua}"><body style="background:#f4f7fb;font-family:sans-serif">
<img src="https://groomlyapp.it/groomly-logo-orizzontale.svg" alt="Groomly" width="180">
<h1 style="font-size:28px;color:#123">${oggetto}</h1>
<p>${salone}${nome ? ` · ${nome}` : ''}${ruolo ? ` · ${ruolo}` : ''}</p>
<a href="${escapaHtml(url)}" style="background:#123;color:#fff;padding:12px 20px;border-radius:8px">${oggetto}</a>
</body></html>`
  return { oggetto, html }
}
