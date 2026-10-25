import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { esitoEmailPrenotazione, icsRoma, templatePrenotazione, transizionePrenotazione, type StatoRichiesta } from '../../../src/lib/prenotazione'
import { postBrevoTemplate } from '../brevoMail'

const STATI = new Set(['accettata', 'proposta', 'rifiutata', 'scaduta', 'disdetta'])

export async function gestisciPrenotazionePer(input: {
  salonId: string
  id: string
  token: string
  azione: string
}, apiKey?: string): Promise<{ stato: string; emailStato: 'inviata' | 'non_inviata'; ics?: string }> {
  if (input.salonId === '' || input.salonId === 'shared' || !STATI.has(input.azione)) {
    throw new HttpsError('invalid-argument', 'Richiesta non valida')
  }
  const ref = getFirestore().doc(`salons/${input.salonId}/richieste/${input.id}`)
  const data = (await ref.get()).data()
  if (!data) throw new HttpsError('not-found', 'Richiesta assente')
  const attuale = (typeof data.status === 'string' ? data.status : 'nuova') as StatoRichiesta
  const passo = transizionePrenotazione({
    attuale,
    prossimo: input.azione as StatoRichiesta,
    token: input.token,
    tokenAtteso: typeof data.token === 'string' ? data.token : '',
  })
  const emailStato = esitoEmailPrenotazione(apiKey)
  if (!passo.ok) return { stato: passo.stato, emailStato: 'non_inviata' }
  const inizio = new Date(typeof data.start === 'string' ? data.start : 0)
  const fine = new Date(typeof data.end === 'string' ? data.end : 0)
  const ics = passo.stato === 'accettata' && !Number.isNaN(inizio.getTime()) ? icsRoma({ inizio, fine, titolo: 'Appuntamento' }) : undefined
  await ref.set({ status: passo.stato, emailStato, ...(ics ? { ics } : {}) }, { merge: true })
  const email = typeof data.email === 'string' ? data.email : ''
  if (apiKey && email) {
    await postBrevoTemplate(apiKey, templatePrenotazione(passo.stato), email, { stato: passo.stato }).catch(() => undefined)
  }
  return { stato: passo.stato, emailStato, ...(ics ? { ics } : {}) }
}
