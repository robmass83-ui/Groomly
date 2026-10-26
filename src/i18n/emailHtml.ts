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
  const html = `<!doctype html><html lang="${lingua}"><body style="margin:0;background:#eef3f7;font-family:'Segoe UI',system-ui,sans-serif;color:#2C4560">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f7;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #dfe8ef;border-radius:16px;overflow:hidden">
<tr><td style="height:6px;background:#8ADBD9;background:linear-gradient(90deg,#8ADBD9,#4A9FCB);font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:28px 24px 8px" align="center"><img src="https://groomlyapp.it/groomly-logo-orizzontale.svg" alt="Groomly" width="180" style="display:block;border:0"></td></tr>
<tr><td style="padding:8px 24px 0"><h1 style="margin:0;font-size:26px;line-height:1.3;color:#2C4560">${oggetto}</h1></td></tr>
<tr><td style="padding:12px 24px 0"><p style="margin:0;font-size:16px;line-height:1.5">${salone}${nome ? ` · ${nome}` : ''}${ruolo ? ` · ${ruolo}` : ''}</p></td></tr>
<tr><td style="padding:20px 24px 28px"><a href="${escapaHtml(url)}" style="display:inline-block;background:#2E7FB0;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:12px">${oggetto}</a></td></tr>
</table>
</td></tr></table>
</body></html>`
  return { oggetto, html }
}
