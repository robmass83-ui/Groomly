import { getFirestore } from 'firebase-admin/firestore'
import { emailMessaggio, type DatiEmail, type TipoEmail } from '../../src/i18n/emailHtml'
import { linguaValida, type Lingua } from '../../src/i18n/lingua'
import { emailValida } from '../../src/lib/codaEmail'
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

export function replyToDa(email: unknown, nome: string): { email: string; name: string } | undefined {
  if (typeof email !== 'string' || !emailValida(email)) return undefined
  return { email: email.trim(), name: nome.trim() || 'Groomly' }
}

export async function replyToDelSalone(salonId: string, nome: string): Promise<{ email: string; name: string } | undefined> {
  if (salonId === '' || salonId === 'shared' || salonId.includes('/')) return undefined
  try {
    const snap = await getFirestore().doc(`accounts/${salonId}`).get()
    return replyToDa(snap.get('email'), nome)
  } catch {
    return undefined
  }
}

export async function spedisciHtml(
  apiKey: string,
  tipo: TipoEmail,
  lingua: Lingua,
  toEmail: string,
  dati: DatiEmail,
  replyTo?: { email: string; name: string },
): Promise<void> {
  const mail = emailMessaggio(lingua, tipo, dati)
  await postBrevoHtml(apiKey, toEmail, mail.oggetto, mail.html, fetch, replyTo)
}
