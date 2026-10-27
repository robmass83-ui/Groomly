import { getFirestore } from 'firebase-admin/firestore'
import { emailMessaggio, type TipoEmail } from '../../src/i18n/emailHtml'
import { linguaValida, type Lingua } from '../../src/i18n/lingua'
import type { StatoRichiesta } from '../../src/lib/prenotazione'
import { postBrevoHtml } from './brevoMail'

const TIPO: Record<StatoRichiesta, TipoEmail> = {
  nuova: 'ricevuta',
  accettata: 'conferma',
  proposta: 'proposta',
  rifiutata: 'rifiuto',
  scaduta: 'scadenza',
  disdetta: 'disdetta',
}

export function tipoEmailPrenotazione(stato: StatoRichiesta): TipoEmail {
  return TIPO[stato]
}

export async function linguaClientiSalon(salonId: string): Promise<Lingua> {
  const data = (await getFirestore().doc(`salons/${salonId}/settings/main`).get()).data()
  return linguaValida(data?.linguaClienti) ?? 'it'
}

export async function spedisciHtml(
  apiKey: string,
  tipo: TipoEmail,
  lingua: Lingua,
  toEmail: string,
  dati: { nome?: string; salone?: string; url?: string; urlRifiuta?: string },
  replyTo?: { email: string; name: string },
): Promise<void> {
  const mail = emailMessaggio(lingua, tipo, dati)
  await postBrevoHtml(apiKey, toEmail, mail.oggetto, mail.html, fetch, replyTo)
}
